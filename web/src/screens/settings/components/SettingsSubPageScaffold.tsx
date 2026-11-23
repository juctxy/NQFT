import type { ReactNode } from 'react';
import { ArrowLeft, RotateCcw, Save, Square } from 'lucide-react';
import { theme } from '../theme';
import type { StatusChipKind } from '../types';
import { StatusChip } from './StatusChip';
import { Pressable, Text, View, type Style } from '../../../ui/rn';


interface SettingsSubPageScaffoldProps {
  title: string;
  description: string;
  connectionStatus: StatusChipKind;
  canUndo?: boolean;
  canSave?: boolean;
  onBack: () => void;
  onStop: () => void;
  onUndo?: () => void;
  onSaveToCar?: () => void;
  onRestoreDefaults?: () => void;
  children: ReactNode;
}

export function SettingsSubPageScaffold({
  title,
  description,
  connectionStatus,
  canUndo = false,
  canSave = false,
  onBack,
  onStop,
  onUndo,
  onSaveToCar,
  onRestoreDefaults,
  children,
}: SettingsSubPageScaffoldProps) {
  return (
    <View style={s.scaffold}>
      {/* Subpage Top Bar */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <Pressable
            label="Quay lại danh mục cài đặt"
            onPress={onBack}
            style={s.backButton}
          >
            <ArrowLeft color={theme.text} size={18} />
            <Text style={s.backText}>Quay lại</Text>
          </Pressable>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={s.topBarRight}>
          <StatusChip kind={connectionStatus} />
          <Pressable
            label="Dừng xe khẩn cấp"
            onPress={onStop}
            style={s.stopButton}
          >
            <Square color="#fff" size={14} fill="#fff" />
            <Text style={s.stopText}>DỪNG</Text>
          </Pressable>
        </View>
      </View>

      {/* Description line */}
      <View style={s.descRow}>
        <Text style={s.descText} numberOfLines={2}>
          {description}
        </Text>
      </View>

      {/* Scrollable Body */}
      <View style={s.scrollArea}>
        <View style={s.scrollContent}>{children}</View>
      </View>

      {/* Shared Bottom Action Area (Undo, Save to vehicle, Restore) */}
      <View style={s.bottomBar}>
        <View style={s.bottomActions}>
          {onUndo && (
            <Pressable
              label="Hoàn tác thay đổi vừa thực hiện"
              disabled={!canUndo}
              onPress={onUndo}
              style={[s.footerButton, !canUndo && s.footerButtonDisabled]}
            >
              <RotateCcw
                color={canUndo ? theme.text : theme.textDisabled}
                size={14}
              />
              <Text
                style={[
                  s.footerButtonText,
                  !canUndo && s.footerButtonTextDisabled,
                ]}
              >
                Hoàn tác
              </Text>
            </Pressable>
          )}

          {onSaveToCar && (
            <Pressable
              label="Lưu cấu hình vào bộ nhớ xe ESP32"
              disabled={!canSave}
              onPress={onSaveToCar}
              style={[
                s.footerButton,
                s.saveButton,
                !canSave && s.footerButtonDisabled,
              ]}
            >
              <Save color="#fff" size={14} />
              <Text style={s.saveButtonText}>Lưu vào xe</Text>
            </Pressable>
          )}

          {onRestoreDefaults && (
            <Pressable
              label="Khôi phục toàn bộ cấu hình về mặc định"
              onPress={() => {
                if (
                  window.confirm(
                    'Khôi phục mặc định?\n\nToàn bộ thông số lái sẽ được đặt lại về giá trị gốc.',
                  )
                ) {
                  onRestoreDefaults();
                }
              }}
              style={s.footerButton}
            >
              <Text style={s.footerButtonText}>Khôi phục</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  scaffold: {
    backgroundColor: theme.background,
    flex: '1 1 0%',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderBottomColor: theme.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 52,
    padding: '8px 14px',
    zIndex: 10,
  },
  topBarLeft: {
    alignItems: 'center',
    flex: '1 1 0%',
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: 10,
    paddingRight: 12,
  },
  backText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    color: theme.text,
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: 0.3,
  },
  topBarRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
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
  descRow: {
    backgroundColor: theme.background,
    borderBottomColor: theme.borderSubtle,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    padding: '8px 16px',
  },
  descText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '17px',
  },
  scrollArea: {
    flex: '1 1 0%',
    minHeight: 0,
    overflowY: 'auto',
  },
  scrollContent: {
    gap: 14,
    maxWidth: 880,
    padding: '16px 16px 32px',
    width: '100%',
  },
  bottomBar: {
    backgroundColor: theme.backgroundSubtle,
    borderTopColor: theme.border,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 52,
    padding: '8px 16px',
    zIndex: 10,
  },
  bottomActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  footerButton: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 14,
  },
  footerButtonDisabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  footerButtonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 700,
  },
  footerButtonTextDisabled: {
    color: theme.textDisabled,
  },
  saveButton: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 800,
  },
};
