# RobotCocktail

A web platform and hardware solution for automated cocktail mixing machines.

## Overview

RobotCocktail is a modern reimagining of the [Autobar v1 project](https://github.com/vtalpaert/autobar). While the original project used Django and Raspberry Pi, this new version brings several key improvements:

- Modern web interface built with SvelteKit and Tailwind CSS
- User authentication and management
- Support for multiple hardware implementations (ESP32, Raspberry Pi)
- Over-the-air (OTA) updates for connected devices
- RESTful API for device communication

## Components

The project consists of two main parts:

1. **Web Platform**
   - User authentication and management
   - Cocktail recipe database
   - Device management interface
   - API endpoints for device communication

2. **Hardware Implementation**
   - ESP32-based cocktail mixing machine (primary target)
   - Support for legacy Raspberry Pi implementation
   - Automated OTA updates
   - Weight-based pour measurement
   - Multiple pump control

## Getting Started

Documentation for setup and usage coming soon.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and contribution process.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
