#include "esp_https_ota.h"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_app_format.h"
#include "esp_event.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "version.h"
#include "storage.h"

static const char *TAG = "ota";
extern const uint8_t server_cert_pem_start[] asm("_binary_server_cert_pem_start");

// Event handler for OTA progress (similar to the example)
static void ota_event_handler(void *arg, esp_event_base_t event_base,
                              int32_t event_id, void *event_data)
{
    if (event_base == ESP_HTTPS_OTA_EVENT)
    {
        switch (event_id)
        {
        case ESP_HTTPS_OTA_START:
            ESP_LOGI(TAG, "OTA started");
            break;
        case ESP_HTTPS_OTA_CONNECTED:
            ESP_LOGI(TAG, "Connected to server");
            break;
        case ESP_HTTPS_OTA_GET_IMG_DESC:
            ESP_LOGI(TAG, "Reading Image Description");
            break;
        case ESP_HTTPS_OTA_VERIFY_CHIP_ID:
            ESP_LOGI(TAG, "Verifying chip id of new image");
            break;
        case ESP_HTTPS_OTA_WRITE_FLASH:
            ESP_LOGD(TAG, "Writing to flash: %d written", *(int *)event_data);
            break;
        case ESP_HTTPS_OTA_UPDATE_BOOT_PARTITION:
            ESP_LOGI(TAG, "Boot partition updated");
            break;
        case ESP_HTTPS_OTA_FINISH:
            ESP_LOGI(TAG, "OTA finish");
            break;
        case ESP_HTTPS_OTA_ABORT:
            ESP_LOGI(TAG, "OTA abort");
            break;
        }
    }
}

