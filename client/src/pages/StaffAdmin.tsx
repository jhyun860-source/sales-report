import { useLocation } from "wouter";

export default function StaffAdmin() {
  const [, navigate] = useLocation();

  const BG = 'oklch(0.97 0.01 85)';
  const BORDER = 'oklch(0.88 0.01 85)';
  const HEADER_BG = 'oklch(0.93 0.015 85)';
  const TEXT = 'oklch(0.12 0.01 50)';
  const MUTED = 'oklch(0.55 0.01 50)';

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <header className="sticky top-0 z-10" style={{ background: BG, borderBottom: `1px solid ${BORDER}`, boxShadow: '0 1px 4px oklch(0 0 0 / 0.07)' }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="text-sm font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>직원 관리</div>
          <button
            onClick={() => navigate('/table-report')}
            className="px-2.5 py-1.5 rounded text-xs font-medium"
            style={{ background: HEADER_BG, color: TEXT, border: `1px solid ${BORDER}` }}
          >
            테이블 기록으로
          </button>
        </div>
      </header>
      <div className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>
        곧 이 화면에서 지점별 직원을 등록하고, 테이블 기록에서 이름을 선택할 수 있게 됩니다.
      </div>
    </div>
  );
}
