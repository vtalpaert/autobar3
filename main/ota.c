#include "esp_https_ota.h"
#include "esp_log.h"

#include "version.h"
#include "storage.h"

static const char *TAG = "ota";
extern const uint8_t server_cert_pem_start[] asm("_binary_server_cert_pem_start");

esp_err_t do_firmware_upgrade()
{
    char server_url[MAX_URL_LEN] = {0};
    char api_token[MAX_TOKEN_LEN] = {0};
    char firmware_url[MAX_URL_LEN + 64] = {0};

    if (!get_stored_server_url(server_url) || !get_stored_api_token(api_token))
    {
        ESP_LOGE(TAG, "Missing server URL or API token");
        return false;
    }

    snprintf(firmware_url, sizeof(firmware_url), "%s/static/firmware/autobar3.bin", server_url);
    ESP_LOGI(TAG, "Will attempt OTA update at URL: %s", firmware_url);

    esp_http_client_config_t config = {
        .url = firmware_url,
        .cert_pem = (char *)server_cert_pem_start,
    };
    esp_https_ota_config_t ota_config = {
        .http_config = &config,
    };
    esp_err_t ret = esp_https_ota(&ota_config);
    if (ret == ESP_OK)
    {
        esp_restart();
    }
    else
    {
        return ESP_FAIL;
    }
    return ESP_OK;
}