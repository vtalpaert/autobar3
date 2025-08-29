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
            // TODO: Implement pump action handling
            ESP_LOGI(TAG, "Pump action received but not yet implemented");
            return true;

        default:
            ESP_LOGE(TAG, "Unknown action type: %d", action->type);
            return false;
    }
}
