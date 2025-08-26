// base and ESP-IDF
#include <stdio.h>
#include "esp_log.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_http_client.h"
#include "lwip/ip4_addr.h"

// components
#include <hx711.h>

// local files
#include "storage.h"
#include "wifi_config.h"
#include "ap_server.h"
#include "api.h"
#include "version.h"
#include "ota.h"

static const char *TAG = "autobar3";

void app_main(void)
{
    // Configuration variables
    char server_url[MAX_URL_LEN] = {0};
    char api_token[MAX_TOKEN_LEN] = {0};

    // Initialize NVS
    initialize_nvs();

    // Check if we have all required configuration
    bool has_config = (get_stored_server_url(server_url) && get_stored_api_token(api_token));
    bool wifi_connected = false;

    if (has_config)
    {
        ESP_LOGI(TAG, "Found stored configuration");
        ESP_LOGI(TAG, "Server URL: %s", server_url);
        ESP_LOGI(TAG, "API Token length: %d", strlen(api_token));

        wifi_connected = wifi_connect_success();
        if (wifi_connected)
        {
            ESP_LOGI(TAG, "WiFi connection successful");
        }
        else
        {
            ESP_LOGI(TAG, "WiFi connection failed");
        }
    }
    else
    {
        ESP_LOGI(TAG, "Missing configuration");
    }

    // Start configuration portal if we don't have config or WiFi failed
    if (!has_config || !wifi_connected)
    {
        ESP_LOGI(TAG, "Starting configuration portal...");
        start_config_portal();

        // Main loop - wait for configuration
        while (1)
        {
            vTaskDelay(pdMS_TO_TICKS(1000));
        }
    }

    // If we're here, we're connected to WiFi
    ESP_LOGI(TAG, "Verifying device...");
    bool server_needs_calibration = false;
    if (verify_device(false, &server_needs_calibration))
    {
        ESP_LOGI(TAG, "Device verified successfully");
        ESP_LOGI(TAG, "Fetching manifest...");

        char manifest_version[64] = {0};
        if (fetch_manifest(manifest_version, sizeof(manifest_version)))
        {
            ESP_LOGI(TAG, "Current firmware version: %s", FIRMWARE_VERSION);
            ESP_LOGI(TAG, "Available firmware version: %s", manifest_version);

            if (strcmp(FIRMWARE_VERSION, manifest_version) == 0)
            {
                ESP_LOGI(TAG, "Firmware is up to date");
            }
            else
            {
                ESP_LOGI(TAG, "Firmware update available");
                do_firmware_upgrade();
            }
        }
        else
        {
            ESP_LOGE(TAG, "Failed to fetch manifest version");
        }
    }
    else
    {
        ESP_LOGE(TAG, "Device verification failed - needs re-enrollment");
        start_config_portal();
        while (1)
        {
            vTaskDelay(pdMS_TO_TICKS(1000));
        }
    }

    // https://esp-idf-lib.github.io/hx711/
    hx711_t weight_scale;
    weight_scale.dout = GPIO_NUM_26;
    weight_scale.pd_sck = GPIO_NUM_25;
    weight_scale.gain = HX711_GAIN_A_128;
    hx711_init(&weight_scale);

    int32_t raw_measure = 0;
    while (1)
    {
        esp_err_t timeout = hx711_wait(&weight_scale, 1000);
        if (timeout != ESP_OK)
        {
            ESP_LOGE(TAG, "Timeout to wait for data");
        }
        else
        {
            esp_err_t err = hx711_read_data(&weight_scale, &raw_measure);
            if (err != ESP_OK)
            {
                ESP_LOGE(TAG, "Failed to read weight");
            }
            else
            {
                ESP_LOGI(TAG, "Weight measure (raw): %ld", raw_measure);
            }
        }

        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
