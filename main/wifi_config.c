#include "esp_log.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_http_client.h"

#include "storage.h"

static const char *TAG = "wifi";


bool try_wifi_connect(const char *ssid, const char *password) {
    wifi_config_t wifi_config = {0};
    memcpy(wifi_config.sta.ssid, ssid, strlen(ssid));
    memcpy(wifi_config.sta.password, password, strlen(password));
    
    if (strlen(password) == 0) {
        wifi_config.sta.threshold.authmode = WIFI_AUTH_OPEN;
    } else {
        wifi_config.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;
        wifi_config.sta.pmf_cfg.capable = true;
        wifi_config.sta.pmf_cfg.required = false;
    }

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_ERROR_CHECK(esp_wifi_connect());
    
    int retry = 0;
    while (retry * 100 < 30000) { // 30 second timeout
        esp_netif_ip_info_t ip_info;
        esp_netif_t *netif = esp_netif_get_handle_from_ifkey("WIFI_STA_DEF");
        
        if (esp_netif_get_ip_info(netif, &ip_info) == ESP_OK && 
            ip_info.ip.addr != 0) {
            char ip_str[16];
            sprintf(ip_str, IPSTR, IP2STR(&ip_info.ip));
            ESP_LOGI(TAG, "Got IP: %s", ip_str);
            return true;
        }
        
        vTaskDelay(pdMS_TO_TICKS(100));
        retry++;
    }
    
    ESP_LOGE(TAG, "Failed to get IP address");
    return false;
}

bool start_wifi(void)
{
    // Configuration variables
    char ssid[MAX_SSID_LEN] = {0};
    char password[MAX_PASS_LEN] = {0};
    bool need_config = true;

    // Initialize TCP/IP and WiFi components first
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    // Check if we have all required configuration
    if (get_stored_wifi_credentials(ssid, password))
    {

        ESP_LOGI(TAG, "Found stored configuration");
        ESP_LOGI(TAG, "SSID: %s", ssid);

        // Try to connect with stored credentials
        ESP_LOGI(TAG, "Trying stored WiFi credentials for SSID: %s", ssid);
        if (try_wifi_connect(ssid, password))
        {
            need_config = false;
            ESP_LOGI(TAG, "Successfully connected to WiFi");
        }
        else
        {
            ESP_LOGI(TAG, "Failed to connect with stored credentials");
        }
    }
    else
    {
        ESP_LOGI(TAG, "Missing configuration - need setup");
    }

    return need_config;
}
