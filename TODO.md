# RobotCocktail Implementation Plan

## Phase 1: Device Capabilities and Order Validation

### 1. Core Device Capability Functions

#### 1.1 Device Ingredient Analysis
- **Function**: `getDeviceAvailableIngredients(deviceId: string)`
  - Query all pumps for the device that are not empty and have valid GPIO pins
  - Return list of available ingredients with pump information
  - Cache results to reduce database load
  - Invalidate cache when pump status changes (isEmpty field updates)

#### 1.2 Cocktail Feasibility Check
- **Function**: `canDeviceMakeCocktail(deviceId: string, cocktailId: string)`
  - Get all doses required for the cocktail
  - Check if device has pumps for each required ingredient (excluding addedSeparately)
  - Return detailed result: canMake boolean, missingIngredients array, availablePumps mapping
  - Handle edge cases: no pumps configured, all pumps empty for required ingredient

#### 1.3 Available Cocktails Filtering
- **Function**: `getAvailableCocktailsForDevice(deviceId: string)`
  - Get all cocktails from database
  - Filter out cocktails that cannot be made by the device
  - Preserve cocktails that only miss addedSeparately ingredients
  - Return filtered list with feasibility metadata
  - Optimize with single database query and in-memory filtering

### 2. Pump Assignment Logic

#### 2.1 Dose-to-Pump Mapping
- **Function**: `findPumpForDose(deviceId: string, doseId: string)`
  - Given a specific dose, find the appropriate pump
  - Selection criteria: not empty + valid GPIO + correct ingredient
  - Priority system: use first available pump (TODO: improve priority logic later)
  - Handle case where no pump is available (ingredient went empty during order)

#### 2.2 Complete Order Mapping
- **Function**: `getPumpMappingForCocktail(deviceId: string, cocktailId: string)`
  - Create complete mapping of all doses to their assigned pumps
  - Validate that all required doses can be fulfilled
  - Return mapping or error if any dose cannot be assigned
  - Use this during order creation and execution

### 3. Integration Points

#### 3.1 Order Creation Validation
- Before creating an order, validate cocktail feasibility with user's default device
- Immediately reject impossible orders with clear error messages
- Show warnings for addedSeparately ingredients with instructions

#### 3.2 API Action Endpoint Enhancement
- When device asks for next action, use pump assignment logic
- Return specific GPIO pin and duration for pump actions
- Handle cases where assigned pump became unavailable since order creation

#### 3.3 UI Cocktail Display
- Filter cocktail lists to show only makeable cocktails by default
- Add toggle to show all cocktails with feasibility indicators
- Display missing ingredients and manual addition requirements
- Show cocktail instructions prominently for addedSeparately ingredients

### 4. Database Optimization

#### 4.1 Required Indexes
- Add index on `pump.deviceId` and `pump.ingredientId` for fast lookups
- Add index on `device.profileId` and `device.isDefault` for default device queries
- Add index on `dose.cocktailId` and `dose.ingredientId` for cocktail analysis

#### 4.2 Query Optimization
- Use JOIN queries to fetch device pumps with ingredients in single query
- Batch cocktail feasibility checks where possible
- Cache device capability data with appropriate invalidation

### 5. Caching Strategy

#### 5.1 Cache Keys and Data
- Cache device available ingredients: `device_ingredients_{deviceId}`
- Cache cocktail feasibility: `cocktail_feasible_{deviceId}_{cocktailId}`
- Cache available cocktails list: `available_cocktails_{deviceId}`

#### 5.2 Cache Invalidation
- Invalidate when pump isEmpty status changes
- Invalidate when pump ingredient assignments change
- Invalidate when new pumps are added/removed from device
- No real-time SSE updates - rely on page refresh/navigation

### 6. Error Handling and Edge Cases

#### 6.1 Missing Default Device
- Handle profiles without default device set
- Provide clear error messages and guidance to set up device
- Graceful degradation: show all cocktails with "device required" message

#### 6.2 Empty Pump Detection
- When device reports pump is empty, update database immediately
- Invalidate relevant caches
- Handle ongoing orders: allow device to report error and cancel order

#### 6.3 Configuration Errors
- Handle pumps without GPIO pins (configuration incomplete)
- Handle pumps without assigned ingredients
- Provide clear feedback in device management UI

### 7. Future Considerations (Notes for Later)

#### 7.1 Multiple Device Support
- Extend functions to work with device selection instead of just default
- Add device availability checking (online/offline status)
- Consider device capabilities comparison for optimal selection

#### 7.2 Advanced Pump Priority
- Implement smart pump selection based on:
  - Pump usage history (wear leveling)
  - Ingredient quantity remaining
  - Pump performance characteristics
  - User preferences

#### 7.3 Ingredient Quantity Tracking
- Track remaining volume in each pump
- Predict when pumps will run empty
- Suggest ingredient refill scheduling

#### 7.4 Real-time Device Status
- Add device online/offline detection
- Implement heartbeat mechanism
- Real-time pump status updates via SSE (if needed)

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
- Add an action during the Order logic to notify an ingredient is not present (such as empty bottle). This could be suggested by the device itself if it notices that no liquid is pouring through the pump because the weight scale does not change
- Recover from errors and pursue an order
- Add verification logic for glass detection by weight
- Add user image cropping like https://saabi.github.io/svelte-image-input/
