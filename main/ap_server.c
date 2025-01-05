#include "ap_server.h"
#include "wifi_config.h"
#include "esp_wifi.h"
#include "esp_log.h"
#include "esp_netif.h"
#include <string.h>

static const char *TAG = "ap_server";
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

static esp_err_t root_handler(httpd_req_t *req) {
    httpd_resp_send(req, config_html, strlen(config_html));
    return ESP_OK;
}

static esp_err_t save_handler(httpd_req_t *req) {
    char *buf = NULL;
    char ssid[MAX_SSID_LEN] = {0};
    char password[MAX_PASS_LEN] = {0};
    
    size_t content_len = req->content_len;
    if (content_len > 2048) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Content too long");
        return ESP_FAIL;
    }
    
    buf = malloc(content_len + 1);
    if (buf == NULL) {
        httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Failed to allocate memory");
        return ESP_FAIL;
    }
    
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
    
    char decoded[MAX_SSID_LEN] = {0};
    char *ssid_start = strstr(buf, "ssid=");
    char *pass_start = strstr(buf, "password=");
    
    if (ssid_start && pass_start) {
        ssid_start += 5;
        pass_start += 9;
        
        char *ssid_end = strchr(ssid_start, '&');
        if (ssid_end) {
            size_t len = ssid_end - ssid_start;
            char temp[MAX_SSID_LEN] = {0};
            memcpy(temp, ssid_start, len);
            
            char *src = temp;
            char *dst = decoded;
            while (*src) {
                if (*src == '+') {
                    *dst = ' ';
                } else if (*src == '%' && src[1] && src[2]) {
                    int high = src[1] >= 'A' ? (src[1] - 'A' + 10) : (src[1] - '0');
                    int low = src[2] >= 'A' ? (src[2] - 'A' + 10) : (src[2] - '0');
                    *dst = (high << 4) | low;
                    src += 2;
                } else {
                    *dst = *src;
                }
                src++;
                dst++;
            }
            strcpy(ssid, decoded);
        }
        
        memset(decoded, 0, sizeof(decoded));
        char *src = pass_start;
        char *dst = decoded;
        while (*src && *src != '&') {
            if (*src == '+') {
                *dst = ' ';
            } else if (*src == '%' && src[1] && src[2]) {
                int high = src[1] >= 'A' ? (src[1] - 'A' + 10) : (src[1] - '0');
                int low = src[2] >= 'A' ? (src[2] - 'A' + 10) : (src[2] - '0');
                *dst = (high << 4) | low;
                src += 2;
            } else {
                *dst = *src;
            }
            src++;
            dst++;
        }
        strcpy(password, decoded);
        
        store_wifi_credentials(ssid, password);
        
        const char *response = "Configuration saved. Device will restart...";
        httpd_resp_send(req, response, strlen(response));
        
        vTaskDelay(pdMS_TO_TICKS(1000));
        esp_restart();
    }
    
    free(buf);
    return ESP_OK;
}

void start_config_portal(void) {
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
    
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.max_uri_handlers = 16;
    config.max_resp_headers = 16;
    config.max_open_sockets = 7;
    config.lru_purge_enable = true;
    config.recv_wait_timeout = 30;
    config.send_wait_timeout = 30;
    config.core_id = 0;
    config.stack_size = 16384;
    config.server_port = 80;
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
