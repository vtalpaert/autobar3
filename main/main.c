#include <string.h>
#include <stdio.h>
#include "esp_log.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_http_client.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "cJSON.h"

static const char *TAG = "autobar3";
#define MAX_SSID_LEN 32
#define MAX_PASS_LEN 64
#define MANIFEST_URL "https://localhost:5173/firmware/manifest.json"

static void initialize_nvs(void) {
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
}

static bool get_stored_wifi_credentials(char *ssid, char *password) {
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open("wifi_config", NVS_READONLY, &nvs_handle);
    if (err != ESP_OK) return false;

    size_t ssid_len = MAX_SSID_LEN;
    size_t pass_len = MAX_PASS_LEN;
    
    err = nvs_get_str(nvs_handle, "ssid", ssid, &ssid_len);
    if (err != ESP_OK || ssid_len <= 1) {  // Check if SSID is empty or not found
        nvs_close(nvs_handle);
        return false;
    }
    
    err = nvs_get_str(nvs_handle, "password", password, &pass_len);
    if (err != ESP_OK) {
        nvs_close(nvs_handle);
        return false;
    }

    nvs_close(nvs_handle);
    return strlen(ssid) > 0;  // Only return true if we have a non-empty SSID
}

static void store_wifi_credentials(const char *ssid, const char *password) {
    nvs_handle_t nvs_handle;
    ESP_ERROR_CHECK(nvs_open("wifi_config", NVS_READWRITE, &nvs_handle));
    
    ESP_ERROR_CHECK(nvs_set_str(nvs_handle, "ssid", ssid));
    ESP_ERROR_CHECK(nvs_set_str(nvs_handle, "password", password));
    
    ESP_ERROR_CHECK(nvs_commit(nvs_handle));
    nvs_close(nvs_handle);
}

static void get_user_wifi_credentials(char *ssid, char *password) {
    // Buffer for reading characters
    char c;
    int ssid_pos = 0;
    int pass_pos = 0;
    
    // Get SSID
    printf("Please enter WiFi SSID: ");
    while (1) {
        if (ssid_pos >= MAX_SSID_LEN - 1) break;
        c = getchar();
        if (c == '\n' || c == '\r') {
            if (ssid_pos > 0) break;
            continue;
        }
        if (c == 0xFF) {  // No character available
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }
        putchar(c);  // Echo character
        ssid[ssid_pos++] = c;
    }
    ssid[ssid_pos] = 0;  // Null terminate
    printf("\n");
    
    // Get password
    printf("Please enter WiFi password: ");
    while (1) {
        if (pass_pos >= MAX_PASS_LEN - 1) break;
        c = getchar();
        if (c == '\n' || c == '\r') {
            if (pass_pos > 0) break;
            continue;
        }
        if (c == 0xFF) {  // No character available
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }
        putchar('*');  // Echo asterisk for password
        password[pass_pos++] = c;
    }
    password[pass_pos] = 0;  // Null terminate
    printf("\n");
}

static esp_err_t http_event_handler(esp_http_client_event_t *evt) {
    switch(evt->event_id) {
        case HTTP_EVENT_ERROR:
            ESP_LOGI(TAG, "HTTP_EVENT_ERROR");
            break;
        case HTTP_EVENT_ON_DATA:
            if (evt->data_len) {
                printf("%.*s", evt->data_len, (char*)evt->data);
            }
            break;
        default:
            break;
    }
    return ESP_OK;
}

static void fetch_manifest(void) {
    esp_http_client_config_t config = {
        .url = MANIFEST_URL,
        .event_handler = http_event_handler,
        .skip_cert_common_name_check = true,
        .cert_pem = NULL,
    };
    
    esp_http_client_handle_t client = esp_http_client_init(&config);
    
    esp_err_t err = esp_http_client_perform(client);
    if (err == ESP_OK) {
        ESP_LOGI(TAG, "HTTP GET Status = %d", esp_http_client_get_status_code(client));
    } else {
        ESP_LOGE(TAG, "HTTP GET failed: %s", esp_err_to_name(err));
    }
    
    esp_http_client_cleanup(client);
}

void app_main(void) {
    char ssid[MAX_SSID_LEN] = {0};
    char password[MAX_PASS_LEN] = {0};
    
    // Initialize NVS
    initialize_nvs();
    
    // Try to get stored WiFi credentials
    if (!get_stored_wifi_credentials(ssid, password)) {
        ESP_LOGI(TAG, "No stored WiFi credentials found. Please enter them:");
        get_user_wifi_credentials(ssid, password);
        store_wifi_credentials(ssid, password);
    } else {
        ESP_LOGI(TAG, "Using stored WiFi credentials for SSID: %s", ssid);
    }

    // Initialize TCP/IP and WiFi
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    
    // Connect to WiFi
    esp_netif_create_default_wifi_sta();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    
    wifi_config_t wifi_config = {0};
    memcpy(wifi_config.sta.ssid, ssid, strlen(ssid));
    memcpy(wifi_config.sta.password, password, strlen(password));
    
    // Set authentication mode based on password length
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

    // Wait for connection
    ESP_LOGI(TAG, "Connecting to WiFi...");
    esp_wifi_connect();
    
    // Wait a bit for the connection
    vTaskDelay(pdMS_TO_TICKS(5000));
    
    // Fetch manifest
    ESP_LOGI(TAG, "Fetching manifest...");
    fetch_manifest();
}
