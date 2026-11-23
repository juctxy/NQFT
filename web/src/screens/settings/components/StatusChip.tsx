import { theme } from '../theme';
import type { StatusChipKind } from '../types';
import { Text, View, type Style } from '../../../ui/rn';

export const STATUS_CHIP_MAP: Record<StatusChipKind, { label: string; color: keyof typeof theme.chip }> = {
  disconnected: { label: 'Chưa kết nối', color: 'gray' },
  connecting: { label: 'Đang kết nối', color: 'amber' },
  connected: { label: 'Đã kết nối', color: 'green' },
  unsynced: { label: 'Chưa đồng bộ', color: 'amber' },
  testing: { label: 'Đang kiểm tra', color: 'blue' },
  applying: { label: 'Đang áp dụng', color: 'blue' },
  applied: { label: 'Đã áp dụng', color: 'green' },
  error: { label: 'Lỗi', color: 'red' },
};

export function StatusChip({ kind, style }: { kind: StatusChipKind; style?: Style }) {
  const item = STATUS_CHIP_MAP[kind] ?? STATUS_CHIP_MAP.disconnected;
  const chipToken = theme.chip[item.color];

  return (
    <View
      role="status"
      aria-label={`Trạng thái: ${item.label}`}
      style={[
        s.chip,
        {
          backgroundColor: chipToken.bg,
          borderColor: chipToken.border,
        },
        style,
      ]}
    >
      <View style={[s.dot, { backgroundColor: chipToken.dot }]} />
      <Text style={[s.label, { color: chipToken.text }]}>{item.label}</Text>
    </View>
  );
}

const s: Record<string, Style> = {
  chip: {
    alignItems: 'center',
    borderRadius: 9999,
    borderStyle: 'solid',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 28,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 4,
  },
  dot: {
    borderRadius: 9999,
    height: 7,
    width: 7,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
};
