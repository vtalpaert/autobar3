# API Endpoints

The following API endpoints are available for device communication:

## Device Verification

- `POST /api/devices/verify`
  - Verifies device token and updates firmware version
  - Request: `{ "token": "device_api_token", "firmwareVersion": "1.0.0" }`
  - Response: `{ "tokenValid": true, "message": "Hello from the server" }`

## Device Action

- `POST /api/devices/action`
  - Retrieves the next action for the device to perform
  - Request: `{ "token": "device_api_token" }`
  - Response:
    - If no order: `{ "action": "standby" }`
    - If order exists: `{ "action": "pour", "orderId": "id", "doseId": "id", "ingredientId": "id", "doseQuantity": 50.0, "doseProgress": 5.0 }`

## Progress Reporting

- `POST /api/devices/progress`
  - Reports progress on a dose being poured
  - Request: `{ "token": "device_api_token", "orderId": "id", "doseId": "id", "progress": 25.5 }`
  - Response:
    - Normal: `{ "message": "Progress updated", "continue": true }`, though continue will be false if the dose is complete
    - If cancelled: `{ "message": "Order cancelled", "continue": false }`

## Error Reporting

- `POST /api/devices/error`
  - Reports an error during order processing
  - Request: `{ "token": "device_api_token", "orderId": "id", "message": "Error description" }`
  - Response: `{ "message": "Error recorded" }`

## Order Cancellation

- `POST /api/devices/cancel/order`
  - Cancels an in-progress order
  - Request: `{ "token": "device_api_token", "orderId": "id" }`
  - Response: `{ "success": true, "message": "Order cancelled" }`

## Real-time Order Updates

- `GET /api/my-bar/orders/stream`
  - Server-Sent Events stream for real-time order progress updates
  - Requires user authentication
  - Returns: Stream of JSON data with active orders for the authenticated user
  - Response format: `data: { "activeOrders": [...] }\n\n`
  - Updates every 2 seconds while there are active orders
  - Automatically closes when no active orders remain
