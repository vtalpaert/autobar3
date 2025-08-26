#ifndef OTA_H
#define OTA_H

#include "esp_https_ota.h"
#include <stdbool.h>

// Function to verify device with the server
esp_err_t do_firmware_upgrade();

#endif // OTA_H
