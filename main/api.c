#include "version.h"
#include "api.h"
#include "esp_log.h"
#include "esp_http_client.h"
#include "storage.h"
#include "cJSON.h"
#include <string.h>

static const char *TAG = "api";
#define MAX_RETRIES 4
#define RETRY_DELAY_MS 30000

extern const uint8_t server_cert_pem_start[] asm("_binary_server_cert_pem_start");
extern const uint8_t server_cert_pem_end[] asm("_binary_server_cert_pem_end");

// Structure to store response data
typedef struct
{
    char *buffer;
    size_t size;
} response_buffer_t;

static esp_err_t http_event_handler(esp_http_client_event_t *evt)
{
    response_buffer_t *resp = (response_buffer_t *)evt->user_data;

    switch (evt->event_id)
    {
    case HTTP_EVENT_ERROR:
        ESP_LOGI(TAG, "HTTP_EVENT_ERROR");
        break;
    case HTTP_EVENT_ON_DATA:
        if (evt->data_len)
        {
            // Reallocate buffer to fit new data
            char *new_buffer = realloc(resp->buffer, resp->size + evt->data_len + 1);
            if (new_buffer == NULL)
            {
                ESP_LOGE(TAG, "Failed to allocate memory for response buffer");
                return ESP_FAIL;
            }
            resp->buffer = new_buffer;

            // Copy new data into buffer
            memcpy(resp->buffer + resp->size, evt->data, evt->data_len);
            resp->size += evt->data_len;
            resp->buffer[resp->size] = '\0';
        }
        break;
    default:
        break;
    }
    return ESP_OK;
}

