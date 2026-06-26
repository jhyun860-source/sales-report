/**
 * 직원별 월간 인센티브 통계 페이지
 * - 월 선택 (기본: 전달)
 * - 직원명별 근무일수, 주간 근무시간, 월 총 근무시간
 * - 잔추가×5000 + 병추가×10000 + 맥주병×3000 + 영업인센 합산
 * - 주간 평균 인센티브
 * - 관리자: 지점 선택 가능
 */

import { useState, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ChevronLeft, ChevronRight, ArrowLeft, BarChart2, Clock, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';

// 색상 팔레트
const BG = 'oklch(0.985 0.008 85)';
const TEXT = 'oklch(0.12 0.01 50)';
const MUTED = 'oklch(0.5 0.01 50)';
const BORDER = 'oklch(0.75 0.015 85)';
const HEADER_BG = 'oklch(0.93 0.015 85)';
const CARD_BG = 'oklch(0.995 0.005 85)';
const PRIMARY = 'oklch(0.45 0.18 25)';
const ACCENT = 'oklch(0.55 0.15 150)'; // 초록 계열 (근무시간)
const GOLD = 'oklch(0.6 0.12 80)'; // 금색 계열 (인센티브)

function getCurrentMonth(): string {
  const d = new Date();
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

function formatAmount(val: number): string {
  if (!val || val === 0) return '—';
  return `₩${val.toLocaleString('ko-KR')}`;
}

function formatMinutes(mins: number): string {
  if (!mins || mins === 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function formatDiffMinutes(mins: number): string {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = mins > 0 ? '+' : mins < 0 ? '-' : '';
  if (abs === 0) return '±0분';
  if (m === 0) return `${sign}${h}시간`;
  return `${sign}${h}시간 ${m}분`;
}

export default function StaffIncentiveStats() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user: account, loading: authLoading } = useStoreAuth();
  const [yearMonth, setYearMonth] = useState(getCurrentMonth);

  // URL 파라미터에서 branchId 읽기 (관리자가 지점 선택 후 이동 시 전달됨)
  const branchIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    const val = params.get('branchId');
    return val ? Number(val) : undefined;
  }, [search]);

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const { data, isLoading } = trpc.tableReport.staffIncentiveStats.useQuery(
    { yearMonth, branchId: branchIdFromUrl },
    { enabled: !authLoading && !!account }
  );

  const stats = data?.stats ?? [];
  const weekLabels = data?.weekLabels ?? [];

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

  // 전체 합계
  const totalGlass = stats.reduce((s, r) => s + (Number(r.totalGlass) || 0), 0);
  const totalBottle = stats.reduce((s, r) => s + (Number(r.totalBottle) || 0), 0);
  const totalBeer = stats.reduce((s, r) => s + (Number(r.totalBeerBottle) || 0), 0);
  const totalIncentive = stats.reduce((s, r) => s + (r.incentiveAmount || 0), 0);
  const totalWorkMins = stats.reduce((s, r) => s + (r.totalWorkMinutes || 0), 0);
  // 기준시간/차이시간은 직원(staff)만 합산
  const totalStandardMins = stats.filter(r => r.staffType !== 'parttime').reduce((s, r) => s + (r.standardMinutes ?? 0), 0);
  const totalDiffMins = stats.filter(r => r.staffType !== 'parttime').reduce((s, r) => s + (r.workDiffMinutes ?? 0), 0);

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

      <main className="max-w-2xl mx-auto px-4 py-5 pb-10">
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
            {yearMonth === moveMonth(currentYearMonth, -1) && (
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
        {!isLoading && stats.length === 0 && (
          <div
            className="rounded-lg p-8 text-center"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <div className="text-sm" style={{ color: MUTED }}>
              {formatYearMonth(yearMonth)}에 기록된 인센티브 데이터가 없습니다.
            </div>
          </div>
        )}

        {/* 직원별 카드 */}
        {!isLoading && stats.length > 0 && (
          <>
            <div className="space-y-4 mb-5">
              {stats.map((row, idx) => {
                const glass = Number(row.totalGlass) || 0;
                const bottle = Number(row.totalBottle) || 0;
                const beer = Number(row.totalBeerBottle) || 0;
                const salesInc = Number(row.totalSalesIncentive) || 0;
                const incentive = row.incentiveAmount || 0;
                const totalMins = row.totalWorkMinutes || 0;
                const weeklyMins = row.weeklyWorkMinutes || {};
                const weeklyDays = row.weeklyWorkDays || {};
                const avgWeekly = row.avgWeeklyIncentive || 0;
                const workDays = Number(row.workDays) || 0;

                return (
                  <div
                    key={idx}
                    className="rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${BORDER}`, background: CARD_BG }}
                  >
                    {/* 직원명 헤더 */}
                    <div
                      className="px-4 py-3 flex items-center justify-between"
                      style={{ background: HEADER_BG, borderBottom: `1px solid ${BORDER}` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>
                          {row.staffName || '(이름 없음)'}
                        </span>
                        {row.staffType === 'parttime' && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'oklch(0.88 0.04 250)', color: 'oklch(0.35 0.12 250)', fontWeight: 600 }}>알바</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                          <Calendar size={12} />
                          {workDays}일 출근
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: ACCENT }}>
                          <Clock size={12} />
                          월 {formatMinutes(totalMins)}
                        </span>
                      </div>
                    </div>

                    {/* +/- 시간 통계 배너 (직원만 표시) */}
                    {row.staffType !== 'parttime' && (() => {
                      const diff = row.workDiffMinutes ?? 0;
                      const std = row.standardMinutes ?? 0;
                      const isOver = diff > 0;
                      const isUnder = diff < 0;
                      const diffColor = isOver ? 'oklch(0.45 0.15 150)' : isUnder ? 'oklch(0.5 0.2 25)' : MUTED;
                      const DiffIcon = isOver ? TrendingUp : isUnder ? TrendingDown : Minus;
                      return (
                        <div
                          className="px-4 py-2.5 flex items-center justify-between"
                          style={{
                            background: isOver ? 'oklch(0.97 0.015 150)' : isUnder ? 'oklch(0.98 0.015 25)' : 'oklch(0.97 0.006 85)',
                            borderBottom: `1px solid ${BORDER}`,
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <DiffIcon size={13} style={{ color: diffColor }} />
                            <span className="text-xs" style={{ color: MUTED }}>기준 {formatMinutes(std)} 대비</span>
                          </div>
                          <span className="text-sm font-bold" style={{ color: diffColor, fontVariantNumeric: 'tabular-nums' }}>
                            {formatDiffMinutes(diff)}
                          </span>
                        </div>
                      );
                    })()}

                    {/* 주간 근무시간 테이블 (직원 + 아르바이트 모두 표시) */}
                    {weekLabels.length > 0 && (
                      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <div className="px-4 py-2 text-xs font-semibold" style={{ color: MUTED, background: 'oklch(0.97 0.006 85)' }}>
                          주간 근무시간
                        </div>
                        <div className="divide-y" style={{ borderColor: BORDER }}>
                          {weekLabels.map((week) => {
                            const mins = weeklyMins[week] || 0;
                            return (
                              <div key={week} className="px-4 py-2 flex items-center justify-between">
                                <span className="text-xs" style={{ color: MUTED }}>{week}</span>
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: mins > 0 ? ACCENT : MUTED, fontVariantNumeric: 'tabular-nums' }}
                                >
                                  {formatMinutes(mins)}{weeklyDays[week] ? ` (${weeklyDays[week]}일)` : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 인센티브 상세 */}
                    <div className="grid grid-cols-2 gap-0">
                      {[
                        { label: '잔 추가', value: glass > 0 ? `${glass}잔 × ₩5,000` : '—', sub: glass > 0 ? `₩${(glass * 5000).toLocaleString('ko-KR')}` : null, highlight: glass > 0 },
                        { label: '병 추가', value: bottle > 0 ? `${bottle}병 × ₩10,000` : '—', sub: bottle > 0 ? `₩${(bottle * 10000).toLocaleString('ko-KR')}` : null, highlight: bottle > 0 },
                        { label: '맥주 병추가', value: beer > 0 ? `${beer}병 × ₩3,000` : '—', sub: beer > 0 ? `₩${(beer * 3000).toLocaleString('ko-KR')}` : null, highlight: beer > 0 },
                        { label: '영업 인센', value: salesInc > 0 ? `₩${salesInc.toLocaleString('ko-KR')}` : '—', sub: null, highlight: salesInc > 0 },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="px-4 py-2.5"
                          style={{
                            borderBottom: i < 2 ? `1px solid ${BORDER}` : 'none',
                            borderRight: i % 2 === 0 ? `1px solid ${BORDER}` : 'none',
                          }}
                        >
                          <div className="text-xs mb-0.5" style={{ color: MUTED }}>{item.label}</div>
                          <div
                            className="text-xs font-semibold"
                            style={{ color: item.highlight ? TEXT : MUTED, fontVariantNumeric: 'tabular-nums' }}
                          >
                            {item.value}
                          </div>
                          {item.sub && (
                            <div className="text-xs font-bold mt-0.5" style={{ color: GOLD, fontVariantNumeric: 'tabular-nums' }}>
                              {item.sub}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 인센티브 합계 + 주간 평균 */}
                    <div
                      className="px-4 py-3 flex items-center justify-between"
                      style={{ background: 'oklch(0.97 0.01 80)', borderTop: `1px solid ${BORDER}` }}
                    >
                      <div>
                        <div className="text-xs mb-0.5" style={{ color: MUTED }}>월 인센티브 합계</div>
                        <div className="text-base font-bold" style={{ color: PRIMARY, fontVariantNumeric: 'tabular-nums' }}>
                          {incentive > 0 ? `₩${incentive.toLocaleString('ko-KR')}` : '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs mb-0.5 justify-end" style={{ color: MUTED }}>
                          <TrendingUp size={11} />
                          주간 평균
                        </div>
                        <div className="text-sm font-semibold" style={{ color: GOLD, fontVariantNumeric: 'tabular-nums' }}>
                          {avgWeekly > 0 ? `₩${avgWeekly.toLocaleString('ko-KR')}` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 전체 합계 카드 */}
            <div
              className="rounded-lg p-4"
              style={{ background: PRIMARY, color: 'white' }}
            >
              <div className="text-sm font-bold mb-3 opacity-90" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                {formatYearMonth(yearMonth)} 전체 합계
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 text-sm">
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
                <span className="opacity-80 flex items-center gap-1">
                  <Clock size={13} />
                  전체 근무시간
                </span>
                <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMinutes(totalWorkMins)}
                </span>
                <span className="opacity-80">기준 시간 합계</span>
                <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMinutes(totalStandardMins)}
                </span>
                <span className="opacity-80">+/- 시간 합계</span>
                <span
                  className="text-right font-bold"
                  style={{ fontVariantNumeric: 'tabular-nums', color: totalDiffMins > 0 ? 'oklch(0.85 0.12 150)' : totalDiffMins < 0 ? 'oklch(0.9 0.12 25)' : 'white' }}
                >
                  {formatDiffMinutes(totalDiffMins)}
                </span>
                <div className="col-span-2 border-t border-white/30 my-1" />
                <span className="font-bold">인센티브 합계</span>
                <span className="text-right font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalIncentive > 0 ? `₩${totalIncentive.toLocaleString('ko-KR')}` : '—'}
                </span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
