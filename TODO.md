# RobotCocktail Order System Implementation Plan

## Phase 1: Database Schema and Core Functionality

[DONE]

## Phase 2: User Interface - My Bar Page

[DONE]

## Phase 3: Admin Testing Interface

### 1. Create Device Simulator Admin Page

- Create admin page for simulating device behavior
- Add interface to view pending orders for simulation
- Implement controls to simulate pouring doses
- Add ability to simulate errors and interruptions

### 2. Enhance Admin Dashboard

- Add orders section to admin dashboard
- Create interface for monitoring all active orders
- Add ability to cancel or modify orders

## Phase 4: Order Processing Logic

### 1. Create Order Processing Service

- Implement logic to process orders sequentially
- Fix error when reporting progress on a different order seems to progress the current order
- Add functionality to track dose progress
- Implement error handling for failed pours

### 2. Device Communication

- Create polling mechanism for devices to check for pending orders
- Implement order status updates from devices
- Add timeout detection for unresponsive devices

## Phase 5: Enhanced User Experience

### 1. Real-time Updates

- Implement server-sent events or WebSockets for real-time order updates
- Add animations for order progress

### 2. Error Recovery

- Create user interface for handling common errors
- Implement retry mechanisms for failed pours
- Add notifications for user intervention (e.g., empty ingredient)

## Implementation Order

1. DONE: Database schema changes (Order table, Device updates)
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

- Add dropdown selection for devices when user has multiple devices
- Add possibility for multiple Profile to use same device. For example there is an owner profile, but you may grant permission to some users to use your device
- Separate cooperation logic in cocktail recipes sharing and device sharing
- Add a device configuration page for users, where they can explicitly tell which ingredients are available for the device
- Add an action during the Order logic to notify an ingredient is not present (such as empty bottle). This could be suggested by the device itself if it notices that no liquid is pouring through the pump because the weight scale does not change
- Recover from errors and pursue an order
- Add verification logic for glass detection by weight
- Add device calibration page for the weight scale (offset and factor to convert from integer readings to real grams) and API endpoint for the device to fetch this information on startup
