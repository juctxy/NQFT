import { ArrowLeftCircle, RotateCcw, Settings } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SpeedPresets } from '../controller';

interface SettingsScreenProps {
  presets: SpeedPresets;
  onChange: (key: keyof SpeedPresets, value: number) => void;
  onApply: (value: number) => void;
  onReset: () => void;
  onBack: () => void;
}

const PRESETS: Array<{ key: keyof SpeedPresets; label: string }> = [
  { key: 'slow', label: 'State 1: CHẬM' },
  { key: 'medium', label: 'State 2: VỪA' },
  { key: 'fast', label: 'State 3: NHANH' },
];

function SettingRow({
  presetKey,
  label,
  value,
  onChange,
  onApply,
}: {
  presetKey: keyof SpeedPresets;
  label: string;
  value: number;
  onChange: (key: keyof SpeedPresets, value: number) => void;
  onApply: (value: number) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingControls}>
        <Slider
          accessibilityLabel={`${label} PWM speed`}
          accessibilityValue={{ min: 0, max: 255, now: value }}
          minimumValue={0}
          maximumValue={255}
          step={1}
          value={value}
          onValueChange={(nextValue) => onChange(presetKey, nextValue)}
          minimumTrackTintColor="#f47518"
          maximumTrackTintColor="#cbd5e1"
          thumbTintColor="#f47518"
          style={styles.slider}
        />
        <TextInput
          accessibilityLabel={`${label} PWM value`}
          keyboardType="number-pad"
          onChangeText={(text) => onChange(presetKey, Number(text))}
          selectTextOnFocus
          selectionColor="#f47518"
          style={styles.settingNumber}
          value={String(value)}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onApply(value)}
        style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}
      >
        <Text style={styles.applyText}>Áp dụng M1/M2</Text>
      </Pressable>
    </View>
  );
}

export function SettingsScreen({
  presets,
  onChange,
  onApply,
  onReset,
  onBack,
}: SettingsScreenProps) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Settings color="#f47518" size={20} />
            <Text style={styles.title}>CÀI ĐẶT XUNG TỐC ĐỘ (PWM 0 – 255)</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeftCircle color="#fff" size={16} />
            <Text style={styles.backText}>LƯU & QUAY LẠI</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.settingRows}>
            {PRESETS.map(({ key, label }) => (
              <SettingRow
                key={key}
                presetKey={key}
                label={label}
                value={presets[key]}
                onChange={onChange}
                onApply={onApply}
              />
            ))}
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onReset}
              style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
            >
              <RotateCcw color="#334155" size={14} />
              <Text style={styles.resetText}>Mặc định (130 / 190 / 255)</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 760,
    overflow: 'hidden',
    shadowColor: '#06324d',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  titleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    marginRight: 12,
  },
  title: {
    color: '#fff',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  settingRows: {
    gap: 12,
  },
  settingRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  settingLabel: {
    color: '#06324d',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 115,
  },
  settingControls: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  settingNumber: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1.5,
    color: '#f47518',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
    width: 64,
  },
  applyButton: {
    backgroundColor: '#06324d',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  applyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: 14,
  },
  resetButton: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  resetText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    backgroundColor: '#10b981',
  },
});
