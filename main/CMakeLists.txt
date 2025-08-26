idf_component_register(SRCS "wifi_config.c" "ota.c" "main.c" "storage.c" "ap_server.c" "api.c"
    INCLUDE_DIRS "."
    REQUIRES app_update esp_event esp_http_client esp_http_server esp_https_ota esp_wifi json nvs_flash
    EMBED_TXTFILES server_cert.pem)
