// Màn hình Cài đặt (Settings) - Tái cấu trúc theo giao diện Dashboard thẻ (Dark theme).
// Các chức năng tab cũ được tái sử dụng thành các trang con (sub-pages) chuyên biệt.
// Không thay đổi logic lái, Bluetooth, firmware hay màn hình điều khiển chính.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Car,
  Code2,
  Gamepad2,
  Plug,
  Sliders,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react';
import { theme } from './settings/theme';
import type { SubPageId } from './settings/types';
import { useDashboardState } from './settings/useDashboardState';
import { MOTOR_TEST_SPEED, useMotorTest } from './settings/useMotorTest';
import { configFromProfile, sameConfig } from '../control/carConfig';
import { WHEEL_IDS, type WheelId } from '../drive/driveModel';
import type { StatusChipKind } from './settings/types';
import { ConfirmModal } from './settings/components/ConfirmModal';
import { SectionLabel } from './settings/components/SectionLabel';
import { SettingsCard } from './settings/components/SettingsCard';
import { SettingsHeaderBar } from './settings/components/SettingsHeaderBar';
import { SettingsRow } from './settings/components/SettingsRow';
import { SettingsSubPageScaffold } from './settings/components/SettingsSubPageScaffold';
import { AdvancedSubPage } from './settings/subpages/AdvancedSubPage';
import { CalibrateSubPage } from './settings/subpages/CalibrateSubPage';
import { MotorSubPage } from './settings/subpages/MotorSubPage';
import { SpeedSubPage } from './settings/subpages/SpeedSubPage';
import { StubSubPage } from './settings/subpages/StubSubPage';
import { WheelTypeSubPage } from './settings/subpages/WheelTypeSubPage';
import { useController } from '../drive/ControllerContext';
import { useBluetooth } from '../hooks/BluetoothContext';
import { useDriveInput } from '../hooks/useDriveInput';
import { useInstallApp } from '../hooks/useInstallApp';
import { InstallAppSheet } from './InstallAppSheet';
import { Pressable, Text, View, type Style } from '../ui/rn';

const NEED_CONNECT = 'Cần kết nối xe trước (nút BLUETOOTH trên màn hình tay cầm).';
const OLD_FIRMWARE =
  'Xe đang chạy firmware cũ, chưa hỗ trợ chức năng này. Cập nhật thư viện WUD_Tournaments lên 0.2.0 trở lên rồi nạp lại code cho xe.';

