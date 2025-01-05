#include <stdio.h>
#include "esp_log.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_http_client.h"
#include "esp_netif.h"
#include "storage.h"
#include "ap_server.h"
#include "cJSON.h"

static const char *TAG = "autobar3";
#define FIRMWARE_VERSION "1.0.0"
#define MAX_RETRIES 4
#define RETRY_DELAY_MS 30000
#define DEFAULT_SERVER_URL "https://192.168.1.4:5173"
#define MANIFEST_PATH "/firmware/manifest.json"

extern const uint8_t server_cert_pem_start[] asm("_binary_server_cert_pem_start");
extern const uint8_t server_cert_pem_end[] asm("_binary_server_cert_pem_end");


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

static bool verify_device(void) {
    char server_url[MAX_URL_LEN] = {0};
    char api_token[MAX_TOKEN_LEN] = {0};
    char verify_url[MAX_URL_LEN + 64] = {0};
    
    if (!get_stored_server_url(server_url) || !get_stored_api_token(api_token)) {
        ESP_LOGE(TAG, "Missing server URL or API token");
        return false;
    }
    
    snprintf(verify_url, sizeof(verify_url), "%s/api/devices/verify", server_url);
    ESP_LOGI(TAG, "Attempting device verification at URL: %s", verify_url);
    
    // Prepare JSON payload
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "token", api_token);
    cJSON_AddStringToObject(root, "firmwareVersion", FIRMWARE_VERSION);
    char *post_data = cJSON_PrintUnformatted(root);
    
    esp_http_client_config_t config = {
        .url = verify_url,
        .method = HTTP_METHOD_POST,
        .cert_pem = (char *)server_cert_pem_start,
        .transport_type = HTTP_TRANSPORT_OVER_SSL,
    };
    
    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    
    bool verification_success = false;
    int retry_count = 0;
    
    while (retry_count < MAX_RETRIES && !verification_success) {
        if (retry_count > 0) {
            ESP_LOGI(TAG, "Retrying verification (attempt %d/%d)", retry_count + 1, MAX_RETRIES);
            vTaskDelay(pdMS_TO_TICKS(RETRY_DELAY_MS));
        }
        
        esp_http_client_set_post_field(client, post_data, strlen(post_data));
        esp_err_t err = esp_http_client_perform(client);
        
        if (err == ESP_OK) {
            int status_code = esp_http_client_get_status_code(client);
            ESP_LOGI(TAG, "HTTP Status Code: %d", status_code);
            
            if (status_code == 200) {
                // Get content length
                int content_length = esp_http_client_get_content_length(client);
                if (content_length < 0) {
                    content_length = 512; // Default size if length not provided
                }
                
                // Allocate buffer for response
                char *response_buffer = malloc(content_length + 1);
                if (!response_buffer) {
                    ESP_LOGE(TAG, "Failed to allocate memory for response");
                    continue;
                }
                memset(response_buffer, 0, content_length + 1);
                
                // Read response data
                int read_len = 0;
                int total_read = 0;
                while (total_read < content_length) {
                    read_len = esp_http_client_read(client, response_buffer + total_read, 
                                                  content_length - total_read);
                    if (read_len <= 0) {
                        break;
                    }
                    total_read += read_len;
                }
                
                if (total_read > 0) {
                    cJSON *response = cJSON_Parse(response_buffer);
                    if (response) {
                        cJSON *token_valid = cJSON_GetObjectItem(response, "tokenValid");
                        cJSON *message = cJSON_GetObjectItem(response, "message");
                        
                        if (message) {
                            ESP_LOGI(TAG, "Server response: %s", message->valuestring);
                        } else {
                            ESP_LOGE(TAG, "No message in server response");
                        }
                        
                        if (token_valid && cJSON_IsTrue(token_valid)) {
                            verification_success = true;
                            ESP_LOGI(TAG, "Token verification successful");
                        } else {
                            ESP_LOGE(TAG, "Token verification failed - server rejected token");
                        }
                        
                        cJSON_Delete(response);
                    } else {
                        ESP_LOGE(TAG, "Failed to parse JSON response");
                    }
                } else {
                    ESP_LOGE(TAG, "Failed to read server response (read %d bytes)", total_read);
                }
                
                // Clean up response buffer
                free(response_buffer);
            } else {
                ESP_LOGE(TAG, "Unexpected HTTP status code: %d", status_code);
            }
        } else {
            ESP_LOGE(TAG, "HTTP request failed: %s (error code: %d)", esp_err_to_name(err), err);
            int error_num = esp_http_client_get_errno(client);
            ESP_LOGE(TAG, "HTTP client errno: %d", error_num);
        }
        
        retry_count++;
    }
    
    esp_http_client_cleanup(client);
    cJSON_free(post_data);
    cJSON_Delete(root);
    
    if (!verification_success) {
        ESP_LOGE(TAG, "Device verification failed after %d attempts", MAX_RETRIES);
        // Clear stored token
        store_api_token("");
    }
    
    return verification_success;
}

