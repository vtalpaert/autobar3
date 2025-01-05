#ifndef WIFI_CONFIG_H
#define WIFI_CONFIG_H

#include <stdbool.h>
#include "esp_err.h"

#define MAX_SSID_LEN 32
#define MAX_PASS_LEN 64

void initialize_nvs(void);
bool get_stored_wifi_credentials(char *ssid, char *password);
void store_wifi_credentials(const char *ssid, const char *password);
bool try_wifi_connect(const char *ssid, const char *password);

#endif // WIFI_CONFIG_H
