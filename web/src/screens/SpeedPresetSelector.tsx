import { type SpeedLevel } from '../drive/driveModel';
import { Pressable, Text, View, type Style } from '../ui/rn';

export const SPEED_STATE_OPTIONS: { level: SpeedLevel; label: string }[] = [
  { level: 'slow', label: 'STATE 1' },
  { level: 'medium', label: 'STATE 2' },
  { level: 'fast', label: 'STATE 3' },
];

export function SpeedPresetSelector({
  level,
  ready,
  onSelectLevel,
}: {
  level: SpeedLevel;
  ready: boolean;
  onSelectLevel: (l: SpeedLevel) => void;
}) {
  return (
    <View style={s.root}>
      {SPEED_STATE_OPTIONS.map((option) => (
        <Pressable
          key={option.level}
          label={`Chọn ${option.label}`}
          disabled={!ready}
          selected={level === option.level}
          onPress={() => ready && onSelectLevel(option.level)}
          style={[s.option, level === option.level && s.optionActive, !ready && s.disabled]}
        >
          <Text style={[s.optionText, level === option.level && s.optionTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s: Record<string, Style> = {
  root: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
    height: 44,
    padding: 5,
    zIndex: 20,
  },
  option: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, justifyContent: 'center', minHeight: 34, minWidth: 82, paddingLeft: 8, paddingRight: 8 },
  optionActive: { backgroundColor: '#f47518', borderColor: '#f47518' },
  optionText: { color: '#06324d', fontSize: 12, fontWeight: 900 },
  optionTextActive: { color: '#fff' },
  disabled: { opacity: 0.5 },
};