static void fetch_manifest(void) {
    char server_url[MAX_URL_LEN] = {0};
    char manifest_url[MAX_URL_LEN + 64] = {0};
    
    if (!get_stored_server_url(server_url)) {
        strcpy(server_url, DEFAULT_SERVER_URL);
    }
    
    snprintf(manifest_url, sizeof(manifest_url), "%s%s", server_url, MANIFEST_PATH);
    
    esp_http_client_config_t config = {
        .url = manifest_url,
        .event_handler = http_event_handler,
        .cert_pem = (char *)server_cert_pem_start,
        .transport_type = HTTP_TRANSPORT_OVER_SSL,
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
    // Configuration variables
    char ssid[MAX_SSID_LEN] = {0};
    char password[MAX_PASS_LEN] = {0};
    char server_url[MAX_URL_LEN] = {0};
    char api_token[MAX_TOKEN_LEN] = {0};
    bool need_config = true;
    
    // Initialize NVS
    initialize_nvs();
    
    // Initialize TCP/IP and WiFi components first
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();
    esp_netif_t *ap_netif = esp_netif_create_default_wifi_ap();
    
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    
    // Configure default IP for AP mode
    esp_netif_ip_info_t ip_info;
    IP4_ADDR(&ip_info.ip, 192, 168, 4, 1);
    IP4_ADDR(&ip_info.gw, 192, 168, 4, 1);
    IP4_ADDR(&ip_info.netmask, 255, 255, 255, 0);
    esp_netif_dhcps_stop(ap_netif);
    esp_netif_set_ip_info(ap_netif, &ip_info);
    esp_netif_dhcps_start(ap_netif);
    
    // Check if we have all required configuration
    if (get_stored_wifi_credentials(ssid, password) &&
        get_stored_server_url(server_url) &&
        get_stored_api_token(api_token)) {
        
        ESP_LOGI(TAG, "Found stored configuration");
        ESP_LOGI(TAG, "SSID: %s", ssid);
        ESP_LOGI(TAG, "Server URL: %s", server_url);
        ESP_LOGI(TAG, "API Token length: %d", strlen(api_token));
    
        // Try to connect with stored credentials
        ESP_LOGI(TAG, "Trying stored WiFi credentials for SSID: %s", ssid);
        if (try_wifi_connect(ssid, password)) {
            need_config = false;
            ESP_LOGI(TAG, "Successfully connected to WiFi");
        } else {
            ESP_LOGI(TAG, "Failed to connect with stored credentials");
        }
    } else {
        ESP_LOGI(TAG, "Missing configuration - need setup");
    }
    
    // Start configuration portal if needed
    if (need_config) {
        ESP_LOGI(TAG, "Starting configuration portal...");
        start_config_portal();
        
        // Main loop - wait for configuration
        while (1) {
            vTaskDelay(pdMS_TO_TICKS(1000));
        }
    }
    
    // If we're here, we're connected to WiFi
    ESP_LOGI(TAG, "Verifying device...");
    if (verify_device()) {
        ESP_LOGI(TAG, "Device verified successfully");
        ESP_LOGI(TAG, "Fetching manifest...");
        fetch_manifest();
    } else {
        ESP_LOGE(TAG, "Device verification failed - needs re-enrollment");
        start_config_portal();
        while (1) {
            vTaskDelay(pdMS_TO_TICKS(1000));
        }
    }
}
