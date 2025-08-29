#ifndef ACTION_H
#define ACTION_H

#include <stdbool.h>
#include "driver/gpio.h"

// Define the GPIO pin for the LED (GPIO 2 is common for onboard LEDs)
#define BLINK_GPIO 27

void init_gpio(gpio_num_t gpio_num);

void blink(gpio_num_t gpio_num);

bool handle_action(device_action_t *action);

#endif // ACTION_H
