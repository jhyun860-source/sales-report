/**
 * 직원별 월간 인센티브 통계 페이지
 * - 월 선택 (기본: 전달)
 * - 직원명별 잔추가 / 병추가 / 맥주병추가 / 영업인센 합계 표시
 * - 관리자: 지점 선택 가능
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, ArrowLeft, BarChart2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';

// 색상 팔레트 (Home.tsx와 동일)
const BG = 'oklch(0.985 0.008 85)';
const TEXT = 'oklch(0.12 0.01 50)';
const MUTED = 'oklch(0.5 0.01 50)';
const BORDER = 'oklch(0.75 0.015 85)';
const HEADER_BG = 'oklch(0.93 0.015 85)';
const CARD_BG = 'oklch(0.995 0.005 85)';
const PRIMARY = 'oklch(0.45 0.18 25)';

function getPrevMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}년 ${Number(m)}월`;
}

function moveMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatAmount(val: string | number | null | undefined): string {
  if (!val) return '—';
  const n = Number(val);
  if (isNaN(n) || n === 0) return '—';
  return `₩${n.toLocaleString('ko-KR')}`;
}

function formatCount(val: number | null | undefined): string {
  if (!val || Number(val) === 0) return '—';
  return `${Number(val)}`;
}

export default function StaffIncentiveStats() {
  const [, navigate] = useLocation();
  const { user: account, loading: authLoading } = useStoreAuth();
  const [yearMonth, setYearMonth] = useState(getPrevMonth);

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const { data: stats, isLoading } = trpc.tableReport.staffIncentiveStats.useQuery(
    { yearMonth },
    { enabled: !authLoading && !!account }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-sm" style={{ color: MUTED }}>불러오는 중...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
        <div className="text-base font-semibold" style={{ color: TEXT }}>로그인이 필요합니다</div>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 rounded text-sm text-white font-medium"
          style={{ background: PRIMARY }}
        >
          로그인
        </button>
      </div>
    );
  }

  const totalGlass = stats?.reduce((s, r) => s + (Number(r.totalGlass) || 0), 0) ?? 0;
  const totalBottle = stats?.reduce((s, r) => s + (Number(r.totalBottle) || 0), 0) ?? 0;
  const totalBeer = stats?.reduce((s, r) => s + (Number(r.totalBeerBottle) || 0), 0) ?? 0;
  const totalSales = stats?.reduce((s, r) => s + (Number(r.totalSalesIncentive) || 0), 0) ?? 0;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          background: HEADER_BG,
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: '0 1px 4px oklch(0 0 0 / 0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-full"
            style={{ color: TEXT }}
            aria-label="뒤로"
          >
            <ArrowLeft size={18} />
          </button>
          <BarChart2 size={16} style={{ color: PRIMARY }} />
          <span className="text-base font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>
            직원 인센티브 통계
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-10">
        {/* 월 선택 네비게이터 */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setYearMonth(m => moveMonth(m, -1))}
            className="p-2 rounded-full"
            style={{ color: TEXT }}
            aria-label="이전 달"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>
              {formatYearMonth(yearMonth)}
            </div>
            {yearMonth === getPrevMonth() && (
              <div className="text-xs mt-0.5" style={{ color: PRIMARY }}>전달</div>
            )}
            {yearMonth === currentYearMonth && (
              <div className="text-xs mt-0.5" style={{ color: MUTED }}>이번 달</div>
            )}
          </div>
          <button
            onClick={() => setYearMonth(m => moveMonth(m, 1))}
            disabled={yearMonth >= currentYearMonth}
            className="p-2 rounded-full disabled:opacity-30"
            style={{ color: TEXT }}
            aria-label="다음 달"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* 로딩 */}
        {isLoading && (
          <div className="text-center py-10 text-sm" style={{ color: MUTED }}>
            집계 중...
          </div>
        )}

        {/* 데이터 없음 */}
        {!isLoading && (!stats || stats.length === 0) && (
          <div
            className="rounded-lg p-8 text-center"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <div className="text-sm" style={{ color: MUTED }}>
              {formatYearMonth(yearMonth)}에 기록된 인센티브 데이터가 없습니다.
            </div>
          </div>
        )}

        {/* 통계 테이블 */}
        {!isLoading && stats && stats.length > 0 && (
          <>
            {/* 직원별 카드 */}
            <div className="space-y-3 mb-5">
              {stats.map((row, idx) => (
                <div
                  key={idx}
                  className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${BORDER}`, background: CARD_BG }}
                >
                  {/* 직원명 헤더 */}
                  <div
                    className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: HEADER_BG, borderBottom: `1px solid ${BORDER}` }}
                  >
                    <span className="font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>
                      {row.staffName || '(이름 없음)'}
                    </span>
                    <span className="text-xs" style={{ color: MUTED }}>
                      {Number(row.workDays) || 0}일 출근
                    </span>
                  </div>

                  {/* 인센티브 상세 */}
                  <div className="grid grid-cols-2 gap-0">
                    {[
                      { label: '잔 추가', value: `${formatCount(row.totalGlass)}잔`, highlight: Number(row.totalGlass) > 0 },
                      { label: '병 추가', value: `${formatCount(row.totalBottle)}병`, highlight: Number(row.totalBottle) > 0 },
                      { label: '맥주 병추가', value: `${formatCount(row.totalBeerBottle)}병`, highlight: Number(row.totalBeerBottle) > 0 },
                      { label: '영업 인센', value: formatAmount(row.totalSalesIncentive), highlight: Number(row.totalSalesIncentive) > 0 },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="px-4 py-2.5 flex items-center justify-between"
                        style={{
                          borderBottom: i < 2 ? `1px solid ${BORDER}` : 'none',
                          borderRight: i % 2 === 0 ? `1px solid ${BORDER}` : 'none',
                        }}
                      >
                        <span className="text-xs" style={{ color: MUTED }}>{item.label}</span>
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: item.highlight ? TEXT : MUTED,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 전체 합계 카드 */}
            <div
              className="rounded-lg p-4"
              style={{ background: PRIMARY, color: 'white' }}
            >
              <div className="text-sm font-bold mb-3 opacity-90" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                {formatYearMonth(yearMonth)} 전체 합계
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="opacity-80">잔 추가 합계</span>
                <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalGlass > 0 ? `${totalGlass}잔` : '—'}
                </span>
                <span className="opacity-80">병 추가 합계</span>
                <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalBottle > 0 ? `${totalBottle}병` : '—'}
                </span>
                <span className="opacity-80">맥주 병추가 합계</span>
                <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalBeer > 0 ? `${totalBeer}병` : '—'}
                </span>
                <div className="col-span-2 border-t border-white/30 my-1" />
                <span className="font-bold">영업 인센 합계</span>
                <span className="text-right font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalSales > 0 ? `₩${totalSales.toLocaleString('ko-KR')}` : '—'}
                </span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
