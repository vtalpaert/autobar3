# API Endpoints

The following API endpoints are available for device communication:

## Device Verification

- `POST /api/devices/verify`
  - Verifies device token and updates firmware version
  - Request: `{ "token": "device_api_token", "firmwareVersion": "1.0.0", "needsCalibration": true }`
  - Response: `{ "tokenValid": true, "message": "Hello from the server", "needCalibration": true }`
  - Note: `needsCalibration` is optional in request. If set to `true`, the device reports it needs calibration and the database will be updated. Response always includes server's calibration requirement status.

## Device Action

- `POST /api/devices/action`
  - Retrieves the next action for the device to perform
  - Request: `{ "token": "device_api_token" }`
  - Response:
    - If no order: `{ "action": "standby" }`
    - If order exists: `{ "action": "pour", "orderId": "id", "doseId": "id", "ingredientId": "id", "doseQuantity": 50.0, "doseProgress": 5.0 }`
    - If order completed: `{ "action": "completed", "orderId": "id", "message": "Order completed - drink ready for pickup" }`

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

## Weight Reporting

- `POST /api/devices/weight`
  - Reports current weight measurement and retrieves HX711 calibration data
  - Request: `{ "token": "device_api_token", "weightGrams": 125.5 }`
  - Response: `{ "needCalibration": true, "hx711Dt": 4, "hx711Sck": 5, "hx711Offset": -123456, "hx711Scale": 432.1 }`
  - Used by devices to get GPIO pins and calibration values for HX711 weight sensor
  - Device should use formula: `weight = scale * (raw - offset)` to convert raw readings to grams

## Real-time Order Updates

- `GET /api/sse/my-bar`
  - Server-Sent Events stream for real-time order progress updates
  - Requires user authentication
  - Returns: Stream of JSON data with active orders for the authenticated user
  - Response format: `data: { "activeOrders": [...] }\n\n`
  - Updates every 2 seconds while there are active orders
  - Automatically closes when no active orders remain
