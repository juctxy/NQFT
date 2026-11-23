import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';
import { theme } from '../theme';
import { Text, View, type Style } from '../../../ui/rn';

interface StubSubPageProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  details: string;
}

export function StubSubPage({
  title,
  subtitle,
  icon: Icon,
  details,
}: StubSubPageProps) {
  return (
    <View style={s.container}>
      <View style={s.stubCard}>
        <View style={s.iconWrap}>
          <Icon size={42} strokeWidth={1.6} color={theme.accent} />
        </View>

        <Text style={s.stubTitle}>{title}</Text>
        <Text style={s.stubSubtitle}>{subtitle}</Text>

        <View style={s.badge}>
          <Construction size={14} color={theme.warning} />
          <Text style={s.badgeText}>Đang phát triển</Text>
        </View>

        <Text style={s.detailsText}>{details}</Text>
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 0',
    width: '100%',
  },
  stubCard: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 16,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 12,
    maxWidth: 480,
    padding: '36px 24px',
    textAlign: 'center',
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 9999,
    borderStyle: 'solid',
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginBottom: 4,
    width: 72,
  },
  stubTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: 800,
  },
  stubSubtitle: {
    color: theme.textMuted,
    fontSize: 13,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 9999,
    borderStyle: 'solid',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: '4px 12px',
  },
  badgeText: {
    color: theme.warning,
    fontSize: 12,
    fontWeight: 700,
  },
  detailsText: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: '20px',
    marginTop: 8,
  },
};
