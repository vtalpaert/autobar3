#ifndef API_H
#define API_H

#include <stdbool.h>
#include <stddef.h>

// Function to verify device with the server
bool verify_device(bool device_needs_calibration, bool *server_needs_calibration);

// Function to fetch manifest from server and return version in provided buffer
bool fetch_manifest(char *version_buffer, size_t buffer_size);

#endif // API_H