// Generic HTTP request function
static cJSON* make_http_request(const char *url, const char *post_data, bool is_api_call)
{
    // Initialize response buffer
    response_buffer_t resp = {
        .buffer = NULL,
        .size = 0
    };

    esp_http_client_config_t config = {
        .url = url,
        .method = post_data ? HTTP_METHOD_POST : HTTP_METHOD_GET,
        .cert_pem = (char *)server_cert_pem_start,
        .transport_type = HTTP_TRANSPORT_OVER_SSL,
        .buffer_size = 2048,
        .buffer_size_tx = 1024,
        .disable_auto_redirect = true,
        .timeout_ms = 10000,
        .keep_alive_enable = true,
        .event_handler = http_event_handler,
        .user_data = &resp
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    
    if (post_data)
    {
        esp_http_client_set_header(client, "Content-Type", "application/json");
    }

    cJSON *parsed_response = NULL;
    int retry_count = 0;

    while (retry_count < MAX_RETRIES && !parsed_response)
    {
        if (retry_count > 0)
        {
            ESP_LOGI(TAG, "Retrying HTTP request (attempt %d/%d)", retry_count + 1, MAX_RETRIES);
            vTaskDelay(pdMS_TO_TICKS(RETRY_DELAY_MS));
        }

        if (post_data)
        {
            esp_http_client_set_post_field(client, post_data, strlen(post_data));
        }

        esp_err_t err = esp_http_client_perform(client);

        if (err == ESP_OK)
        {
            int status_code = esp_http_client_get_status_code(client);
            ESP_LOGI(TAG, "HTTP Status Code: %d", status_code);

            if (status_code == 200)
            {
                if (resp.buffer && resp.size > 0)
                {
                    parsed_response = cJSON_Parse(resp.buffer);
                    if (!parsed_response)
                    {
                        ESP_LOGE(TAG, "Failed to parse JSON response");
                    }
                }
                else
                {
                    ESP_LOGE(TAG, "Empty server response (buffer size: %d bytes)", resp.size);
                }

                // Clean up response buffer for next retry
                if (resp.buffer && !parsed_response)
                {
                    free(resp.buffer);
                    resp.buffer = NULL;
                    resp.size = 0;
                }
            }
            else
            {
                ESP_LOGE(TAG, "Unexpected HTTP status code: %d", status_code);
            }
        }
        else
        {
            ESP_LOGE(TAG, "HTTP request failed: %s (error code: %d)", esp_err_to_name(err), err);
            
            if (err == ESP_ERR_HTTP_CONNECT)
            {
                ESP_LOGE(TAG, "Connection failed - check server URL and connectivity");
            }
            else if (err == ESP_ERR_HTTP_CONNECTING)
            {
                ESP_LOGE(TAG, "Client connecting to server");
            }
            else if (err == ESP_ERR_HTTP_EAGAIN)
            {
                ESP_LOGE(TAG, "HTTP client error: ESP_ERR_HTTP_EAGAIN - try again later");
            }
        }

        retry_count++;
    }

    // Clean up
    if (resp.buffer)
    {
        free(resp.buffer);
    }
    esp_http_client_cleanup(client);

    if (!parsed_response)
    {
        ESP_LOGE(TAG, "HTTP request failed after %d attempts", MAX_RETRIES);
        // Clear stored token for API verification failures
        if (is_api_call && strstr(url, "/verify"))
        {
            store_api_token("");
        }
    }

    return parsed_response;
}

cJSON* api_contact_server(char *api_path, cJSON *payload)
{
    char server_url[MAX_URL_LEN] = {0};
    char api_token[MAX_TOKEN_LEN] = {0};
    char api_url[MAX_URL_LEN + 64] = {0};

    if (!get_stored_server_url(server_url) || !get_stored_api_token(api_token))
    {
        ESP_LOGE(TAG, "Missing server URL or API token");
        return NULL;
    }

    snprintf(api_url, sizeof(api_url), "%s%s", server_url, api_path);
    ESP_LOGI(TAG, "API call at URL: %s", api_url);

    // Add token to payload
    cJSON_AddStringToObject(payload, "token", api_token);
    char *post_data = cJSON_PrintUnformatted(payload);

    cJSON *response = make_http_request(api_url, post_data, true);

    cJSON_free(post_data);
    return response;
}

bool verify_device(void)
{
    const char *api_path = "/api/devices/verify";
    bool verification_success = false;

    // Prepare JSON payload
    cJSON *payload = cJSON_CreateObject();
    cJSON_AddStringToObject(payload, "firmwareVersion", FIRMWARE_VERSION);

    cJSON *response = api_contact_server((char*)api_path, payload);

    if (response)
    {
        cJSON *token_valid = cJSON_GetObjectItem(response, "tokenValid");
        cJSON *message = cJSON_GetObjectItem(response, "message");

        if (message)
        {
            ESP_LOGI(TAG, "Server response: %s", message->valuestring);
        }
        else
        {
            ESP_LOGE(TAG, "No message in server response");
        }

        if (token_valid && cJSON_IsTrue(token_valid))
        {
            verification_success = true;
            ESP_LOGI(TAG, "Token verification successful");
        }
        else
        {
            ESP_LOGE(TAG, "Token verification failed - server rejected token");
        }
    }
    else
    {
        ESP_LOGE(TAG, "Failed to get response from server");
    }

    cJSON_Delete(payload);
    cJSON_Delete(response);

    return verification_success;
}

char* fetch_manifest(void)
{
    const char *manifest_path = "/firmware/manifest.json";
    char server_url[MAX_URL_LEN] = {0};
    char manifest_url[MAX_URL_LEN + 64] = {0};

    if (!get_stored_server_url(server_url))
    {
        ESP_LOGE(TAG, "No server URL configured");
        return NULL;
    }

    snprintf(manifest_url, sizeof(manifest_url), "%s%s", server_url, manifest_path);

    cJSON *manifest = make_http_request(manifest_url, NULL, false);
    char *version = NULL;

    if (manifest)
    {
        cJSON *version_item = cJSON_GetObjectItem(manifest, "version");
        if (version_item && cJSON_IsString(version_item))
        {
            // Allocate memory for version string and copy it
            version = malloc(strlen(version_item->valuestring) + 1);
            if (version)
            {
                strcpy(version, version_item->valuestring);
                ESP_LOGI(TAG, "Manifest version: %s", version);
            }
        }
        else
        {
            ESP_LOGE(TAG, "No version field found in manifest");
        }
        cJSON_Delete(manifest);
    }
    else
    {
        ESP_LOGE(TAG, "Failed to fetch or parse manifest");
    }

    return version;
}
