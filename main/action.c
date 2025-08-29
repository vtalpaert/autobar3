// base and ESP-IDF
#include <stdio.h>
#include "esp_log.h"
#include "esp_system.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"

// local files
#include "storage.h"
#include "api.h"
#include "action.h"
#include "weight_scale.h"

static const char *TAG = "action";

void init_gpio(gpio_num_t gpio_num)
{
    // Configure the GPIO pin
    gpio_reset_pin(gpio_num);
    gpio_set_direction(gpio_num, GPIO_MODE_OUTPUT);
}

void blink(gpio_num_t gpio_num)
{
    // Blink loop
    while (1)
    {
        // Turn LED ON
        printf("LED ON\n");
        gpio_set_level(gpio_num, 1);
        vTaskDelay(pdMS_TO_TICKS(1000)); // Delay 1 second

        // Turn LED OFF
        printf("LED OFF\n");
        gpio_set_level(gpio_num, 0);
        vTaskDelay(pdMS_TO_TICKS(1000)); // Delay 1 second
    }
}

bool handle_action(device_action_t *action)
{
    if (!action)
    {
        ESP_LOGE(TAG, "Action parameter cannot be NULL");
        return false;
    }

    switch (action->type)
    {
    case ACTION_STANDBY:
        ESP_LOGI(TAG, "Handling standby action, waiting %d ms", action->data.standby.idle_ms);
        vTaskDelay(pdMS_TO_TICKS(action->data.standby.idle_ms));
        return true;

    case ACTION_ERROR:
        ESP_LOGE(TAG, "Received error action");
        return false;

    case ACTION_COMPLETED:
        ESP_LOGI(TAG, "Order completed: %s", action->data.completed.message);
        vTaskDelay(pdMS_TO_TICKS(1000));
        return true;

    case ACTION_PUMP:
        return handle_pump(action);

    default:
        ESP_LOGE(TAG, "Unknown action type: %d", action->type);
        return false;
    }
}

bool handle_pump(device_action_t *action)
{
    if (!action || action->type != ACTION_PUMP)
    {
        ESP_LOGE(TAG, "Invalid pump action");
        return false;
    }

    gpio_num_t pump_gpio = (gpio_num_t)action->data.pump.pump_gpio;
    float target_weight = action->data.pump.dose_weight;
    float initial_progress = action->data.pump.dose_weight_progress;
    float weight_to_deliver = target_weight - initial_progress;

    ESP_LOGI(TAG, "Starting pump action: GPIO=%d, target=%.2fg, initial_progress=%.2fg, to_deliver=%.2fg",
             pump_gpio, target_weight, initial_progress, weight_to_deliver);

    // Step 1: Initialize GPIO for pump
    init_gpio(pump_gpio);

    // Step 2: Measure initial weight (20 samples for accuracy)
    float initial_weight;
    int32_t initial_raw;
    if (!measure_weight(&initial_weight, &initial_raw, 20))
    {
        ESP_LOGE(TAG, "Failed to measure initial weight");
        return false;
    }
    ESP_LOGI(TAG, "Initial weight: %.2fg", initial_weight);

    // Step 3: Turn on pump
    gpio_set_level(pump_gpio, 1);
    ESP_LOGI(TAG, "Pump turned ON");

    bool success = true;
    bool should_continue = true;
    bool pump_is_on = true;

    // Weight monitoring for pump failure detection
    float last_weight = initial_weight;
    int64_t last_weight_change_time = esp_timer_get_time() / 1000; // Convert to milliseconds
    const int64_t PUMP_TIMEOUT_MS = 30000;                         // 30 seconds
    const float WEIGHT_CHANGE_THRESHOLD = 1.0f;                    // 1g minimum change to consider progress

    // Step 4: Main pouring loop
    while (should_continue && success)
    {
        // Measure current weight (10 samples during pumping)
        float current_weight;
        int32_t current_raw;
        if (!measure_weight(&current_weight, &current_raw, 10))
        {
            ESP_LOGE(TAG, "Failed to measure current weight during pumping");
            success = false;
            break;
        }

        // Calculate current progress from initial weight
        float weight_poured = current_weight - initial_weight;
        float current_progress = initial_progress + weight_poured;

        ESP_LOGI(TAG, "Current weight: %.2fg, poured: %.2fg, progress: %.2fg/%.2fg",
                 current_weight, weight_poured, current_progress, target_weight);

        // Check if weight has changed significantly (pump is actually pouring)
        int64_t current_time = esp_timer_get_time() / 1000; // Convert to milliseconds
        if (fabs(current_weight - last_weight) >= WEIGHT_CHANGE_THRESHOLD)
        {
            // Weight changed, update tracking variables
            last_weight = current_weight;
            last_weight_change_time = current_time;
        }
        else if (pump_is_on && (current_time - last_weight_change_time) > PUMP_TIMEOUT_MS)
        {
            // Pump has been running for 30+ seconds with no weight change
            ESP_LOGE(TAG, "Pump timeout: No weight change for %lld ms (threshold: %lld ms)",
                     current_time - last_weight_change_time, PUMP_TIMEOUT_MS);
            ESP_LOGE(TAG, "Pump may be malfunctioning or liquid reservoir is empty");
            // TODO: Use error reporting API to notify server of pump failure
            success = false;
            break;
        }

        // Check for weight decrease error (with 10g margin)
        if (current_weight < (initial_weight - 10.0f))
        {
            ESP_LOGE(TAG, "Weight decreased below initial weight (margin 10g): %.2fg < %.2fg",
                     current_weight, initial_weight - 10.0f);
            success = false;
            break;
        }

        // Check if we've delivered enough weight - turn off pump immediately
        if (current_progress >= target_weight && pump_is_on)
        {
            gpio_set_level(pump_gpio, 0);
            pump_is_on = false;
            ESP_LOGI(TAG, "Target weight reached: %.2fg >= %.2fg - Pump turned OFF", current_progress, target_weight);
        }

        // Report progress to server (this might hang, but pump is already off if needed)
        char server_message[256] = {0};
        bool api_success = report_progress(action->data.pump.order_id, action->data.pump.dose_id,
                                           current_progress, &should_continue, server_message, sizeof(server_message));

        if (!api_success)
        {
            ESP_LOGE(TAG, "Failed to report progress to server");
            // Don't fail completely - we might have already delivered the dose
            if (current_progress >= target_weight)
            {
                ESP_LOGI(TAG, "API failed but target weight reached - considering success");
                should_continue = false;
            }
            else
            {
                success = false;
                break;
            }
        }
        else if (strlen(server_message) > 0)
        {
            ESP_LOGI(TAG, "Server message: %s", server_message);
        }

        // If target weight reached, stop the loop regardless of server response
        if (current_progress >= target_weight)
        {
            ESP_LOGI(TAG, "Target weight reached - stopping loop");
            should_continue = false;
        }

        // Log server response for continue=false case
        if (!should_continue)
        {
            ESP_LOGI(TAG, "Server responded with continue=false - stopping pump");
        }

        // Small delay to avoid overwhelming the system
        if (should_continue)
        {
            vTaskDelay(pdMS_TO_TICKS(100)); // 100ms delay between measurements
        }
    }

    // Step 5: Ensure pump is turned off (safety check)
    if (pump_is_on)
    {
        gpio_set_level(pump_gpio, 0);
        ESP_LOGI(TAG, "Pump turned OFF (final safety check)");
    }

    if (success)
    {
        ESP_LOGI(TAG, "Pump action completed successfully");
    }
    else
    {
        ESP_LOGE(TAG, "Pump action failed");
    }

    return success;
}
