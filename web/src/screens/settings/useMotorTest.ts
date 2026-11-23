import { useCallback, useEffect, useRef } from 'react';
import { TEST_INTERVAL_MS } from '../../protocol/constants';

/** Tốc độ chạy thử 1 bánh (%): đủ quay, không quá mạnh khi xe đang kê trên bàn. */
export const MOTOR_TEST_SPEED = 40;

/**
 * Giữ nút KIỂM TRA -> gửi gói TEST mỗi 100 ms; thả nút -> gửi lệnh dừng.
 * Nếu web bị treo / mất kết nối, xe tự dừng sau 300 ms không nhận gói.
 */
export function useMotorTest(sendTest: (wheel: number | null, speed: number) => boolean) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTest = useCallback(() => {
    if (!timer.current) return;
    clearInterval(timer.current);
    timer.current = null;
    sendTest(null, 0);
    // Lần gửi trước có thể chưa xong -> gửi lại lệnh dừng một lần nữa cho chắc.
    setTimeout(() => sendTest(null, 0), TEST_INTERVAL_MS / 2);
  }, [sendTest]);

  const startTest = useCallback(
    (wheel: number, speed: number) => {
      if (timer.current) clearInterval(timer.current);
      const send = () => sendTest(wheel, speed);
      send();
      timer.current = setInterval(send, TEST_INTERVAL_MS);
    },
    [sendTest],
  );

  // Rời trang hoặc ẩn app -> dừng chạy thử.
  useEffect(() => {
    const onHide = () => document.hidden && stopTest();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      stopTest();
    };
  }, [stopTest]);

  return { startTest, stopTest };
}
