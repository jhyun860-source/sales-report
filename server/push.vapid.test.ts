import { describe, it, expect } from 'vitest';

describe('VAPID 키 설정 검증', () => {
  it('VAPID_PUBLIC_KEY 환경변수가 설정되어 있어야 한다', () => {
    const key = process.env.VAPID_PUBLIC_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
  });

  it('VAPID_PRIVATE_KEY 환경변수가 설정되어 있어야 한다', () => {
    const key = process.env.VAPID_PRIVATE_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
  });

  it('VITE_VAPID_PUBLIC_KEY 환경변수가 설정되어 있어야 한다', () => {
    const key = process.env.VITE_VAPID_PUBLIC_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
  });

  it('web-push 모듈로 VAPID 키 유효성 검증', async () => {
    const webpush = await import('web-push');
    const publicKey = process.env.VAPID_PUBLIC_KEY!;
    const privateKey = process.env.VAPID_PRIVATE_KEY!;
    
    // VAPID 설정이 오류 없이 완료되어야 함
    expect(() => {
      webpush.setVapidDetails(
        'mailto:test@test.com',
        publicKey,
        privateKey
      );
    }).not.toThrow();
  });
});
