# Contributing to RobotCocktail

Thank you for your interest in contributing to RobotCocktail! This document provides guidelines and information for contributors.

## Project Structure

```
/
├── src/                    # Source code
│   ├── lib/               # Shared libraries and components
│   │   ├── components/    # Reusable Svelte components
│   │   ├── i18n/         # Internationalization
│   │   └── server/       # Server-side code
│   │       ├── auth/     # Authentication logic
│   │       └── db/       # Database schema and queries
│   └── routes/           # SvelteKit routes
│       ├── admin/        # Admin panel
│       │   ├── orders/   # Order management
│       │   └── ...       # Other admin sections
│       ├── api/          # API endpoints
│       │   └── devices/  # Device API endpoints
│       ├── auth/         # Authentication pages
│       ├── bar/          # My Bar page for orders
│       ├── cocktails/    # Cocktail management with ingredients and doses
│       ├── collaborations/ # Artist collaboration system
│       ├── devices/      # Device management
│       └── profile/      # User profile pages
├── static/               # Static assets
│   └── firmware/        # Device firmware files
├── drizzle.config.ts    # Database configuration
├── svelte.config.js     # SvelteKit configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── vite.config.ts       # Vite bundler configuration
```

## Coding Conventions

### General

- Use clear, descriptive names for variables, functions, and classes
- Write self-documenting code with appropriate comments
- Follow language-specific style guides

### Web Platform

- Follow Tailwind CSS best practices
- Use functional components
- Implement responsive design
- Write unit tests for components

### Hardware

- Document pin configurations
- Include wiring diagrams for new features
- Test hardware changes thoroughly
- Support OTA update capability

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit PR with clear description

## Development Setup

Instructions for setting up development environment coming soon.

## API Endpoints

The following API endpoints are available for device communication:

### Device Verification

- `POST /api/devices/verify`
  - Verifies device token and updates firmware version
  - Request: `{ "token": "device_api_token", "firmwareVersion": "1.0.0" }`
  - Response: `{ "tokenValid": true, "message": "Hello from the server" }`

### Device Action

- `POST /api/devices/action`
  - Retrieves the next action for the device to perform
  - Request: `{ "token": "device_api_token" }`
  - Response:
    - If no order: `{ "action": "standby" }`
    - If order exists: `{ "action": "pour", "orderId": "id", "doseId": "id", "ingredientId": "id", "quantity": 45.0 }`

### Progress Reporting

- `POST /api/devices/progress`
  - Reports progress on a dose being poured
  - Request: `{ "token": "device_api_token", "orderId": "id", "doseId": "id", "progress": 25.5 }`
  - Response:
    - Normal: `{ "success": true, "message": "Progress updated", "continue": true }`
    - If cancelled: `{ "success": true, "message": "Order cancelled", "continue": false }`

### Error Reporting

- `POST /api/devices/error`
  - Reports an error during order processing
  - Request: `{ "token": "device_api_token", "orderId": "id", "message": "Error description" }`
  - Response: `{ "success": true, "message": "Error recorded" }`

### Order Cancellation

- `POST /api/orders/cancel`
  - Cancels an in-progress order
  - Request: `{ "orderId": "id" }`
  - Response: `{ "success": true, "message": "Order cancelled" }`

## Questions?

Feel free to open an issue for any questions or concerns.
