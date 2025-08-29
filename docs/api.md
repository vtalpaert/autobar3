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
    - If no order: `{ "action": "standby", "idle": 30000 }` where idle is a time in milliseconds for the device to wait before asking the next action again
    - If a dose exists requiring a pump: `{ "action": "pump", "orderId": "id", "doseId": "id", "pumpGpio": 12, "doseWeight": 50.0, "doseWeightProgress": 5.0 }`
    - If order completed: `{ "action": "completed", "orderId": "id", "message": "Order completed - drink ready for pickup" }` which is used for eventual display if a screen exists. Suppose the device asks once more for action to perform right after.

## Progress Reporting

- `POST /api/devices/progress`
  - Reports progress on a dose being poured
  - Request: `{ "token": "device_api_token", "orderId": "id", "doseId": "id", "weightProgress": 25.5 }`
  - Response:
    - Normal: `{ "message": "Progress updated", "continue": true }`, though continue will be false if the dose is complete
    - If cancelled: `{ "message": "Order cancelled", "continue": false }`

## Error Reporting

- `POST /api/devices/error`
  - Reports an error during order processing
  - Request: `{ "token": "device_api_token", "orderId": "id", "errorCode": 2, "message": "Error description" }`
  - Response: `{ "message": "Error recorded" }`
  - Error codes:
    - `0`: Unknown error code
    - `1`: General/unknown error
    - `2`: Weight scale error
    - `3`: No weight change (malfunctioning pump or empty liquid reservoir)
    - `4`: Negative weight change (weight decreased below initial weight)
    - `5`: Unable to report progress (API call not working)

## Order Cancellation

- `POST /api/devices/cancel/order`
  - Cancels an in-progress order
  - Request: `{ "token": "device_api_token", "orderId": "id" }`
  - Response: `{ "success": true, "message": "Order cancelled" }`

## Weight Reporting

- `POST /api/devices/weight`
  - Reports current weight measurement and retrieves HX711 calibration data
  - Request: `{ "token": "device_api_token", "weight": 125.5, "rawMeasure": -123456 }`
  - Response: `{ "needCalibration": true, "hx711Dt": 4, "hx711Sck": 5, "hx711Offset": -123456, "hx711Scale": 432.1 }`
  - Used by devices to get GPIO pins and calibration values for HX711 weight sensor
  - Device should use formula: `weight = scale * (raw - offset)` to convert raw readings to grams
  - Weight measurements are stored in memory for real-time calibration interface

## Weight Calibration

- `GET /api/sse/calibration/[deviceId]`
  - Server-Sent Events stream for real-time weight readings during calibration
  - Requires user authentication and device ownership
  - Returns: Stream of JSON data with current weight measurements
  - Response format: `data: { "weight": 125.5, "rawMeasure": -123456 }`
  - Updates every 1 second during calibration process
  - Used by calibration interface for live weight display

## Real-time Order Updates

- `GET /api/sse/my-bar`
  - Server-Sent Events stream for real-time order progress updates
  - Requires user authentication
  - Returns: Stream of JSON data with active orders for the authenticated user
  - Response format: `data: { "activeOrders": [...] }`
  - Updates every 2 seconds while there are active orders
  - Automatically closes when no active orders remain
