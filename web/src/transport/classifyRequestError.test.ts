import { describe, expect, it } from 'vitest';
import { classifyRequestError } from './BleTransport';

const notFound = (message: string) => new DOMException(message, 'NotFoundError');

describe('classifyRequestError', () => {
  it('bấm Hủy -> không báo lỗi', () => {
    expect(classifyRequestError(notFound('User cancelled the requestDevice() chooser.'))).toEqual({
      error: null,
      errorCode: null,
    });
  });

  it('Brave chặn Web Bluetooth -> disabled (trước đây bị nuốt mất)', () => {
    expect(classifyRequestError(notFound('Web Bluetooth API globally disabled.')).errorCode).toBe('disabled');
  });

  it('Bluetooth tắt -> adapter-off', () => {
    expect(classifyRequestError(notFound('Bluetooth adapter not available.')).errorCode).toBe('adapter-off');
  });

  it('thiếu quyền -> permission', () => {
    expect(classifyRequestError(new DOMException('Permission denied', 'NotAllowedError')).errorCode).toBe('permission');
  });

  it('lỗi lạ vẫn hiện thông báo, không im lặng', () => {
    const r = classifyRequestError(new Error('boom'));
    expect(r.errorCode).toBe('other');
    expect(r.error).toContain('boom');
  });
});
