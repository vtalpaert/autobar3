#include "esp_https_ota.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_app_format.h"
#include "esp_event.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_http_client.h"

#include "version.h"
#include "storage.h"

static const char *TAG = "ota";
extern const uint8_t server_cert_pem_start[] asm("_binary_server_cert_pem_start");

// Structure for streaming OTA context
typedef struct {
    esp_ota_handle_t ota_handle;
    const esp_partition_t *update_partition;
    size_t total_size;
    size_t written;
    bool ota_started;
} streaming_ota_t;

// New streaming event handler that writes directly to flash
static esp_err_t streaming_ota_handler(esp_http_client_event_t *evt)
{
    streaming_ota_t *ota_ctx = (streaming_ota_t *)evt->user_data;

    switch (evt->event_id) {
    case HTTP_EVENT_ERROR:
        ESP_LOGE(TAG, "HTTP_EVENT_ERROR");
        break;
    case HTTP_EVENT_ON_HEADER:
        if (strcasecmp(evt->header_key, "Content-Length") == 0) {
            ota_ctx->total_size = atoi(evt->header_value);
            ESP_LOGI(TAG, "Firmware size: %d bytes", ota_ctx->total_size);
        }
        break;
    case HTTP_EVENT_ON_DATA:
        if (evt->data_len) {
            // Initialize OTA on first data chunk
            if (!ota_ctx->ota_started) {
                ota_ctx->update_partition = esp_ota_get_next_update_partition(NULL);
                if (!ota_ctx->update_partition) {
                    ESP_LOGE(TAG, "No OTA update partition found");
                    return ESP_FAIL;
                }

                esp_err_t err = esp_ota_begin(ota_ctx->update_partition, ota_ctx->total_size, &ota_ctx->ota_handle);
                if (err != ESP_OK) {
                    ESP_LOGE(TAG, "esp_ota_begin failed: %s", esp_err_to_name(err));
                    return ESP_FAIL;
                }
                ota_ctx->ota_started = true;
                ESP_LOGI(TAG, "OTA started, writing to partition at offset 0x%lx", ota_ctx->update_partition->address);
            }

            // Write data directly to flash
            esp_err_t err = esp_ota_write(ota_ctx->ota_handle, evt->data, evt->data_len);
            if (err != ESP_OK) {
                ESP_LOGE(TAG, "esp_ota_write failed: %s", esp_err_to_name(err));
                return ESP_FAIL;
            }

            ota_ctx->written += evt->data_len;

            // Log progress every 64KB
            if (ota_ctx->written % (64 * 1024) == 0 || ota_ctx->written == ota_ctx->total_size) {
                float progress = (float)ota_ctx->written * 100.0 / ota_ctx->total_size;
                ESP_LOGI(TAG, "Downloaded and written: %d/%d bytes (%.1f%%)", 
                         ota_ctx->written, ota_ctx->total_size, progress);
            }
        }
        break;
    default:
        break;
    }
    return ESP_OK;
}


esp_err_t do_firmware_upgrade()
{
    char server_url[MAX_URL_LEN] = {0};
    char firmware_url[MAX_URL_LEN + 64] = {0};

    if (!get_stored_server_url(server_url)) {
        ESP_LOGE(TAG, "Missing server URL");
        return ESP_FAIL;
    }

    snprintf(firmware_url, sizeof(firmware_url), "%s/firmware/autobar3.bin", server_url);
    ESP_LOGI(TAG, "Will attempt OTA update at URL: %s", firmware_url);

    streaming_ota_t ota_ctx = {0};
    esp_err_t err = ESP_OK;

    esp_http_client_config_t config = {
        .url = firmware_url,
        .method = HTTP_METHOD_GET,
        .cert_pem = (char *)server_cert_pem_start,
        .transport_type = HTTP_TRANSPORT_OVER_SSL,
        .timeout_ms = 30000,
        .keep_alive_enable = true,
        .event_handler = streaming_ota_handler,
        .user_data = &ota_ctx
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    err = esp_http_client_perform(client);
    
    if (err == ESP_OK) {
        int status_code = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "Firmware download HTTP Status: %d", status_code);
        
        if (status_code != 200) {
            ESP_LOGE(TAG, "Firmware download failed with status: %d", status_code);
            err = ESP_FAIL;
        } else if (ota_ctx.ota_started) {
            ESP_LOGI(TAG, "Firmware download completed: %d bytes", ota_ctx.written);
            
            // Finish OTA
            err = esp_ota_end(ota_ctx.ota_handle);
            if (err != ESP_OK) {
                ESP_LOGE(TAG, "esp_ota_end failed: %s", esp_err_to_name(err));
            } else {
                err = esp_ota_set_boot_partition(ota_ctx.update_partition);
                if (err != ESP_OK) {
                    ESP_LOGE(TAG, "esp_ota_set_boot_partition failed: %s", esp_err_to_name(err));
                } else {
                    ESP_LOGI(TAG, "OTA upgrade successful. Rebooting...");
                    esp_http_client_cleanup(client);
                    vTaskDelay(pdMS_TO_TICKS(1000));
                    esp_restart();
                }
            }
        } else {
            ESP_LOGE(TAG, "OTA never started - no data received");
            err = ESP_FAIL;
        }
    } else {
        ESP_LOGE(TAG, "Firmware download failed: %s", esp_err_to_name(err));
    }

    // Cleanup on error
    if (ota_ctx.ota_started) {
        esp_ota_abort(ota_ctx.ota_handle);
    }
    esp_http_client_cleanup(client);
    
    ESP_LOGE(TAG, "OTA upgrade failed: %s", esp_err_to_name(err));
    return err;
}