function useIsLandscape() {
  const check = () => window.innerWidth > window.innerHeight;
  const [landscape, setLandscape] = useState(check);
  useEffect(() => {
    const onResize = () => setLandscape(check());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return landscape;
}

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const c = useController();
  const bt = useBluetooth();
  const profile = c.activeDriveProfile;
  const level = c.driveSettings.activeLevel;
  const drive = useDriveInput(bt.controlLoop, profile, level, bt.connectionKey, bt.carSpeed);
  const noPwmPin = Boolean(bt.connectedDevice) && bt.carSpeed.noPwmPin;

  const isLandscape = useIsLandscape();
  const { standalone } = useInstallApp();
  const [installVisible, setInstallVisible] = useState(false);

  // Navigation stack: null is Dashboard home; string is active SubPageId
  const [activeSubPage, setActiveSubPage] = useState<SubPageId | null>(null);

  // Cấu hình muốn lưu xuống xe và trạng thái đồng bộ với ô CONFIG đọc từ xe.
  const desiredConfig = configFromProfile(profile, level);
  const [saving, setSaving] = useState(false);
  const sync: StatusChipKind | null = saving
    ? 'applying'
    : bt.carConfig
      ? sameConfig(bt.carConfig, desiredConfig)
        ? 'applied'
        : 'unsynced'
      : null;

  // Dashboard state object (with dev switcher capability)
  const dashboard = useDashboardState(bt, sync);

  // Chạy thử từng bánh (trang Động cơ).
  const motorTest = useMotorTest(bt.sendTest);

  // Công tắc Đảo chiều: đổi trên web và (nếu đang kết nối) ghi xuống xe ngay, chỉ đổi phần đảo chiều,
  // các thông số khác chưa lưu vẫn giữ nguyên trên xe.
  const handleInvertChange = useCallback(
    (w: WheelId, inverted: boolean) => {
      const next = { ...profile, motors: { ...profile.motors, [w]: { ...profile.motors[w], inverted } } };
      c.updateDriveProfile(next);
      if (!bt.connectedDevice || !bt.configSupported) return;
      const base = bt.carConfig ?? configFromProfile(next);
      setSaving(true);
      bt.saveConfig({ ...base, invertMask: configFromProfile(next).invertMask })
        .then((back) => {
          if (!back || back.invertMask !== configFromProfile(next).invertMask) window.alert(`Xe chưa nhận lệnh đảo chiều. ${OLD_FIRMWARE}`);
        })
        .catch((e) => window.alert(`Không đổi được chiều động cơ: ${e instanceof Error ? e.message : String(e)}`))
        .finally(() => setSaving(false));
    },
    [profile, c, bt],
  );
  const handleTestStart = useCallback(
    (w: WheelId) => {
      if (!bt.connectedDevice) return window.alert(NEED_CONNECT);
      if (!bt.testSupported) return window.alert(OLD_FIRMWARE);
      drive.stop();
      // Bánh quay theo chiều TIẾN, có tính công tắc Đảo chiều đang gạt trên web (kể cả chưa lưu).
      const speed = profile.motors[w].inverted ? -MOTOR_TEST_SPEED : MOTOR_TEST_SPEED;
      motorTest.startTest(WHEEL_IDS.indexOf(w), speed);
    },
    [bt.connectedDevice, bt.testSupported, drive, profile.motors, motorTest],
  );

  // "Lưu vào xe": ghi ô CONFIG rồi đọc lại để chắc xe đã nhận.
  const handleSaveToCar = useCallback(async () => {
    if (!bt.connectedDevice) return window.alert(NEED_CONNECT);
    if (!bt.configSupported) return window.alert(OLD_FIRMWARE);
    setSaving(true);
    try {
      const back = await bt.saveConfig(desiredConfig);
      if (!back || !sameConfig(back, desiredConfig)) window.alert(`Xe chưa nhận cấu hình mới.\n\n${OLD_FIRMWARE}`);
    } catch (e) {
      window.alert(`Lưu vào xe thất bại: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }, [bt, desiredConfig]);

  // Snapshot initial profile when opening Settings to track unapplied edits
  const initialProfileJson = useRef(JSON.stringify(c.activeDriveProfile));
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Advanced area first-time confirmation modal
  const hasAcceptedAdvancedWarning = useRef(false);
  const [showAdvancedWarning, setShowAdvancedWarning] = useState(false);

  // Remember dashboard scroll position when navigating to sub-page
  const dashboardScrollRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef(0);

  const navigateTo = useCallback((id: SubPageId) => {
    if (dashboardScrollRef.current) {
      savedScrollTop.current = dashboardScrollRef.current.scrollTop;
    }
    setActiveSubPage(id);
  }, []);

  const navigateBack = useCallback(() => {
    setActiveSubPage(null);
    // Restore scroll position
    setTimeout(() => {
      if (dashboardScrollRef.current) {
        dashboardScrollRef.current.scrollTop = savedScrollTop.current;
      }
    }, 0);
  }, []);

  // Handle Close / Exit from Settings
  const handleRequestClose = useCallback(() => {
    drive.stop();
    const hasUnappliedEdits =
      JSON.stringify(c.activeDriveProfile) !== initialProfileJson.current;

    if (hasUnappliedEdits) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [drive, c.activeDriveProfile, onClose]);

  const handleConfirmExitApply = useCallback(() => {
    setShowExitConfirm(false);
    onClose();
  }, [onClose]);

  const handleConfirmExitDiscard = useCallback(() => {
    try {
      const original = JSON.parse(initialProfileJson.current);
      c.updateDriveProfile(original);
    } catch {
      // ignore
    }
    setShowExitConfirm(false);
    onClose();
  }, [c, onClose]);

  // Handle tap on Section 03 (Nâng cao)
  const handleOpenAdvanced = useCallback(() => {
    if (!hasAcceptedAdvancedWarning.current) {
      setShowAdvancedWarning(true);
    } else {
      navigateTo('advanced');
    }
  }, [navigateTo]);

  // Render Sub-Page if active
  if (activeSubPage) {
    let subPageTitle = '';
    let subPageDesc = '';
    let subPageContent = null;

    switch (activeSubPage) {
      case 'speed':
        subPageTitle = 'Tốc độ';
        subPageDesc = 'PWM cố định cho từng mức: Chậm 140, Vừa 200, Nhanh 255. Joystick chỉ chọn hướng.';
        subPageContent = (
          <SpeedSubPage
            level={level}
            onSelectLevel={c.selectSpeedLevel}
            noPwmPin={noPwmPin}
          />
        );
        break;

      case 'wheelType':
        subPageTitle = 'Loại xe';
        subPageDesc = 'Chọn hệ truyền động và bố trí bánh (Standard, Omni, Mecanum).';
        subPageContent = (
          <WheelTypeSubPage
            profile={profile}
            onUpdate={c.updateDriveProfile}
          />
        );
        break;

      case 'motor':
        subPageTitle = 'Động cơ';
        subPageDesc = 'Kiểm tra quay từng động cơ và đảo chiều cực tính.';
        subPageContent = (
          <MotorSubPage
            profile={profile}
            onInvertChange={handleInvertChange}
            onTestStart={handleTestStart}
            onTestEnd={motorTest.stopTest}
          />
        );
        break;

      case 'calibrate':
        subPageTitle = 'Hiệu chỉnh & Chạy thử';
        subPageDesc = 'Kéo cần gạt mini để chạy thử và kiểm tra xung PWM thực tế của 4 bánh.';
        subPageContent = (
          <CalibrateSubPage
            profile={profile}
            level={level}
            onControlChange={drive.setJoystick}
            onRotateChange={drive.setRotate}
            noPwmPin={noPwmPin}
          />
        );
        break;

      case 'advanced':
        subPageTitle = 'Thông số kỹ thuật';
        subPageDesc = 'Ma trận hướng nâng cao, giới hạn tốc độ và bù công suất từng bánh.';
        subPageContent = (
          <AdvancedSubPage
            profile={profile}
            onUpdate={c.updateDriveProfile}
          />
        );
        break;

      case 'controllerStub':
        subPageTitle = 'Tay điều khiển';
        subPageDesc = 'Cấu hình gán phím và độ nhạy của cần điều khiển analog.';
        subPageContent = (
          <StubSubPage
            title="Tay điều khiển"
            subtitle="Tiến, lùi, trái, phải"
            icon={Gamepad2}
            details="Tính năng tùy biến layout nút bấm, độ nhạy joystick và deadzone analog đang được hoàn thiện."
          />
        );
        break;

      case 'hardwareStub':
        subPageTitle = 'Kết nối phần cứng';
        subPageDesc = 'Sơ đồ chân GPIO và thông số driver kết nối ESP32.';
        subPageContent = (
          <StubSubPage
            title="Kết nối phần cứng"
            subtitle="Board và chân kết nối"
            icon={Plug}
            details="Tính năng chuẩn đoán chân tín hiệu GPIO, kiểm tra driver động cơ và hiển thị sơ đồ nối dây ESP32 đang được phát triển."
          />
        );
        break;
    }

    return (
      <View style={s.screen}>
        <SettingsSubPageScaffold
          title={subPageTitle}
          description={subPageDesc}
          connectionStatus={dashboard.connectionStatus}
          canUndo={c.canUndoDriveSettings}
          canSave={Boolean(bt.connectedDevice) && !saving}
          onBack={navigateBack}
          onStop={drive.stop}
          onUndo={c.undoDriveSettings}
          onSaveToCar={() => void handleSaveToCar()}
          onRestoreDefaults={c.restoreDriveSettings}
        >
          {subPageContent}
        </SettingsSubPageScaffold>

        {installVisible && (
          <InstallAppSheet onClose={() => setInstallVisible(false)} />
        )}
      </View>
    );
  }

  // Dashboard Home
  return (
    <View style={s.screen}>
      <SettingsHeaderBar
        isLandscape={isLandscape}
        connectionStatus={dashboard.connectionStatus}
        chipFamily={dashboard.chipFamily}
        battery={dashboard.battery}
        standalone={standalone}
        onOpenInstall={() => setInstallVisible(true)}
        onStop={drive.stop}
        onClose={handleRequestClose}
      />

      <View ref={dashboardScrollRef} style={s.scrollArea}>
        <View style={[s.dashboardBody, isLandscape && s.dashboardBodyLandscape]}>
          {/* Section 01 · Điều khiển */}
          <SectionLabel label="01 · Điều khiển" />
          <View style={[s.cardsGrid, isLandscape && s.cardsGridLandscape]}>
            <SettingsCard
              title="Tay điều khiển"
              subtitle={dashboard.cardStates.controller.reason || 'Tiến, lùi, trái, phải'}
              icon={Gamepad2}
              disabled={!dashboard.cardStates.controller.enabled}
              disabledReason={dashboard.cardStates.controller.reason}
              onPress={() => navigateTo('controllerStub')}
            />
            <SettingsCard
              title="Tốc độ"
              subtitle={dashboard.cardStates.speed.reason || 'Chậm, vừa, nhanh'}
              icon={SlidersHorizontal}
              disabled={!dashboard.cardStates.speed.enabled}
              disabledReason={dashboard.cardStates.speed.reason}
              onPress={() => navigateTo('speed')}
            />
          </View>

          {/* Section 02 · Thiết lập robot */}
          <SectionLabel label="02 · Thiết lập robot" />
          <View style={[s.cardsGrid, isLandscape && s.cardsGridLandscape]}>
            <SettingsCard
              title="Loại xe"
              subtitle={dashboard.cardStates.wheelType.reason || 'Standard, Omni, Mecanum'}
              icon={Car}
              disabled={!dashboard.cardStates.wheelType.enabled}
              disabledReason={dashboard.cardStates.wheelType.reason}
              onPress={() => navigateTo('wheelType')}
            />
            <SettingsCard
              title="Kết nối phần cứng"
              subtitle={dashboard.cardStates.hardware.reason || 'Board và chân kết nối'}
              icon={Plug}
              disabled={!dashboard.cardStates.hardware.enabled}
              disabledReason={dashboard.cardStates.hardware.reason}
              onPress={() => navigateTo('hardwareStub')}
            />
            <SettingsCard
              title="Động cơ"
              subtitle={dashboard.cardStates.motor.reason || 'Hướng quay và kiểm tra'}
              icon={Sliders}
              disabled={!dashboard.cardStates.motor.enabled}
              disabledReason={dashboard.cardStates.motor.reason}
              onPress={() => navigateTo('motor')}
            />
            <SettingsCard
              title="Hiệu chỉnh"
              subtitle={dashboard.cardStates.calibrate.reason || 'Kiểm tra chuyển động'}
              icon={Wrench}
              disabled={!dashboard.cardStates.calibrate.enabled}
              disabledReason={dashboard.cardStates.calibrate.reason}
              onPress={() => navigateTo('calibrate')}
            />
          </View>

          {/* Section 03 · Nâng cao */}
          <SectionLabel label="03 · Nâng cao" />
          <SettingsRow
            title="Thông số kỹ thuật"
            subtitle="Ma trận, giới hạn tốc độ, bù từng bánh"
            icon={Code2}
            disabled={!dashboard.cardStates.advanced.enabled}
            onPress={handleOpenAdvanced}
          />

          {/* Dev-only status override bar */}
          <View style={s.devBar}>
            <Text style={s.devLabel}>DEV TRẠNG THÁI:</Text>
            <View style={s.devButtons}>
              <Pressable
                label="Chế độ Tự động"
                onPress={() => dashboard.setDevStatusOverride(null)}
                style={[
                  s.devButton,
                  dashboard.devStatusOverride === null && s.devButtonActive,
                ]}
              >
                <Text
                  style={[
                    s.devButtonText,
                    dashboard.devStatusOverride === null && s.devButtonTextActive,
                  ]}
                >
                  Tự động
                </Text>
              </Pressable>
              <Pressable
                label="Chưa kết nối"
                onPress={() => dashboard.setDevStatusOverride('disconnected')}
                style={[
                  s.devButton,
                  dashboard.devStatusOverride === 'disconnected' && s.devButtonActive,
                ]}
              >
                <Text
                  style={[
                    s.devButtonText,
                    dashboard.devStatusOverride === 'disconnected' && s.devButtonTextActive,
                  ]}
                >
                  Chưa kết nối
                </Text>
              </Pressable>
              <Pressable
                label="Đã kết nối"
                onPress={() => dashboard.setDevStatusOverride('connected')}
                style={[
                  s.devButton,
                  dashboard.devStatusOverride === 'connected' && s.devButtonActive,
                ]}
              >
                <Text
                  style={[
                    s.devButtonText,
                    dashboard.devStatusOverride === 'connected' && s.devButtonTextActive,
                  ]}
                >
                  Đã kết nối
                </Text>
              </Pressable>
              <Pressable
                label="Đang kiểm tra"
                onPress={() => dashboard.setDevStatusOverride('testing')}
                style={[
                  s.devButton,
                  dashboard.devStatusOverride === 'testing' && s.devButtonActive,
                ]}
              >
                <Text
                  style={[
                    s.devButtonText,
                    dashboard.devStatusOverride === 'testing' && s.devButtonTextActive,
                  ]}
                >
                  Đang test
                </Text>
              </Pressable>
              <Pressable
                label="Lỗi"
                onPress={() => dashboard.setDevStatusOverride('error')}
                style={[
                  s.devButton,
                  dashboard.devStatusOverride === 'error' && s.devButtonActive,
                ]}
              >
                <Text
                  style={[
                    s.devButtonText,
                    dashboard.devStatusOverride === 'error' && s.devButtonTextActive,
                  ]}
                >
                  Lỗi
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Confirm modal when opening Nâng cao for the first time */}
      <ConfirmModal
        visible={showAdvancedWarning}
        title="Khu vực nâng cao"
        message="Khu vực dành cho người có kinh nghiệm. Thay đổi ma trận hướng hoặc giới hạn xung PWM có thể ảnh hưởng trực tiếp đến phản hồi động học của xe. Bạn có chắc muốn tiếp tục?"
        confirmLabel="Tiếp tục"
        cancelLabel="Hủy"
        onConfirm={() => {
          hasAcceptedAdvancedWarning.current = true;
          setShowAdvancedWarning(false);
          navigateTo('advanced');
        }}
        onCancel={() => setShowAdvancedWarning(false)}
      />

      {/* Confirm modal when leaving with unapplied changes */}
      <ConfirmModal
        visible={showExitConfirm}
        title="Thay đổi chưa áp dụng"
        message="Bạn có cấu hình vừa thay đổi trong cài đặt. Bạn muốn áp dụng cấu hình này hay hủy bỏ và khôi phục cài đặt trước đó?"
        confirmLabel="Áp dụng"
        cancelLabel="Hủy bỏ"
        onConfirm={handleConfirmExitApply}
        onCancel={handleConfirmExitDiscard}
      />

      {installVisible && (
        <InstallAppSheet onClose={() => setInstallVisible(false)} />
      )}
    </View>
  );
}

const s: Record<string, Style> = {
  screen: {
    backgroundColor: theme.background,
    colorScheme: 'dark',
    flex: '1 1 0%',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    width: '100%',
  },
  scrollArea: {
    flex: '1 1 0%',
    minHeight: 0,
    overflowY: 'auto',
  },
  dashboardBody: {
    gap: 12,
    margin: '0 auto',
    maxWidth: 720,
    padding: '14px 16px 36px',
    width: '100%',
  },
  dashboardBodyLandscape: {
    maxWidth: 860,
    padding: '10px 16px 24px',
  },
  cardsGrid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    width: '100%',
  },
  cardsGridLandscape: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  devBar: {
    alignItems: 'center',
    borderTopColor: theme.borderSubtle,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
    paddingTop: 14,
  },
  devLabel: {
    color: theme.textSubtle,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
  devButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  devButton: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 6,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    justifyContent: 'center',
    minHeight: 28,
    paddingLeft: 8,
    paddingRight: 8,
  },
  devButtonActive: {
    backgroundColor: theme.cardPressed,
    borderColor: theme.accent,
  },
  devButtonText: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: 700,
  },
  devButtonTextActive: {
    color: theme.accent,
  },
};
