import { theme } from '../theme';
import { Text, View, type Style } from '../../../ui/rn';

export function SectionLabel({ label, style }: { label: string; style?: Style }) {
  return (
    <View style={[s.wrap, style]}>
      <Text style={s.text}>{label}</Text>
    </View>
  );
}

const s: Record<string, Style> = {
  wrap: {
    paddingBottom: 4,
    paddingTop: 8,
  },
  text: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};
