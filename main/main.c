#include <string.h>
#include <stdio.h>
#include "esp_log.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_http_client.h"
#include "esp_http_server.h"
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

#define AP_SSID "RobotCocktail"
#define AP_PASS "configure"
#define WIFI_CONNECT_TIMEOUT_MS 30000

static httpd_handle_t server = NULL;

// HTML for the configuration page
static const char *config_html = "<!DOCTYPE html><html><head>"
    "<title>RobotCocktail WiFi Setup</title>"
    "<meta name='viewport' content='width=device-width, initial-scale=1'>"
    "<style>"
    "body{font-family:Arial,sans-serif;margin:20px;}"
    "form{max-width:400px;margin:0 auto;}"
    "input{width:100%;padding:8px;margin:8px 0;box-sizing:border-box;}"
    "button{width:100%;padding:10px;background:#4CAF50;color:white;border:none;border-radius:4px;}"
    "</style></head><body>"
    "<form action='/save' method='post'>"
    "<h2>WiFi Configuration</h2>"
    "<input type='text' name='ssid' placeholder='WiFi SSID' required>"
    "<input type='password' name='password' placeholder='WiFi Password' required>"
    "<button type='submit'>Save and Connect</button>"
    "</form></body></html>";

// Handler for root path
static esp_err_t root_handler(httpd_req_t *req) {
    httpd_resp_send(req, config_html, strlen(config_html));
    return ESP_OK;
}

// Handler for form submission
static esp_err_t save_handler(httpd_req_t *req) {
    char *buf = NULL;
    char ssid[MAX_SSID_LEN] = {0};
    char password[MAX_PASS_LEN] = {0};
        
    // Get content length
    size_t content_len = req->content_len;
    if (content_len > 2048) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Content too long");
        return ESP_FAIL;
    }
        
    // Allocate memory for the content
    buf = malloc(content_len + 1);
    if (buf == NULL) {
        httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Failed to allocate memory");
        return ESP_FAIL;
    }
        
    // Receive the content in chunks
    size_t remaining = content_len;
    size_t offset = 0;
    while (remaining > 0) {
        int received = httpd_req_recv(req, buf + offset, remaining);
        if (received <= 0) {
            free(buf);
            return ESP_FAIL;
        }
        remaining -= received;
        offset += received;
    }
    buf[content_len] = '\0';
    
    // Simple form data parsing
    char *ssid_start = strstr(buf, "ssid=");
    char *pass_start = strstr(buf, "password=");
    
    if (ssid_start && pass_start) {
        ssid_start += 5;  // Skip "ssid="
        pass_start += 9;  // Skip "password="
        
        char *ssid_end = strchr(ssid_start, '&');
        if (ssid_end) {
            memcpy(ssid, ssid_start, ssid_end - ssid_start);
        }
        
        memcpy(password, pass_start, strlen(pass_start));
        
        // Store credentials
        store_wifi_credentials(ssid, password);
        
        // Send response and restart
        const char *response = "Configuration saved. Device will restart...";
        httpd_resp_send(req, response, strlen(response));
        
        vTaskDelay(pdMS_TO_TICKS(1000));
        esp_restart();
    }
    
    return ESP_OK;
}

static void start_config_portal(void) {
    // Initialize AP
    wifi_config_t ap_config = {
        .ap = {
            .ssid = AP_SSID,
            .ssid_len = strlen(AP_SSID),
            .password = AP_PASS,
            .max_connection = 1,
            .authmode = WIFI_AUTH_WPA2_PSK
        }
    };
    
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap_config));
    ESP_ERROR_CHECK(esp_wifi_start());
    
    // Start HTTP server with increased buffer sizes
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    // Increase server limits
    config.max_uri_handlers = 16;
    config.max_resp_headers = 16;
    config.max_open_sockets = 7;
    config.lru_purge_enable = true;
    config.recv_wait_timeout = 30;
    config.send_wait_timeout = 30;
    config.core_id = 0;
    // Increase buffer sizes significantly
    config.stack_size = 16384;
    config.server_port = 80;
    // Enable wildcard matching
    config.uri_match_fn = httpd_uri_match_wildcard;
    
    if (httpd_start(&server, &config) == ESP_OK) {
        httpd_uri_t uri_get = {
            .uri = "/",
            .method = HTTP_GET,
            .handler = root_handler,
            .user_ctx = NULL
        };
        httpd_uri_t uri_post = {
            .uri = "/save",
            .method = HTTP_POST,
            .handler = save_handler,
            .user_ctx = NULL
        };
        
        httpd_register_uri_handler(server, &uri_get);
        httpd_register_uri_handler(server, &uri_post);
        
        ESP_LOGI(TAG, "Configuration portal started at %s", AP_SSID);
        ESP_LOGI(TAG, "Connect to this network and visit http://192.168.4.1");
    }
}

static bool try_wifi_connect(const char *ssid, const char *password) {
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
    
    // Connect to WiFi
    ESP_ERROR_CHECK(esp_wifi_connect());
    
    // Wait for connection and IP
    int retry = 0;
    while (retry * 100 < WIFI_CONNECT_TIMEOUT_MS) {
        esp_netif_ip_info_t ip_info;
        esp_netif_t *netif = esp_netif_get_handle_from_ifkey("WIFI_STA_DEF");
        
        // Check both WiFi connection and IP assignment
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
    bool need_config = true;
    
    // Initialize NVS
    initialize_nvs();
    
    // Initialize TCP/IP and WiFi
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
    
    // Try stored credentials if available
    if (get_stored_wifi_credentials(ssid, password)) {
        ESP_LOGI(TAG, "Trying stored WiFi credentials for SSID: %s", ssid);
        if (try_wifi_connect(ssid, password)) {
            need_config = false;
            ESP_LOGI(TAG, "Successfully connected to WiFi");
        } else {
            ESP_LOGI(TAG, "Failed to connect with stored credentials");
        }
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
    ESP_LOGI(TAG, "Fetching manifest...");
    fetch_manifest();
}
