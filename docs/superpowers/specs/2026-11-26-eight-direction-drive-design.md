# Eight-direction drive design

## Intent and goals

Make joystick movement match the ESP32's discrete drive behavior: all wheel types choose the nearest of eight directions (four cardinal and four diagonal) and use the selected speed level at full strength. Omni/Mecanum retain their separate rotate-left/right controls. Remove web-side soft acceleration and its settings UI so direction and stop commands take effect immediately.

## Non-goals and constraints

- Keep the joystick's existing deadzone, speed presets, speed limit, BLE protocol, and motor controls.
- Do not change the separate rotate controls for Omni/Mecanum.
- Existing local settings may still contain `softAccelMs`; it will be ignored when normalized.

## Approaches

- Snap Standard only; preserve analog Omni/Mecanum movement. This matches the initial interpretation but not the requested all-wheel behavior.
- Snap every wheel type to the nearest 45-degree direction. This matches the clarified request and retains existing separate rotation controls for Omni/Mecanum. **Selected.**
- Keep analog joystick movement for every wheel type and only remove soft acceleration. This would not match the ESP32's discrete direction behavior.

## Design

Quantize the normalized joystick direction to the nearest of eight evenly spaced angles; directions exactly between sectors resolve consistently to one adjacent sector. A non-neutral joystick therefore produces a cardinal vector `(±100, 0)` / `(0, ±100)` or a diagonal vector `(±100, ±100)` for the control packet. The selected speed preset remains the source of the full drive speed, with existing speed caps preserved. Neutral input remains zero. Omni/Mecanum rotate buttons continue to send their existing rotation signal independently.

Remove the soft-acceleration control from the Motor settings page and remove ramping from `ControlLoop`, making non-neutral and neutral x/y output immediate. Remove the obsolete soft-acceleration property from the active drive-profile model while tolerating old persisted objects through the existing normalizer.

## Verification

Add focused tests for cardinal/diagonal snapping, angle boundaries, neutral input, all wheel types, and immediate ControlLoop outputs. Run the web test suite and typecheck.
