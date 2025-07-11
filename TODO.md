# RobotCocktail Implementation Plan

## Phase 1: Privacy-Friendly Cocktail Images

### 1. Database Schema Updates

- Add `imageUrl` field to the `cocktail` table
- Update database migration scripts

### 2. File Storage System

- Create secure `/uploads/cocktails/` directory outside web root
- Implement file upload handling with UUID-based filenames
- Add image validation (file types, size limits)
- Implement server-side image resizing/optimization

### 3. Access Control for Images

- Create protected image serving endpoint: `/api/cocktails/[id]/image`
- Implement permission checking (creator or accepted collaborator)
- Ensure images are only accessible through protected endpoint

### 4. Frontend Image Support

- Add image upload UI to cocktail creation/editing forms
- Update cocktail display components to show images
- Handle loading states and fallbacks for missing images
- Add image preview functionality

## Phase 2: Enhanced Order Processing and User Experience

### 1. Device Communication

- Create polling mechanism for devices to check for pending orders
- Implement order status updates from devices
- Add timeout detection for unresponsive devices

### 2. Error Recovery

- Create user interface for handling common errors
- Implement retry mechanisms for failed pours
- Add notifications for user intervention (e.g., empty ingredient)

## Later changes (out of scope for now)

- Add dropdown selection for devices when user has multiple devices
- Add possibility for multiple Profile to use same device. For example there is an owner profile, but you may grant permission to some users to use your device
- Separate cooperation logic in cocktail recipes sharing and device sharing
- Add a device configuration page for users, where they can explicitly tell which ingredients are available for the device
- Add an action during the Order logic to notify an ingredient is not present (such as empty bottle). This could be suggested by the device itself if it notices that no liquid is pouring through the pump because the weight scale does not change
- Recover from errors and pursue an order
- Add verification logic for glass detection by weight
- Add device calibration page for the weight scale (offset and factor to convert from integer readings to real grams) and API endpoint for the device to fetch this information on startup
