#ifndef STORAGE_H
#define STORAGE_H

#include <stdbool.h>
#include "esp_err.h"

#define MAX_SSID_LEN 32
#define MAX_PASS_LEN 64
#define MAX_URL_LEN 128

void initialize_nvs(void);
bool get_stored_wifi_credentials(char *ssid, char *password);
void store_wifi_credentials(const char *ssid, const char *password);
bool try_wifi_connect(const char *ssid, const char *password);

// Server URL functions
bool get_stored_server_url(char *url);
void store_server_url(const char *url);

#endif // STORAGE_H