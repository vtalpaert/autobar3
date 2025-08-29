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
static cJSON *make_http_request(const char *url, const char *post_data, bool is_api_call)
{
    // Initialize response buffer
    response_buffer_t resp = {
        .buffer = NULL,
        .size = 0};

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
        .user_data = &resp};

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

cJSON *api_contact_server(char *api_path, cJSON *payload)
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

bool verify_device(bool device_needs_calibration, bool *server_needs_calibration)
{
    const char *api_path = "/api/devices/verify";
    bool verification_success = false;

    // Initialize output parameter
    if (server_needs_calibration)
    {
        *server_needs_calibration = false;
    }

    // Prepare JSON payload
    cJSON *payload = cJSON_CreateObject();
    cJSON_AddStringToObject(payload, "firmwareVersion", FIRMWARE_VERSION);

    // Add device calibration status if needed
    if (device_needs_calibration)
    {
        cJSON_AddBoolToObject(payload, "needsCalibration", true);
    }

    cJSON *response = api_contact_server((char *)api_path, payload);

    if (response)
    {
        cJSON *token_valid = cJSON_GetObjectItem(response, "tokenValid");
        cJSON *message = cJSON_GetObjectItem(response, "message");
        cJSON *need_cal = cJSON_GetObjectItem(response, "needCalibration");

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

            // Extract server calibration status if provided
            if (server_needs_calibration && need_cal && cJSON_IsBool(need_cal))
            {
                *server_needs_calibration = cJSON_IsTrue(need_cal);
                ESP_LOGI(TAG, "Server says calibration needed: %s", *server_needs_calibration ? "true" : "false");
            }
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

bool fetch_manifest(char *version_buffer, size_t buffer_size)
{
    const char *manifest_path = "/firmware/manifest.json";
    char server_url[MAX_URL_LEN] = {0};
    char manifest_url[MAX_URL_LEN + 64] = {0};
    bool success = false;

    // Initialize output buffer
    if (version_buffer && buffer_size > 0)
    {
        version_buffer[0] = '\0';
    }

    if (!get_stored_server_url(server_url))
    {
        ESP_LOGE(TAG, "No server URL configured");
        return false;
    }

    snprintf(manifest_url, sizeof(manifest_url), "%s%s", server_url, manifest_path);

    cJSON *manifest = make_http_request(manifest_url, NULL, false);

    if (manifest)
    {
        cJSON *version_item = cJSON_GetObjectItem(manifest, "version");
        if (version_item && cJSON_IsString(version_item))
        {
            if (version_buffer && buffer_size > strlen(version_item->valuestring))
            {
                strcpy(version_buffer, version_item->valuestring);
                ESP_LOGI(TAG, "Manifest version: %s", version_buffer);
                success = true;
            }
            else
            {
                ESP_LOGE(TAG, "Version buffer too small for manifest version");
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

    return success;
}

bool report_progress(const char *order_id, const char *dose_id, float weight_progress, bool *should_continue, char *message, size_t message_size)
{
    const char *api_path = "/api/devices/progress";
    bool success = false;

    // Initialize output parameters
    if (should_continue)
    {
        *should_continue = false;
    }
    if (message && message_size > 0)
    {
        message[0] = '\0';
    }

    if (!order_id || !dose_id)
    {
        ESP_LOGE(TAG, "Order ID and dose ID cannot be NULL");
        return false;
    }

    // Prepare JSON payload
    cJSON *payload = cJSON_CreateObject();
    cJSON_AddStringToObject(payload, "orderId", order_id);
    cJSON_AddStringToObject(payload, "doseId", dose_id);
    cJSON_AddNumberToObject(payload, "weightProgress", weight_progress);

    cJSON *response = api_contact_server((char *)api_path, payload);

    if (response)
    {
        cJSON *message_item = cJSON_GetObjectItem(response, "message");
        cJSON *continue_item = cJSON_GetObjectItem(response, "continue");

        if (message_item && cJSON_IsString(message_item))
        {
            ESP_LOGI(TAG, "Progress report response: %s", message_item->valuestring);
            success = true;

            // Copy message to output buffer if provided
            if (message && message_size > 0)
            {
                strncpy(message, message_item->valuestring, message_size - 1);
                message[message_size - 1] = '\0';
            }

            // Check if we should continue
            if (should_continue && continue_item && cJSON_IsBool(continue_item))
            {
                *should_continue = cJSON_IsTrue(continue_item);
                ESP_LOGI(TAG, "Should continue: %s", *should_continue ? "true" : "false");
            }
        }
        else
        {
            ESP_LOGE(TAG, "No message field found in progress response");
        }
    }
    else
    {
        ESP_LOGE(TAG, "Failed to report progress to server");
    }

    cJSON_Delete(payload);
    cJSON_Delete(response);

    return success;
}

bool ask_server_for_action(device_action_t *action)
{
    const char *api_path = "/api/devices/action";
    bool success = false;

    if (!action)
    {
        ESP_LOGE(TAG, "Action parameter cannot be NULL");
        return false;
    }

    // Initialize action structure
    memset(action, 0, sizeof(device_action_t));
    action->type = ACTION_ERROR;

    // Prepare JSON payload (just needs token, which is added by api_contact_server)
    cJSON *payload = cJSON_CreateObject();

    cJSON *response = api_contact_server((char *)api_path, payload);

    if (response)
    {
        cJSON *action_item = cJSON_GetObjectItem(response, "action");

        if (action_item && cJSON_IsString(action_item))
        {
            const char *action_str = action_item->valuestring;

            if (strcmp(action_str, "standby") == 0)
            {
                action->type = ACTION_STANDBY;
                cJSON *idle = cJSON_GetObjectItem(response, "idle");
                if (idle && cJSON_IsNumber(idle))
                {
                    action->data.standby.idle_ms = idle->valueint;
                }
                else
                {
                    action->data.standby.idle_ms = 1000; // Default 1000ms if missing
                }
                success = true;
                ESP_LOGI(TAG, "Received standby action, idle for %d ms", action->data.standby.idle_ms);
            }
            else if (strcmp(action_str, "pump") == 0)
            {
                action->type = ACTION_PUMP;
                cJSON *order_id = cJSON_GetObjectItem(response, "orderId");
                cJSON *dose_id = cJSON_GetObjectItem(response, "doseId");
                cJSON *pump_gpio = cJSON_GetObjectItem(response, "pumpGpio");
                cJSON *dose_weight = cJSON_GetObjectItem(response, "doseWeight");
                cJSON *dose_weight_progress = cJSON_GetObjectItem(response, "doseWeightProgress");

                if (order_id && cJSON_IsString(order_id) &&
                    dose_id && cJSON_IsString(dose_id) &&
                    pump_gpio && cJSON_IsNumber(pump_gpio) &&
                    dose_weight && cJSON_IsNumber(dose_weight) &&
                    dose_weight_progress && cJSON_IsNumber(dose_weight_progress))
                {
                    strncpy(action->data.pump.order_id, order_id->valuestring, sizeof(action->data.pump.order_id) - 1);
                    strncpy(action->data.pump.dose_id, dose_id->valuestring, sizeof(action->data.pump.dose_id) - 1);
                    action->data.pump.pump_gpio = pump_gpio->valueint;
                    action->data.pump.dose_weight = (float)dose_weight->valuedouble;
                    action->data.pump.dose_weight_progress = (float)dose_weight_progress->valuedouble;
                    success = true;
                    ESP_LOGI(TAG, "Received pump action for order %s, dose %s, GPIO %d",
                             action->data.pump.order_id, action->data.pump.dose_id, action->data.pump.pump_gpio);
                }
            }
            else if (strcmp(action_str, "completed") == 0)
            {
                action->type = ACTION_COMPLETED;
                cJSON *order_id = cJSON_GetObjectItem(response, "orderId");
                cJSON *message = cJSON_GetObjectItem(response, "message");

                if (order_id && cJSON_IsString(order_id) &&
                    message && cJSON_IsString(message))
                {
                    strncpy(action->data.completed.order_id, order_id->valuestring, sizeof(action->data.completed.order_id) - 1);
                    strncpy(action->data.completed.message, message->valuestring, sizeof(action->data.completed.message) - 1);
                    success = true;
                    ESP_LOGI(TAG, "Received completed action for order %s: %s",
                             action->data.completed.order_id, action->data.completed.message);
                }
            }
            else
            {
                ESP_LOGE(TAG, "Unknown action type: %s", action_str);
            }
        }
        else
        {
            ESP_LOGE(TAG, "No action field found in server response");
        }
    }
    else
    {
        ESP_LOGE(TAG, "Failed to get action from server");
    }

    cJSON_Delete(payload);
    cJSON_Delete(response);

    return success;
}

bool send_weight_measurement(float weight, int raw_measure, bool *need_calibration, unsigned int *dt_pin, unsigned int *sck_pin, int *offset, float *scale)
{
    const char *api_path = "/api/devices/weight";
    bool success = false;

    // Initialize output parameters
    if (need_calibration)
        *need_calibration = false;
    if (dt_pin)
        *dt_pin = 0;
    if (sck_pin)
        *sck_pin = 0;
    if (offset)
        *offset = 0;
    if (scale)
        *scale = 0.0;

    // Prepare JSON payload
    cJSON *payload = cJSON_CreateObject();
    cJSON_AddNumberToObject(payload, "weight", weight);
    cJSON_AddNumberToObject(payload, "rawMeasure", raw_measure);

    cJSON *response = api_contact_server((char *)api_path, payload);

    if (response)
    {
        cJSON *need_cal = cJSON_GetObjectItem(response, "needCalibration");
        cJSON *dt = cJSON_GetObjectItem(response, "hx711Dt");
        cJSON *sck = cJSON_GetObjectItem(response, "hx711Sck");
        cJSON *offs = cJSON_GetObjectItem(response, "hx711Offset");
        cJSON *sc = cJSON_GetObjectItem(response, "hx711Scale");

        if (need_cal && cJSON_IsBool(need_cal))
        {
            if (need_calibration)
                *need_calibration = cJSON_IsTrue(need_cal);
            success = true;
        }

        if (dt && cJSON_IsNumber(dt) && dt_pin)
        {
            *dt_pin = (unsigned int)dt->valueint;
        }

        if (sck && cJSON_IsNumber(sck) && sck_pin)
        {
            *sck_pin = (unsigned int)sck->valueint;
        }

        if (offs && cJSON_IsNumber(offs) && offset)
        {
            *offset = offs->valueint;
        }

        if (sc && cJSON_IsNumber(sc) && scale)
        {
            *scale = (float)sc->valuedouble;
        }

        ESP_LOGI(TAG, "Weight measurement sent successfully");
    }
    else
    {
        ESP_LOGE(TAG, "Failed to send weight measurement to server");
    }

    cJSON_Delete(payload);
    cJSON_Delete(response);

    return success;
}
