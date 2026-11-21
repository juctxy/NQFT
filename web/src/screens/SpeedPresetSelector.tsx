import { useState } from 'react';
import { SPEED_LEVEL_LABELS, SPEED_LEVELS, type SpeedLevel } from '../drive/driveModel';
import { Pressable, Text, View, type Style } from '../ui/rn';

export function SpeedPresetSelector({
  level,
  ready,
  onSelectLevel,
}: {
  level: SpeedLevel;
  ready: boolean;
  onSelectLevel: (l: SpeedLevel) => void;
}) {
  const [open, setOpen] = useState(false);
  const others = SPEED_LEVELS.filter((l) => l !== level);
  return (
    <View style={s.root}>
      <Pressable
        label={`Mức tốc độ: ${SPEED_LEVEL_LABELS[level]}`}
        disabled={!ready}
        onPress={() => ready && setOpen((v) => !v)}
        style={[s.currentLevel, !ready && s.disabled]}
      >
        <Text style={s.currentLabel}>{SPEED_LEVEL_LABELS[level]}</Text>
        <Text style={s.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? (
        <View style={s.menu}>
          {others.map((l) => (
            <Pressable
              key={l}
              label={SPEED_LEVEL_LABELS[l]}
              disabled={!ready}
              onPress={() => {
                onSelectLevel(l);
                setOpen(false);
              }}
              style={({ pressed }) => [s.option, pressed && s.pressed, !ready && s.disabled]}
            >
              <Text style={s.optionText}>{SPEED_LEVEL_LABELS[l]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s: Record<string, Style> = {
  root: { position: 'relative', zIndex: 20 },
  currentLevel: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 36,
    justifyContent: 'center',
    minWidth: 100,
    paddingLeft: 10,
    paddingRight: 10,
  },
  currentLabel: { color: '#fff', fontSize: 13, fontWeight: 800 },
  chevron: { color: '#f47518', fontSize: 9 },
  menu: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 9,
    borderWidth: 1,
    boxShadow: '0px 6px 16px rgba(0,0,0,0.18)',
    gap: 4,
    minWidth: 120,
    padding: 5,
    position: 'absolute',
    right: 0,
    top: 42,
    zIndex: 30,
  },
  option: { alignItems: 'center', borderRadius: 6, justifyContent: 'center', minHeight: 36, paddingLeft: 10, paddingRight: 10 },
  optionText: { color: '#06324d', fontSize: 12, fontWeight: 700 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
};
