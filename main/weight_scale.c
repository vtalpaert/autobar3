#include "esp_log.h"

// components
// https://esp-idf-lib.github.io/hx711/
#include <hx711.h>

// local files
#include "weight_scale.h"
#include "storage.h"
#include "api.h"

static const char *TAG = "weight_scale";

typedef struct
{
    hx711_t hx711;
    int offset;
    float scale;
} WeightScale;

WeightScale weight_scale;

bool _measure(float *measure, int32_t *raw_measure)
{
    esp_err_t timeout = hx711_wait(&weight_scale.hx711, 500);
    if (timeout != ESP_OK)
    {
        ESP_LOGE(TAG, "Timeout to wait for data");
        return false;
    }
    else
    {
        esp_err_t err = hx711_read_data(&weight_scale.hx711, raw_measure);
        if (err != ESP_OK)
        {
            ESP_LOGE(TAG, "Failed to read weight");
            return false;
        }
        else
        {
            ESP_LOGI(TAG, "Values offset=%i, scale=%lf", weight_scale.offset, weight_scale.scale);
            *measure = weight_scale.scale * (*raw_measure - weight_scale.offset);
            ESP_LOGI(TAG, "Weight measure raw=%ld, clean=%lf", *raw_measure, *measure);
            return true;
        }
    }
}

bool weight_interface_init()
{
    unsigned int dt_pin, sck_pin;
    if (get_stored_hx711_config(&dt_pin, &sck_pin, &weight_scale.offset, &weight_scale.scale))
    {
        weight_scale.hx711.dout = (gpio_num_t)dt_pin;
        weight_scale.hx711.pd_sck = (gpio_num_t)sck_pin;
        weight_scale.hx711.gain = HX711_GAIN_A_128;
        if (hx711_init(&weight_scale.hx711) != ESP_OK)
        {
            ESP_LOGE(TAG, "Failed to init HX711 hardware");
        }
        else
        {
            ESP_LOGI(TAG, "Weight scale is initialized");
            return true;
        }
    }
    else
    {
        ESP_LOGE(TAG, "The weight scale parameters are not found in the storage");
    }
    return false;
}

bool weight_interface_need_calibration()
{
    float measure = 0.;
    int32_t raw_measure = 0;
    bool measurement_failed = false;

    if (!_measure(&measure, &raw_measure))
    {
        ESP_LOGE(TAG, "Failed to measure weight");
        measurement_failed = true;
        measure = 0.0; // Use 0 as fallback value for API call
        raw_measure = 0; // Use 0 as fallback value for API call
    }

    bool server_need_calibration = false;
    unsigned int server_dt_pin = 0;
    unsigned int server_sck_pin = 0;
    int server_offset = 0;
    float server_scale = 1.0;

    // Call API to send the measure and get calibration parameters back
    if (!send_weight_measurement(measure, (int)raw_measure, &server_need_calibration, &server_dt_pin, &server_sck_pin, &server_offset, &server_scale))
    {
        ESP_LOGE(TAG, "Failed to send weight measurement to server");
        return true; // Assume calibration needed if API call fails
    }

    bool parameters_changed = false;

    // Compare server parameters with current parameters
    if (server_dt_pin != (unsigned int)weight_scale.hx711.dout ||
        server_sck_pin != (unsigned int)weight_scale.hx711.pd_sck ||
        server_offset != weight_scale.offset ||
        server_scale != weight_scale.scale)
    {
        ESP_LOGI(TAG, "HX711 parameters changed, updating storage");

        // Store new parameters
        store_hx711_config(server_dt_pin, server_sck_pin, server_offset, server_scale);

        // Update local parameters
        weight_scale.offset = server_offset;
        weight_scale.scale = server_scale;

        // If pin configuration changed, reinitialize hardware
        if (server_dt_pin != (unsigned int)weight_scale.hx711.dout || server_sck_pin != (unsigned int)weight_scale.hx711.pd_sck)
        {
            weight_scale.hx711.dout = (gpio_num_t)server_dt_pin;
            weight_scale.hx711.pd_sck = (gpio_num_t)server_sck_pin;
            weight_interface_init();
        }

        parameters_changed = true;
    }

    // If measurement failed, we need to keep calibrating
    if (measurement_failed)
    {
        return true;
    }

    // If parameters changed, return true to run the loop once more
    if (parameters_changed)
    {
        return true;
    }

    // Otherwise return the server's calibration status
    return server_need_calibration;
}
