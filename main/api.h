#ifndef API_H
#define API_H

#include <stdbool.h>
#include <stddef.h>

// Error codes for device error reporting
typedef enum
{
    ERROR_CODE_UNKNOWN = 0,
    ERROR_CODE_GENERAL = 1,
    ERROR_CODE_WEIGHT_SCALE = 2,
    ERROR_CODE_NO_WEIGHT_CHANGE = 3,
    ERROR_CODE_NEGATIVE_WEIGHT_CHANGE = 4,
    ERROR_CODE_UNABLE_TO_REPORT_PROGRESS = 5
} error_code_t;

// Function to verify device state with the server at `POST /api/devices/verify`
bool verify_device(bool device_needs_calibration, bool *server_needs_calibration);

// Function to fetch manifest from server static files and return version in provided buffer
bool fetch_manifest(char *version_buffer, size_t buffer_size);

// Function to send weight measurement and get calibration parameters at `POST /api/devices/weight`
bool send_weight_measurement(float weight, int raw_measure, bool *need_calibration, unsigned int *dt_pin, unsigned int *sck_pin, int *offset, float *scale);

// Calls the `POST /api/devices/action` API
typedef enum
{
    ACTION_STANDBY,
    ACTION_PUMP,
    ACTION_COMPLETED,
    ACTION_ERROR
} action_type_t;

typedef struct
{
    action_type_t type;
    union
    {
        struct
        {
            int idle_ms;
        } standby;
        struct
        {
            char order_id[64];
            char dose_id[64];
            int pump_gpio;
            float dose_weight;
            float dose_weight_progress;
        } pump;
        struct
        {
            char order_id[64];
            char message[256];
        } completed;
    } data;
} device_action_t;

bool ask_server_for_action(device_action_t *action);

// Function to report progress on a dose being poured at `POST /api/devices/progress`
bool report_progress(const char *order_id, const char *dose_id, float weight_progress, bool *should_continue, char *message, size_t message_size);

// Function to report an error during order processing at `POST /api/devices/error`
bool report_error(const char *order_id, error_code_t error_code, const char *message);

// Function to cancel an in-progress order at `POST /api/devices/cancel/order`
bool cancel_order(const char *order_id);

#endif // API_H
