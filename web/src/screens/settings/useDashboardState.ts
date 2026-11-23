import { useMemo, useState } from 'react';
import { nearbyDeviceName, type BluetoothValue } from '../../hooks/BluetoothContext';
import type { DashboardState, StatusChipKind } from './types';

/**
 * sync: trạng thái lưu cấu hình xuống xe (Chưa đồng bộ / Đang áp dụng / Đã áp dụng),
 * chỉ hiện thay cho "Đã kết nối" khi đang kết nối.
 */
export function useDashboardState(bt: BluetoothValue, sync: StatusChipKind | null = null): DashboardState {
  const [devStatusOverride, setDevStatusOverride] = useState<StatusChipKind | null>(null);

  // Compute live connection status
  const liveStatus: StatusChipKind = useMemo(() => {
    if (bt.isConnecting) return 'connecting';
    if (bt.error) return 'error';
    if (bt.connectedDevice) return 'connected';
    return 'disconnected';
  }, [bt.isConnecting, bt.error, bt.connectedDevice]);

  const connectionStatus = devStatusOverride ?? (liveStatus === 'connected' && sync ? sync : liveStatus);

  const isDisconnected = connectionStatus === 'disconnected';

  // Battery: only show when valid (> 0), otherwise null
  const battery = useMemo(() => {
    if (bt.batteryVoltageMv !== null && bt.batteryVoltageMv > 0) {
      return `${(bt.batteryVoltageMv / 1000).toFixed(2)} V`;
    }
    return null;
  }, [bt.batteryVoltageMv]);

  const robotName = bt.connectedDevice ? nearbyDeviceName(bt.connectedDevice) : null;

  const cardStates = useMemo(() => {
    if (isDisconnected) {
      return {
        controller: { enabled: true, reason: 'Tiến, lùi, trái, phải' },
        speed: { enabled: true, reason: 'Chậm, vừa, nhanh' },
        wheelType: { enabled: true, reason: 'Standard, Omni, Mecanum' },
        hardware: { enabled: false, reason: 'Cần kết nối xe để thực hiện' },
        motor: { enabled: false, reason: 'Cần kết nối xe để thực hiện' },
        calibrate: { enabled: false, reason: 'Cần kết nối xe để thực hiện' },
        advanced: { enabled: true, reason: 'Ma trận, giới hạn tốc độ, bù từng bánh' },
      };
    }

    return {
      controller: { enabled: true, reason: 'Tiến, lùi, trái, phải' },
      speed: { enabled: true, reason: 'Chậm, vừa, nhanh' },
      wheelType: { enabled: true, reason: 'Standard, Omni, Mecanum' },
      hardware: { enabled: true, reason: 'Board và chân kết nối' },
      motor: { enabled: true, reason: 'Hướng quay và kiểm tra' },
      calibrate: { enabled: true, reason: 'Kiểm tra chuyển động' },
      advanced: { enabled: true, reason: 'Ma trận, giới hạn tốc độ, bù từng bánh' },
    };
  }, [isDisconnected]);

  return {
    connectionStatus,
    robotName,
    chipFamily: 'ESP32',
    battery,
    cardStates,
    devStatusOverride,
    setDevStatusOverride,
  };
}
