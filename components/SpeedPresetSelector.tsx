import { useMemo, useState } from 'react';
import {
  GestureDetector,
  useTapGesture,
  type PanGesture,
} from 'react-native-gesture-handler';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityState,
} from 'react-native';
import {
  SPEED_LEVELS,
  SPEED_LEVEL_LABELS,
  type SpeedLevel,
} from '../drive';

interface SpeedPresetSelectorProps {
  level: SpeedLevel;
  ready: boolean;
  joystickGesture: PanGesture;
  onSelectLevel: (level: SpeedLevel) => void;
}

function LevelButton({
  label,
  selected = false,
  disabled = false,
  accessibilityState,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  accessibilityState?: AccessibilityState;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ ...accessibilityState, selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.selectedOption,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.optionText, selected && styles.selectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SpeedPresetSelector({
  level,
  ready,
  joystickGesture,
  onSelectLevel,
}: SpeedPresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tapGesture = useTapGesture(
    useMemo(
      () => ({
        runOnJS: true,
        simultaneousWith: joystickGesture,
        onActivate: () => {
          if (ready) setIsOpen((open) => !open);
        },
      }),
      [joystickGesture, ready],
    ),
  );
  const otherLevels = SPEED_LEVELS.filter((item) => item !== level);

  return (
    <View style={styles.root}>
      <GestureDetector gesture={tapGesture}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Mức tốc độ: ${SPEED_LEVEL_LABELS[level]}`}
          accessibilityHint="Chạm để đổi mức tốc độ khi xe đang chạy"
          accessibilityState={{ expanded: isOpen, disabled: !ready }}
          onAccessibilityTap={() => ready && setIsOpen((open) => !open)}
          style={[styles.currentLevel, !ready && styles.disabled]}
        >
          <Text style={styles.currentLabel}>{SPEED_LEVEL_LABELS[level]}</Text>
          <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
        </View>
      </GestureDetector>

      {isOpen ? (
        <View style={styles.menu}>
          {otherLevels.map((item) => (
            <LevelButton
              key={item}
              label={SPEED_LEVEL_LABELS[item]}
              disabled={!ready}
              onPress={() => {
                onSelectLevel(item);
                setIsOpen(false);
              }}
            />
          ))}
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
  currentLevel: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 36,
    justifyContent: 'center',
    minWidth: 100,
    paddingHorizontal: 10,
  },
  currentLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  chevron: {
    color: '#f47518',
    fontSize: 9,
  },
  menu: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 9,
    borderWidth: 1,
    elevation: 12,
    gap: 4,
    minWidth: 120,
    padding: 5,
    position: 'absolute',
    right: 0,
    top: 42,
    zIndex: 30,
  },
  option: {
    alignItems: 'center',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  selectedOption: {
    backgroundColor: '#fff7ed',
  },
  optionText: {
    color: '#06324d',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedText: {
    color: '#c2410c',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
