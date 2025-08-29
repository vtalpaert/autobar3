// base and ESP-IDF
#include <stdio.h>
#include "esp_log.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_http_client.h"
#include "lwip/ip4_addr.h"

// local files
#include "storage.h"
#include "wifi_config.h"
#include "ap_server.h"
#include "api.h"
#include "version.h"
#include "ota.h"
#include "weight_scale.h"
#include "action.h"

static const char *TAG = "autobar3";

void app_main(void)
{
    // Configuration variables
    char server_url[MAX_URL_LEN] = {0};
    char api_token[MAX_TOKEN_LEN] = {0};

    // Initialize NVS
    initialize_nvs();

    // Check if we have all required configuration
    bool has_api_config = (get_stored_server_url(server_url) && get_stored_api_token(api_token));
    bool wifi_connected = false;

    if (has_api_config)
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
        ESP_LOGI(TAG, "Missing server and token parameters");
    }

    // Start configuration portal if we don't have config or WiFi failed
    if (!has_api_config || !wifi_connected)
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

    // This boolean holds if weight scale init went well, we share this value
    // to the server in verify_device
    bool success_weight_scale_init = weight_interface_init();
    bool server_needs_calibration = false;

    // Main loop - start from device verification
    TickType_t last_verify_time = 0;
    const TickType_t verify_interval = pdMS_TO_TICKS(5 * 60 * 1000); // 5 minutes

    while (1)
    {
        ESP_LOGI(TAG, "Verifying device and reporting firmware version...");
        if (verify_device(!success_weight_scale_init, &server_needs_calibration))
        {
            ESP_LOGI(TAG, "Device verified successfully");
            last_verify_time = xTaskGetTickCount();

            // Verify if the firmware version matches with the server
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
                    // Here the device will reboot
                }
            }
            else
            {
                ESP_LOGE(TAG, "Failed to fetch manifest version");
            }

            // Handle calibration if required
            if (server_needs_calibration)
            {
                ESP_LOGI(TAG, "Entering calibration loop");
                while (weight_interface_need_calibration())
                {
                    vTaskDelay(pdMS_TO_TICKS(100));
                }
                ESP_LOGI(TAG, "Weight scale is calibrated");
            } else {
                weight_interface_init();
            }

            // Action handling loop
            while (1)
            {
                device_action_t action;
                
                if (ask_server_for_action(&action))
                {
                    // Check if we need to re-verify instead of handling standby
                    if (action.type == ACTION_STANDBY)
                    {
                        TickType_t current_time = xTaskGetTickCount();
                        if ((current_time - last_verify_time) >= verify_interval)
                        {
                            ESP_LOGI(TAG, "5 minutes elapsed, re-verifying device...");
                            break; // Break out of action loop to restart from verify_device
                        }
                    }
                    
                    // Handle the action normally
                    if (!handle_action(&action))
                    {
                        ESP_LOGE(TAG, "Failed to handle action");
                    }
                }
                else
                {
                    ESP_LOGE(TAG, "Failed to get action from server");
                    vTaskDelay(pdMS_TO_TICKS(5000)); // Wait 5 seconds before retrying
                }
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
    }
}
