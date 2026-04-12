import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // 서비스 워커 등록 및 현재 구독 상태 확인
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      setSwRegistration(reg);
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }).catch((err) => {
      console.error('SW registration failed:', err);
    });
  }, []);

  const subscribe = async () => {
    if (!swRegistration || !VAPID_PUBLIC_KEY) return;
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.error('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
        return;
      }

      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const key = sub.getKey('p256dh');
      const auth = sub.getKey('auth');
      if (!key || !auth) throw new Error('구독 키 없음');

      const p256dhArray = new Uint8Array(key);
      const authArray = new Uint8Array(auth);
      const p256dhStr = Array.from(p256dhArray).map(b => String.fromCharCode(b)).join('');
      const authStr = Array.from(authArray).map(b => String.fromCharCode(b)).join('');

      await subscribeMutation.mutateAsync({
        endpoint: sub.endpoint,
        p256dh: btoa(p256dhStr),
        auth: btoa(authStr),
      });

      setIsSubscribed(true);
      toast.success('푸시 알림이 활성화되었습니다! 저장 시 핸드폰으로 알림이 옵니다.');
    } catch (err) {
      console.error('Subscribe error:', err);
      toast.error('알림 구독에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!swRegistration) return;
    setIsLoading(true);
    try {
      const sub = await swRegistration.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success('푸시 알림이 비활성화되었습니다.');
    } catch (err) {
      console.error('Unsubscribe error:', err);
      toast.error('알림 해제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  return { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe };
}
