#include "wifi_config.h"
#include "esp_wifi.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_netif.h"
#include <string.h>

static const char *TAG = "wifi_config";

void initialize_nvs(void) {
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
}

bool get_stored_wifi_credentials(char *ssid, char *password) {
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open("wifi_config", NVS_READONLY, &nvs_handle);
    if (err != ESP_OK) return false;

    size_t ssid_len = MAX_SSID_LEN;
    size_t pass_len = MAX_PASS_LEN;
    
    err = nvs_get_str(nvs_handle, "ssid", ssid, &ssid_len);
    if (err != ESP_OK || ssid_len <= 1) {
        nvs_close(nvs_handle);
        return false;
    }
    
    err = nvs_get_str(nvs_handle, "password", password, &pass_len);
    if (err != ESP_OK) {
        nvs_close(nvs_handle);
        return false;
    }

    nvs_close(nvs_handle);
    return strlen(ssid) > 0;
}

void store_wifi_credentials(const char *ssid, const char *password) {
    nvs_handle_t nvs_handle;
    ESP_ERROR_CHECK(nvs_open("wifi_config", NVS_READWRITE, &nvs_handle));
    
    ESP_ERROR_CHECK(nvs_set_str(nvs_handle, "ssid", ssid));
    ESP_ERROR_CHECK(nvs_set_str(nvs_handle, "password", password));
    
    ESP_ERROR_CHECK(nvs_commit(nvs_handle));
    nvs_close(nvs_handle);
}

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