// Validate firmware image header
static esp_err_t validate_image_header(esp_app_desc_t *new_app_info)
{
    if (new_app_info == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    const esp_partition_t *running = esp_ota_get_running_partition();
    esp_app_desc_t running_app_info;
    if (esp_ota_get_partition_description(running, &running_app_info) == ESP_OK)
    {
        ESP_LOGI(TAG, "Running firmware version: %s", running_app_info.version);
        ESP_LOGI(TAG, "New firmware version: %s", new_app_info->version);
    }

    // Optional: Skip version check for development
    // if (memcmp(new_app_info->version, running_app_info.version, sizeof(new_app_info->version)) == 0) {
    //     ESP_LOGW(TAG, "Current running version is the same as new. Skipping update.");
    //     return ESP_FAIL;
    // }

    return ESP_OK;
}

// HTTP client init callback for custom headers or error handling
static esp_err_t http_client_init_cb(esp_http_client_handle_t http_client)
{
    char url_buf[512];
    esp_err_t url_err = esp_http_client_get_url(http_client, url_buf, sizeof(url_buf));
    ESP_LOGI(TAG, "URL retrieval result: %s", esp_err_to_name(url_err));
    ESP_LOGI(TAG, "Retrieved URL: %s", url_buf);
    ESP_LOGI(TAG, "URL buffer size: %d, URL length: %d", sizeof(url_buf), strlen(url_buf));

    // Check if port is present in the retrieved URL
    if (strstr(url_buf, ":5173") != NULL)
    {
        ESP_LOGI(TAG, "Port 5173 found in URL");
    }
    else
    {
        ESP_LOGE(TAG, "Port 5173 missing from URL!");
    }

    // Add User-Agent header
    esp_http_client_set_header(http_client, "User-Agent", "ESP32-OTA/1.0");

    // Check HTTP status before OTA begins
    esp_err_t err = esp_http_client_open(http_client, 0);
    if (err != ESP_OK)
    {
        char error_buf[100];
        ESP_LOGE(TAG, "HTTP client open failed: %s (0x%x)",
                 esp_err_to_name_r(err, error_buf, sizeof(error_buf)), err);

        // Try to get more details about the connection failure
        int socket_errno = esp_http_client_get_errno(http_client);
        ESP_LOGE(TAG, "Socket errno: %d", socket_errno);

        return err;
    }

    int status_code = esp_http_client_get_status_code(http_client);
    ESP_LOGI(TAG, "HTTP Status Code: %d", status_code);

    switch (status_code)
    {
    case 200:
        ESP_LOGI(TAG, "Firmware found, starting download");
        break;
    case 404:
        ESP_LOGE(TAG, "Firmware not found (404) - check firmware URL");
        esp_http_client_close(http_client);
        return ESP_FAIL;
    case 403:
        ESP_LOGE(TAG, "Access forbidden (403) - server denying access");
        esp_http_client_close(http_client);
        return ESP_FAIL;
    case 401:
        ESP_LOGE(TAG, "Unauthorized (401) - authentication required");
        esp_http_client_close(http_client);
        return ESP_FAIL;
    default:
        ESP_LOGE(TAG, "Unexpected HTTP status: %d", status_code);
        esp_http_client_close(http_client);
        return ESP_FAIL;
    }

    esp_http_client_close(http_client);
    return ESP_OK;
}

esp_err_t do_firmware_upgrade()
{
    char server_url[MAX_URL_LEN] = {0};
    char firmware_url[MAX_URL_LEN + 64] = {0};

    if (!get_stored_server_url(server_url))
    {
        ESP_LOGE(TAG, "Missing server URL");
        return ESP_FAIL;
    }

    snprintf(firmware_url, sizeof(firmware_url), "%s/firmware/autobar3.bin", server_url);
    ESP_LOGI(TAG, "Will attempt OTA update at URL: %s", firmware_url);

    // Register event handler
    ESP_ERROR_CHECK(esp_event_handler_register(ESP_HTTPS_OTA_EVENT, ESP_EVENT_ANY_ID, &ota_event_handler, NULL));

    // Configure HTTP client (similar to your api.c)
    esp_http_client_config_t config = {
        .url = firmware_url,
        .cert_pem = (char *)server_cert_pem_start,
        .transport_type = HTTP_TRANSPORT_OVER_SSL,
        .timeout_ms = 30000, // Longer timeout for firmware
        .keep_alive_enable = true,
        .buffer_size = 4096,    // Add explicit buffer size
        .buffer_size_tx = 4096, // Add explicit TX buffer size
    };

    esp_https_ota_config_t ota_config = {
        .http_config = &config,
        .http_client_init_cb = http_client_init_cb, // Custom error handling
    };

    esp_https_ota_handle_t https_ota_handle = NULL;
    esp_err_t err = esp_https_ota_begin(&ota_config, &https_ota_handle);

    if (err != ESP_OK)
    {
        char error_buf[100];
        ESP_LOGE(TAG, "ESP HTTPS OTA Begin failed: %s (0x%x)",
                 esp_err_to_name_r(err, error_buf, sizeof(error_buf)), err);
        goto ota_end;
    }

    // Get and validate image description
    esp_app_desc_t app_desc;
    err = esp_https_ota_get_img_desc(https_ota_handle, &app_desc);
    if (err != ESP_OK)
    {
        char error_buf[100];
        ESP_LOGE(TAG, "esp_https_ota_get_img_desc failed: %s (0x%x)",
                 esp_err_to_name_r(err, error_buf, sizeof(error_buf)), err);
        goto ota_end;
    }

    err = validate_image_header(&app_desc);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Image header validation failed");
        goto ota_end;
    }

    // Perform OTA update with progress monitoring
    while (1)
    {
        err = esp_https_ota_perform(https_ota_handle);
        if (err != ESP_ERR_HTTPS_OTA_IN_PROGRESS)
        {
            break;
        }
        // Log progress
        int bytes_read = esp_https_ota_get_image_len_read(https_ota_handle);
        ESP_LOGI(TAG, "Image bytes read: %d", bytes_read);

        // Optional: Add a small delay to prevent log spam
        vTaskDelay(pdMS_TO_TICKS(100));
    }

    // Check if complete data was received
    if (esp_https_ota_is_complete_data_received(https_ota_handle) != true)
    {
        ESP_LOGE(TAG, "Complete data was not received");
        err = ESP_FAIL;
        goto ota_end;
    }

    // Finish OTA update
    esp_err_t ota_finish_err = esp_https_ota_finish(https_ota_handle);
    if ((err == ESP_OK) && (ota_finish_err == ESP_OK))
    {
        ESP_LOGI(TAG, "ESP_HTTPS_OTA upgrade successful. Rebooting...");
        esp_event_handler_unregister(ESP_HTTPS_OTA_EVENT, ESP_EVENT_ANY_ID, &ota_event_handler);
        vTaskDelay(pdMS_TO_TICKS(1000));
        esp_restart();
    }
    else
    {
        if (ota_finish_err == ESP_ERR_OTA_VALIDATE_FAILED)
        {
            ESP_LOGE(TAG, "Image validation failed, image is corrupted");
        }
        else
        {
            char error_buf[100];
            ESP_LOGE(TAG, "ESP_HTTPS_OTA upgrade failed: %s (0x%x)",
                     esp_err_to_name_r(ota_finish_err, error_buf, sizeof(error_buf)), ota_finish_err);
        }
        err = ESP_FAIL;
    }

ota_end:
    esp_https_ota_abort(https_ota_handle);
    esp_event_handler_unregister(ESP_HTTPS_OTA_EVENT, ESP_EVENT_ANY_ID, &ota_event_handler);

    char error_buf[100];
    ESP_LOGE(TAG, "ESP_HTTPS_OTA upgrade failed: %s (0x%x)",
             esp_err_to_name_r(err, error_buf, sizeof(error_buf)), err);
    return err;
}
