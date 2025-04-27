# API Endpoints

The following API endpoints are available for device communication:

## Device Verification

- `POST /api/devices/verify`
  - Verifies device token and updates firmware version
  - Request: `{ "token": "device_api_token", "firmwareVersion": "1.0.0" }`
  - Response: `{ "tokenValid": true, "message": "Hello from the server" }`

## Device Action

- `GET /api/devices/action`
  - Retrieves the next action for the device to perform
  - Request: Query parameter `token=device_api_token`
  - Response:
    - If no order: `{ "action": "standby" }`
    - If order exists: `{ "action": "pour", "orderId": "id", "doseId": "id", "ingredientId": "id", "quantity": 45.0 }`

## Progress Reporting

- `POST /api/devices/progress`
  - Reports progress on a dose being poured
  - Request: `{ "token": "device_api_token", "orderId": "id", "doseId": "id", "progress": 25.5 }`
  - Response:
    - Normal: `{ "success": true, "message": "Progress updated", "continue": true }`
    - If cancelled: `{ "success": true, "message": "Order cancelled", "continue": false }`

## Error Reporting

- `POST /api/devices/error`
  - Reports an error during order processing
  - Request: `{ "token": "device_api_token", "orderId": "id", "message": "Error description" }`
  - Response: `{ "success": true, "message": "Error recorded" }`

## Order Cancellation

- `POST /api/orders/cancel`
  - Cancels an in-progress order
  - Request: `{ "orderId": "id" }`
  - Response: `{ "success": true, "message": "Order cancelled" }`
