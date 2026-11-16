import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GestureDetector,
  useTapGesture,
  type PanGesture,
} from 'react-native-gesture-handler';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  getMatchingSpeedPreset,
  getSpeedPresetLabel,
  type SpeedPresets,
} from '../controller';

interface SpeedPresetSelectorProps {
  presets: SpeedPresets;
  motor1Speed: number;
  motor2Speed: number;
  joystickGesture: PanGesture;
  onSelectSpeed: (value: number) => void;
}

interface SpeedPresetControlProps {
  accessibilityHint?: string;
  accessibilityLabel: string;
  accessibilityRole: 'button' | 'radio';
  accessibilityState?: AccessibilityState;
  children: ReactNode;
  joystickGesture: PanGesture;
  onActivate: () => void;
  style: StyleProp<ViewStyle>;
}

const SPEED_OPTIONS: Array<keyof SpeedPresets> = ['slow', 'medium', 'fast'];

function SpeedPresetControl({
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  children,
  joystickGesture,
  onActivate,
  style,
}: SpeedPresetControlProps) {
  const [isPressed, setIsPressed] = useState(false);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  const tapGesture = useTapGesture(
    useMemo(
      () => ({
        runOnJS: true,
        simultaneousWith: joystickGesture,
        onBegin: () => setIsPressed(true),
        onActivate: () => onActivateRef.current(),
        onFinalize: () => setIsPressed(false),
      }),
      [joystickGesture],
    ),
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        accessible
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        onAccessibilityTap={() => onActivateRef.current()}
        style={[style, isPressed && styles.pressed]}
      >
        {children}
      </View>
    </GestureDetector>
  );
}

export function SpeedPresetSelector({
  presets,
  motor1Speed,
  motor2Speed,
  joystickGesture,
  onSelectSpeed,
}: SpeedPresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPreset = getMatchingSpeedPreset(motor1Speed, motor2Speed, presets);
  const selectedLabel = getSpeedPresetLabel(selectedPreset);

  return (
    <View style={styles.root}>
      <SpeedPresetControl
        accessibilityHint="Opens speed preset choices"
        accessibilityLabel={`Tốc độ: ${selectedLabel}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        joystickGesture={joystickGesture}
        onActivate={() => setIsOpen((open) => !open)}
        style={[
          styles.chip,
          isOpen && styles.chipOpen,
        ]}
      >
        <Text numberOfLines={1} style={styles.chipText}>
          {selectedLabel.toUpperCase()}
        </Text>
      </SpeedPresetControl>

      {isOpen ? (
        <View accessibilityRole="radiogroup" style={styles.popover}>
          {SPEED_OPTIONS.map((key) => {
            const label = getSpeedPresetLabel(key);
            const isSelected = key === selectedPreset;
            return (
              <SpeedPresetControl
                key={key}
                accessibilityLabel={`${label}, ${presets[key]} PWM`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                joystickGesture={joystickGesture}
                onActivate={() => {
                  onSelectSpeed(presets[key]);
                  setIsOpen(false);
                }}
                style={[
                  styles.option,
                  isSelected && styles.selectedOption,
                ]}
              >
                <Text style={[styles.optionLabel, isSelected && styles.selectedText]}>
                  {label}
                </Text>
                <Text style={[styles.optionValue, isSelected && styles.selectedText]}>
                  {presets[key]}
                </Text>
              </SpeedPresetControl>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    zIndex: 20,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 8,
    width: 88,
  },
  chipOpen: {
    backgroundColor: '#0b476b',
  },
  chipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  popover: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    elevation: 12,
    gap: 4,
    minWidth: 148,
    padding: 6,
    position: 'absolute',
    right: 0,
    top: 40,
    zIndex: 30,
  },
  option: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  selectedOption: {
    backgroundColor: '#fff7ed',
    borderColor: '#f47518',
  },
  optionLabel: {
    color: '#06324d',
    fontSize: 12,
    fontWeight: '700',
  },
  optionValue: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
  },
  selectedText: {
    color: '#c2410c',
  },
  pressed: {
    opacity: 0.75,
  },
});
