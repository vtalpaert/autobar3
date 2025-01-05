#ifndef AP_SERVER_H
#define AP_SERVER_H

#include "esp_http_server.h"

#define AP_SSID "RobotCocktail"
#define AP_PASS "configure"

void start_config_portal(void);

#endif // AP_SERVER_H
