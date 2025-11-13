# RobotCocktail

A web platform and hardware solution for automated cocktail mixing machines.

![home page](docs/screenshot_home_page.png)

## Overview

RobotCocktail is a modern reimagining of the [Autobar v1 project](https://github.com/vtalpaert/autobar). While the original project used Django and Raspberry Pi, this new version brings several key improvements:

- Modern web interface built with SvelteKit and Tailwind CSS
- User authentication and management
- Support for multiple hardware implementations (ESP32, Raspberry Pi)
- Over-the-air (OTA) updates for connected devices
- RESTful API for device communication

## Image gallery

### With some debug data

![My Cocktails (debug data)](docs/screenshot_mycocktails_debug_data.png)
![My Bar (debug data)](docs/screenshot_mybar_debug_data.png)

### Device configuration and calibration

![Device configuration](docs/screenshot_configure_device.png)
![Device calibration (stale data)](docs/screenshot_calibration_stale.png)

## Components

The project consists of two main parts:

1. **Web Platform**

    - User authentication and management
    - Cocktail recipe database with ingredients and doses management
    - Device management interface
    - [API endpoints](docs/api.md) for device communication
    - Cocktail creation and editing with ingredient doses
    - Artist collaboration system for joint cocktail creation
    - Order management system for cocktail preparation
    - Device simulator for testing order processing without physical hardware

2. **Hardware Implementation**
    - ESP32-based cocktail mixing machine (primary target)
    - Support for legacy Raspberry Pi implementation (todo)
    - Automated OTA updates
    - Weight-based pour measurement
    - Multiple pump control

### ESP32 configuration using the access point

Using the Devices page, use "Flash New Device" and then "Enroll via WiFi" for instructions. The ESP32 will start an access point wifi network to configure the device.

![access point](docs/screenshot_access_point.png)

The server URL field allows you to self host the main server !

## Getting started with Docker

If you have docker installed, you might prefer to run the project for a quick demo

### Preview

```bash
docker build -t autobar3:preview -f dockerfiles/Dockerfile.preview .
docker run --rm -it autobar3:preview
```

The admin authentication is in `.env.example`. You may change the values before building the image.

Building the image will take care of creating the SSL certificates and build the firmware for you.

> The database is overwritten with each build !

### Production

Create initial database or [migrate](https://orm.drizzle.team/docs/migrations) :

```bash
# Generate an image with the initial database and the development tools (drizzle-kit) to migrate the SQLite database
docker build --target production-database -t autobar3:prod-db -f dockerfiles/Dockerfile.prod .

# Mount local data folder
mkdir -p ./data
docker run --rm --mount type=bind,src=./data,dst=/data -it autobar3:prod-db
```

Start production server :

```bash
docker build -t autobar3:prod -f dockerfiles/Dockerfile.prod .
docker run --rm --env-file .env.prod.example -p 3000:3000 --mount type=bind,src=./data,dst=/data -it autobar3:prod
```

## Local development

### Certificates

First, generate SSL certificates for local development:

```bash
./scripts/generate_dev_certificates.sh
```

This script generates:

- Self-signed certificates for HTTPS development server
- The corresponding PEM file is built into the ESP32 firmware so that the device may trust the server using HTTPS

> These certificates are for development only and should not be used in production

### Develop the firmware

The firmware is built locally into the `static/firmware` folder so that user may flash their device the first time via the webpage.

#### Using the ESP-IDF plugin VS Code

The following dependencies are required

```bash
sudo apt-get install git wget flex bison gperf python3 python3-pip python3-venv cmake ninja-build ccache libffi-dev libssl-dev dfu-util libusb-1.0-0
```

Install the ESP-IDF plugin and configure the extension. Version v5.3.2 is the only one tested for now.
The `CMakeLists.txt` includes commands to copy the firmware binaries to the static folder.

#### Using docker

(TODO) VS Code devcontainer or pure docker command

> Hint: use [this Dockerfile](dockerfiles/Dockerfile.preview) as a base

### Web

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The development server will run with HTTPS using the generated self-signed certificates.

> Note: For production deployment, replace the development certificates with proper SSL certificates from a trusted Certificate Authority

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and contribution process.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
