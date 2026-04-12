/**
 * PWA 업데이트 알림 배너
 * - 새 버전이 감지되면 화면 상단에 배너 표시
 * - "지금 업데이트" 버튼 클릭 시 즉시 새 버전으로 전환
 */
import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useUpdateNotifier } from '@/hooks/useUpdateNotifier';

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useUpdateNotifier();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="앱 업데이트 알림"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 text-white text-sm"
      style={{
        background: 'oklch(0.35 0.15 250)',
        boxShadow: '0 2px 8px oklch(0 0 0 / 0.2)',
      }}
    >
      <div className="flex items-center gap-2">
        <RefreshCw size={15} className="flex-shrink-0 opacity-90" aria-hidden="true" />
        <span className="font-medium">새 버전이 있습니다</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={applyUpdate}
          className="px-3 py-1 rounded text-xs font-bold transition-all active:scale-95"
          style={{
            background: 'oklch(1 0 0 / 0.2)',
            border: '1px solid oklch(1 0 0 / 0.3)',
          }}
          aria-label="지금 업데이트 적용"
        >
          지금 업데이트
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
          aria-label="업데이트 알림 닫기"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
