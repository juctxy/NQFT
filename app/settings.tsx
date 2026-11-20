import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsScreen } from '../components/SettingsScreen';
import { useBluetooth } from '../context/BluetoothContext';
import { useController } from '../context/ControllerContext';
import {
  DRIVE_CONTROL_PERIOD_MS,
  normalizeDriveProfile,
  type DriveProfile,
  type JoystickVector,
  type SpeedLevel,
  type WheelId,
} from '../drive';

const NEUTRAL: JoystickVector = { x: 0, y: 0 };

export default function SettingsRoute() {
  const router = useRouter();
  const {
    driveSettings,
    activeDriveProfile,
    driveSettingsReady,
    driveSettingsError,
    canUndoDriveSettings,
    updateDriveProfile,
    selectDriveProfile,
    selectSpeedLevel,
    addDriveProfile,
    createDriveProfile,
    duplicateDriveProfile,
    renameDriveProfile,
    deleteDriveProfile,
    undoDriveSettings,
    restoreDriveSettings,
  } = useController();
  const bluetooth = useBluetooth();
  const joystickRef = useRef(NEUTRAL);
  const rotateRef = useRef<-1 | 0 | 1>(0);
  const movingRef = useRef(false);
  const lastProfileRef = useRef(activeDriveProfile);
  const lastLevelRef = useRef(driveSettings.activeLevel);

  const sendStop = useCallback(() => {
    joystickRef.current = NEUTRAL;
    rotateRef.current = 0;
    movingRef.current = false;
    void bluetooth.sendStop().catch((error: unknown) => {
      console.error('Không thể gửi lệnh dừng:', error);
    });
  }, [bluetooth.sendStop]);

  const onControlChange = useCallback((joystick: JoystickVector) => {
    joystickRef.current = joystick;
  }, []);
  const onRotateChange = useCallback((rotate: -1 | 0 | 1) => {
    rotateRef.current = rotate;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const joystick = joystickRef.current;
      const rotate = rotateRef.current;
      const moving = joystick.x !== 0 || joystick.y !== 0 || rotate !== 0;
      if (moving) {
        movingRef.current = true;
        void bluetooth.sendDriveControl(joystick, rotate).catch((error: unknown) => {
          console.error('Không thể gửi lệnh chạy thử:', error);
          sendStop();
        });
      } else if (movingRef.current) {
        movingRef.current = false;
        void bluetooth.sendStop().catch((error: unknown) => {
          console.error('Không thể dừng xe chạy thử:', error);
        });
      }
    }, DRIVE_CONTROL_PERIOD_MS);

    return () => {
      clearInterval(timer);
      if (movingRef.current) {
        void bluetooth.sendStop().catch((error: unknown) => {
          console.error('Không thể dừng xe khi rời cài đặt:', error);
        });
      }
    };
  }, [bluetooth.sendDriveControl, bluetooth.sendStop, sendStop]);

  useEffect(() => {
    if (lastProfileRef.current === activeDriveProfile) return;
    lastProfileRef.current = activeDriveProfile;
    if (!bluetooth.protocolReady) return;
    void bluetooth.applyConfig(activeDriveProfile).catch((error: unknown) => {
      console.error('Không thể đồng bộ cấu hình điều khiển:', error);
    });
  }, [activeDriveProfile, bluetooth.applyConfig, bluetooth.protocolReady]);

  useEffect(() => {
    if (lastLevelRef.current === driveSettings.activeLevel) return;
    lastLevelRef.current = driveSettings.activeLevel;
    void bluetooth.sendLevel(driveSettings.activeLevel).catch((error: unknown) => {
      console.error('Không thể gửi mức tốc độ tới xe:', error);
    });
  }, [bluetooth.sendLevel, driveSettings.activeLevel]);

  const exportProfile = useCallback(async (profile: DriveProfile) => {
    const available = await Sharing.isAvailableAsync();
    if (!available) throw new Error('Chia sẻ tệp không khả dụng trên thiết bị này.');
    const safeName = profile.name.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');
    const file = new File(Paths.cache, `${safeName || 'drive-profile'}.json`);
    file.create({ overwrite: true });
    await file.write(JSON.stringify(profile, null, 2));
    await Sharing.shareAsync(file.uri, {
      dialogTitle: `Xuất ${profile.name}`,
      mimeType: 'application/json',
      UTI: 'public.json',
    });
  }, []);

  const pickImportFile = useCallback(async (): Promise<DriveProfile | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset) throw new Error('Tệp đã chọn không có dữ liệu.');
    const parsed: unknown = JSON.parse(await new File(asset.uri).text());
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Tệp phải chứa một hồ sơ JSON.');
    }
    return normalizeDriveProfile(parsed);
  }, []);

  const handleSelectLevel = useCallback(
    (level: SpeedLevel) => selectSpeedLevel(level),
    [selectSpeedLevel],
  );
  const saveToCar = useCallback(() => {
    void bluetooth.saveConfigToCar(activeDriveProfile).catch((error: unknown) => {
      console.error('Không thể lưu cấu hình vào xe:', error);
    });
  }, [activeDriveProfile, bluetooth.saveConfigToCar]);
  const retrySync = useCallback(() => {
    void bluetooth.retrySync(activeDriveProfile).catch((error: unknown) => {
      console.error('Không thể thử đồng bộ lại:', error);
    });
  }, [activeDriveProfile, bluetooth.retrySync]);
  const testMotor = useCallback(
    (wheel: WheelId, pwm: number) => {
      void bluetooth.testMotor(wheel, pwm).catch((error: unknown) => {
        console.error('Không thể kiểm tra động cơ:', error);
        if (pwm > 0) sendStop();
      });
    },
    [bluetooth.testMotor, sendStop],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <SettingsScreen
        profile={activeDriveProfile}
        profiles={driveSettings.profiles}
        activeProfileId={driveSettings.activeProfileId}
        level={driveSettings.activeLevel}
        ready={driveSettingsReady}
        connected={Boolean(bluetooth.connectedDevice && bluetooth.protocolReady)}
        batteryVoltageMv={bluetooth.batteryVoltageMv}
        syncState={bluetooth.syncState}
        syncError={bluetooth.syncError}
        error={driveSettingsError}
        canUndo={canUndoDriveSettings}
        onUpdateProfile={updateDriveProfile}
        onSelectProfile={selectDriveProfile}
        onSelectLevel={handleSelectLevel}
        onSaveToCar={saveToCar}
        onRetrySync={retrySync}
        onUndo={undoDriveSettings}
        onRestoreDefaults={restoreDriveSettings}
        onSaveAndClose={() => {
          sendStop();
          router.back();
        }}
        onStop={sendStop}
        onControlChange={onControlChange}
        onRotateChange={onRotateChange}
        onTestMotor={testMotor}
        onCreateProfile={createDriveProfile}
        onDuplicateProfile={duplicateDriveProfile}
        onRenameProfile={renameDriveProfile}
        onDeleteProfile={deleteDriveProfile}
        onImportProfile={addDriveProfile}
        onExportProfile={exportProfile}
        onPickImportFile={pickImportFile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
});
