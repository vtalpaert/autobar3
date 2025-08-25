#include "storage.h"
#include "nvs_flash.h"
#include "nvs.h"
#include <string.h>

// static const char *TAG = "storage";

void initialize_nvs(void)
{
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
}

bool get_stored_wifi_credentials(char *ssid, char *password)
{
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open("storage", NVS_READONLY, &nvs_handle);
    if (err != ESP_OK)
        return false;

    size_t ssid_len = MAX_SSID_LEN;
    size_t pass_len = MAX_PASS_LEN;

    err = nvs_get_str(nvs_handle, "ssid", ssid, &ssid_len);
    if (err != ESP_OK || ssid_len <= 1)
    {
        nvs_close(nvs_handle);
        return false;
    }

    err = nvs_get_str(nvs_handle, "password", password, &pass_len);
    if (err != ESP_OK)
    {
        nvs_close(nvs_handle);
        return false;
    }

    nvs_close(nvs_handle);
    return strlen(ssid) > 0;
}

void store_wifi_credentials(const char *ssid, const char *password)
{
    nvs_handle_t nvs_handle;
    ESP_ERROR_CHECK(nvs_open("storage", NVS_READWRITE, &nvs_handle));

    ESP_ERROR_CHECK(nvs_set_str(nvs_handle, "ssid", ssid));
    ESP_ERROR_CHECK(nvs_set_str(nvs_handle, "password", password));

    ESP_ERROR_CHECK(nvs_commit(nvs_handle));
    nvs_close(nvs_handle);
}

bool get_stored_server_url(char *url)
{
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open("storage", NVS_READONLY, &nvs_handle);
    if (err != ESP_OK)
        return false;

    size_t url_len = MAX_URL_LEN;
    err = nvs_get_str(nvs_handle, "server_url", url, &url_len);

    nvs_close(nvs_handle);
    return (err == ESP_OK && url_len > 1);
}

void store_server_url(const char *url)
{
    nvs_handle_t nvs_handle;
    ESP_ERROR_CHECK(nvs_open("storage", NVS_READWRITE, &nvs_handle));

    // Remove trailing slash if it exists
    char clean_url[MAX_URL_LEN];
    strncpy(clean_url, url, MAX_URL_LEN - 1);
    clean_url[MAX_URL_LEN - 1] = '\0';
    
    size_t len = strlen(clean_url);
    if (len > 0 && clean_url[len - 1] == '/') {
        clean_url[len - 1] = '\0';
    }

    ESP_ERROR_CHECK(nvs_set_str(nvs_handle, "server_url", clean_url));

    ESP_ERROR_CHECK(nvs_commit(nvs_handle));
    nvs_close(nvs_handle);
}

bool get_stored_api_token(char *token)
{
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open("storage", NVS_READONLY, &nvs_handle);
    if (err != ESP_OK)
        return false;

    size_t token_len = MAX_TOKEN_LEN;
    err = nvs_get_str(nvs_handle, "api_token", token, &token_len);

    nvs_close(nvs_handle);
    return (err == ESP_OK && token_len > 1);
}

void store_api_token(const char *token)
{
    nvs_handle_t nvs_handle;
    ESP_ERROR_CHECK(nvs_open("storage", NVS_READWRITE, &nvs_handle));

    ESP_ERROR_CHECK(nvs_set_str(nvs_handle, "api_token", token));

    ESP_ERROR_CHECK(nvs_commit(nvs_handle));
    nvs_close(nvs_handle);
}
