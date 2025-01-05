idf_component_register(SRCS "main.c" "wifi_config.c" "ap_server.c"
                    INCLUDE_DIRS "."
                    REQUIRES nvs_flash esp_wifi esp_http_client esp_event json esp_http_server)
