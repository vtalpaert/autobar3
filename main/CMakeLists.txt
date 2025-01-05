idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES nvs_flash esp_wifi esp_http_client esp_event json esp_http_server)
