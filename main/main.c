#include <stdio.h>
#include "esp_log.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_http_client.h"
#include "lwip/ip4_addr.h"
#include "storage.h"
#include "wifi_config.h"
#include "ap_server.h"
#include "api.h"
#include "version.h"

static const char *TAG = "autobar3";

void app_main(void)
{
    // Configuration variables
    char server_url[MAX_URL_LEN] = {0};
    char api_token[MAX_TOKEN_LEN] = {0};
    bool need_config = true;

    // Initialize NVS
    initialize_nvs();

    // Check if we have all required configuration
    if (get_stored_server_url(server_url) &&
        get_stored_api_token(api_token)) {
        
        ESP_LOGI(TAG, "Found stored configuration");
        ESP_LOGI(TAG, "Server URL: %s", server_url);
        ESP_LOGI(TAG, "API Token length: %d", strlen(api_token));

        if (!start_wifi())
        {
            need_config = false;
            ESP_LOGI(TAG, "Successfully connected to WiFi");
        }
        else
        {
            ESP_LOGI(TAG, "Failed to connect with stored credentials");
            need_config = true;
        }
    }
    else
    {
        ESP_LOGI(TAG, "Missing configuration - need setup");
        need_config = true;
    }

    // Start configuration portal if needed
    if (need_config)
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
    if (verify_device())
    {
        ESP_LOGI(TAG, "Device verified successfully");
        ESP_LOGI(TAG, "Fetching manifest...");
        
        char *manifest_version = fetch_manifest();
        if (manifest_version)
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
            }
            
            free(manifest_version);
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
}
