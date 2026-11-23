import { Download, Square, X } from 'lucide-react';
import { theme } from '../theme';
import type { StatusChipKind } from '../types';
import { StatusChip } from './StatusChip';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

interface SettingsHeaderBarProps {
  isLandscape: boolean;
  connectionStatus: StatusChipKind;
  chipFamily: string;
  battery: string | null;
  standalone: boolean;
  onOpenInstall: () => void;
  onStop: () => void;
  onClose: () => void;
}

export function SettingsHeaderBar({
  isLandscape,
  connectionStatus,
  chipFamily,
  battery,
  standalone,
  onOpenInstall,
  onStop,
  onClose,
}: SettingsHeaderBarProps) {
  const subtitleLine = `${chipFamily} · Bluetooth LE${battery ? ` · ${battery}` : ''}`;
  // Khi đã kết nối, chip có thể hiện trạng thái lưu cấu hình (Chưa đồng bộ / Đang áp dụng / Đã áp dụng).
  const isConnected = (['connected', 'unsynced', 'applying', 'applied', 'testing'] as StatusChipKind[]).includes(connectionStatus);

  if (isLandscape) {
    return (
      <View style={s.landscapeHeader}>
        <View style={s.landscapeBrand}>
          <Text style={s.brandTitle}>ROBOT CONTROL</Text>
          <Text style={s.brandSubtitle} numberOfLines={1}>
            {subtitleLine}
          </Text>
          <StatusChip kind={connectionStatus} />
        </View>

        <View style={s.actions}>
          {!standalone && (
            <Pressable
              label="Tải app về máy"
              onPress={onOpenInstall}
              style={s.installButton}
            >
              <Download color="#fff" size={14} />
              <Text style={s.installText}>TẢI APP</Text>
            </Pressable>
          )}

          <Pressable
            label="Dừng xe khẩn cấp"
            onPress={onStop}
            style={s.stopButton}
          >
            <Square color="#fff" size={14} fill="#fff" />
            <Text style={s.stopText}>DỪNG</Text>
          </Pressable>

          <Pressable
            label="Đóng cài đặt"
            onPress={onClose}
            style={s.closeButton}
          >
            <X color={theme.text} size={15} />
            <Text style={s.closeText}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Portrait layout: top bar + header card matching reference image
  return (
    <View style={s.portraitContainer}>
      {/* Top utility bar keeping existing controls */}
      <View style={s.portraitTopBar}>
        <View style={s.topBarLeft}>
          <View
            style={[
              s.topDot,
              {
                backgroundColor:
                  isConnected ? theme.success : theme.textSubtle,
              },
            ]}
          />
          <Text style={s.topConnectionText}>
            {isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
          </Text>
          {battery && <Text style={s.topBatteryText}>Pin: {battery}</Text>}
        </View>

        <View style={s.actions}>
          {!standalone && (
            <Pressable
              label="Tải app về máy"
              onPress={onOpenInstall}
              style={s.installButton}
            >
              <Download color="#fff" size={14} />
              <Text style={s.installText}>TẢI APP</Text>
            </Pressable>
          )}

          <Pressable
            label="Dừng xe khẩn cấp"
            onPress={onStop}
            style={s.stopButton}
          >
            <Square color="#fff" size={14} fill="#fff" />
            <Text style={s.stopText}>DỪNG</Text>
          </Pressable>

          <Pressable
            label="Đóng cài đặt"
            onPress={onClose}
            style={s.closeButton}
          >
            <X color={theme.text} size={15} />
            <Text style={s.closeText}>Đóng</Text>
          </Pressable>
        </View>
      </View>

      {/* Header card with Title, subtitle and status chip */}
      <View style={s.headerCard}>
        <View style={s.headerCardLeft}>
          <Text style={s.brandTitle}>ROBOT CONTROL</Text>
          <Text style={s.brandSubtitle} numberOfLines={1}>
            {subtitleLine}
          </Text>
        </View>
        <StatusChip kind={connectionStatus} />
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  landscapeHeader: {
    alignItems: 'center',
    backgroundColor: theme.background,
    borderBottomColor: theme.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 52,
    padding: '8px 16px',
    width: '100%',
    zIndex: 10,
  },
  landscapeBrand: {
    alignItems: 'center',
    flex: '1 1 0%',
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  portraitContainer: {
    backgroundColor: theme.background,
    borderBottomColor: theme.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    gap: 10,
    padding: '10px 14px 14px',
    width: '100%',
  },
  portraitTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 40,
    width: '100%',
  },
  topBarLeft: {
    alignItems: 'center',
    flex: '1 1 0%',
    flexDirection: 'row',
    gap: 6,
  },
  topDot: {
    borderRadius: 9999,
    height: 8,
    width: 8,
  },
  topConnectionText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 600,
  },
  topBatteryText: {
    color: theme.textMuted,
    fontSize: 11,
    marginLeft: 6,
  },
  headerCard: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 14,
    borderStyle: 'solid',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: '14px 16px',
    width: '100%',
  },
  headerCardLeft: {
    flex: '1 1 0%',
    gap: 3,
  },
  brandTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 500,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  installButton: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: 10,
    paddingRight: 10,
  },
  installText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: 700,
  },
  stopButton: {
    alignItems: 'center',
    backgroundColor: theme.danger,
    borderRadius: 8,
    cursor: 'pointer',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 78,
    paddingLeft: 12,
    paddingRight: 12,
  },
  stopText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.5,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 12,
  },
  closeText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 700,
  },
};
