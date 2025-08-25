#ifndef API_H
#define API_H

#include <stdbool.h>

// Function to verify device with the server
bool verify_device(void);

// Function to fetch manifest from server and return version
char* fetch_manifest(void);

#endif // API_H
