/**
 * PWA 업데이트 감지 훅
 * - Service Worker에 새 버전이 대기 중이면 updateAvailable = true
 * - applyUpdate() 호출 시 SKIP_WAITING 메시지 전송 후 페이지 새로고침
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useUpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    // 컨트롤러 변경 감지 (새 SW가 활성화되면 페이지 새로고침)
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // 주기적 업데이트 확인 (앱 포커스 시)
    const checkUpdate = () => {
      registrationRef.current?.update().catch(() => {});
    };
    window.addEventListener('focus', checkUpdate);

    // SW 등록 확인 및 업데이트 감지 설정
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      registrationRef.current = registration;

      // 이미 대기 중인 SW가 있으면 즉시 알림
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setUpdateAvailable(true);
      }

      // 새 SW가 설치되어 대기 상태로 전환될 때 감지
      const handleUpdateFound = () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        const handleStateChange = () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 새 버전이 설치되어 대기 중
            setWaitingWorker(newWorker);
            setUpdateAvailable(true);
          }
        };
        newWorker.addEventListener('statechange', handleStateChange);
      };

      registration.addEventListener('updatefound', handleUpdateFound);
    });

    // 클린업: 모든 이벤트 리스너 제거
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('focus', checkUpdate);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    try {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      // postMessage 실패 시 강제 새로고침
      window.location.reload();
    }
  }, [waitingWorker]);

  return { updateAvailable, applyUpdate };
}
