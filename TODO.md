# RobotCocktail Order System Implementation Plan

## Phase 1: Database Schema and Core Functionality

### 1. Create Order Table Schema

- Add Order table to schema.ts with the following fields:
  - id (primary key)
  - createdAt (timestamp)
  - updatedAt (timestamp)
  - customerId (references profile.id)
  - deviceId (references device.id)
  - cocktailId (references cocktail.id)
  - currentDoseId (references dose.id, nullable)
  - doseProgress (real, amount poured of current dose in ml)
  - status (enum: 'pending', 'in_progress', 'completed', 'failed', 'cancelled')
  - errorMessage (text, nullable)
- Create the corresponding admin page

> The status is deduced by interaction with the device. If the device has fetch the order at least once, then the status moves to in_progress. If the quantity reported in doseProgress is equal to the dose, then we update the currentDoseId to the next one and so on

### 2. Update Device Schema

- Add lastPingAt field to device table (timestamp)
- Add a human friendly name field to device table (text, nullable)
- Update the admin page

> The device being online is deduced from the lastPingAt

### 3. Create API Endpoints for Device Communication

- Create endpoint for devices to ask the action it should be doing: `POST /api/devices/action`
  - Request: `{ "token": "device_api_token" }`
  - Response:
    - If no order: `{ "action": "standby" }`
    - If order exists: `{ "action": "pour", "orderId": "id", "doseId": "id", "ingredientId": "id", "quantity": 45.0 }`
- Create endpoint for devices to report dose progress: `POST /api/devices/progress`
  - Request: `{ "token": "device_api_token", "orderId": "id", "doseId": "id", "progress": 25.5 }`
  - Response:
    - Normal: `{ "success": true, "message": "Progress updated", "continue": true }`
    - If cancelled: `{ "success": true, "message": "Order cancelled", "continue": false }`
- Create endpoint for devices to report errors: `POST /api/devices/error`
  - Request: `{ "token": "device_api_token", "orderId": "id", "message": "Error description" }`
  - Response: `{ "success": true, "message": "Error recorded" }`
- Existing endpoint for device verification: `POST /api/devices/verify`
  - Request: `{ "token": "device_api_token", "firmwareVersion": "1.0.0" }`
  - Response: `{ "tokenValid": true, "message": "Hello from the server" }`

## Phase 2: User Interface - My Bar Page

### 1. Create My Bar Page

- Create +page.server.ts to fetch current user's orders and devices
- Create +page.svelte with UI for displaying orders and devices
- Add status indicators for devices (online/offline)
- Display current order status if one exists
- Show history of past orders

### 2. Update Header Component

- Add "My Bar" link to the header navigation
- Update dropdown menu to include My Bar

### 3. Add Order Button to Cocktails

- Update cocktail detail page to include "Order" button
- Add form action to create a new order
- Add logic to select default device or prompt user to select one. If only one device for the user, it should always be this device. Use the human friendly name if it exists, or use id

### 4. Add Cancel Order Functionality

- Add a "Cancel" button on the My Bar page for in-progress orders
- Create endpoint for cancelling orders: `POST /api/orders/cancel`
- Update order status to 'cancelled' when user cancels an order
- Ensure device stops pouring when next progress update is received

### 4. Add a rename field in My Devices

- Add a field to rename the device with a human friendly name

## Phase 3: Order Processing Logic

### 1. Create Order Processing Service

- Implement logic to process orders sequentially
- Add functionality to track dose progress
- Implement error handling for failed pours

### 2. Device Communication

- Create polling mechanism for devices to check for pending orders
- Implement order status updates from devices
- Add timeout detection for unresponsive devices

## Phase 4: Admin Testing Interface

### 1. Create Device Simulator Admin Page

- Create admin page for simulating device behavior
- Add interface to view pending orders for simulation
- Implement controls to simulate pouring doses
- Add ability to simulate errors and interruptions

### 2. Enhance Admin Dashboard

- Add orders section to admin dashboard
- Create interface for monitoring all active orders
- Add ability to cancel or modify orders

## Phase 5: Enhanced User Experience

### 1. Real-time Updates

- Implement server-sent events or WebSockets for real-time order updates
- Add animations for order progress

### 2. Error Recovery

- Create user interface for handling common errors
- Implement retry mechanisms for failed pours
- Add notifications for user intervention (e.g., empty ingredient)

### 3. Order Queue Management

- Implement order queuing for multiple orders on same device
- Add estimated wait time calculations
- Create interface for viewing and managing queue

## Implementation Order

1. Database schema changes (Order table, Device updates)
2. Basic My Bar page with order history
3. Header updates to include My Bar link
4. Order button on cocktail pages
5. Basic order creation and processing
6. Device simulator admin page
7. Real-time order status updates
8. Error handling and recovery
9. Order queue management
10. UI polish and animations

## Testing Milestones

1. Create and view orders in database
2. Display orders on My Bar page
3. Successfully create order from cocktail page
4. Simulate complete order process with admin simulator
5. Test error conditions and recovery
6. Test multiple queued orders
7. Verify real-time updates work correctly

## Later changes (out of scope for now)

- Add possibility for multiple Profile to use same device. For example there is an owner profile, but you may grant permission to some users to use your device
- Separate cooperation logic in cocktail recipes sharing and device sharing
- Add a device configuration page for users, where they can explicitly tell which ingredients are available for the device
- Add an action during the Order logic to notify an ingredient is not present (such as empty bottle). This could be suggested by the device itself if it notices that no liquid is pouring through the pump because the weight scale does not change
- Recover from errors and pursue an order
- Add verification logic for glass detection by weight
- Add device calibration page for the weight scale (offset and factor to convert from integer readings to real grams) and API endpoint for the device to fetch this information on startup
