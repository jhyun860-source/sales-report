/**
 * 관리자 통합 대시보드
 * - 전 지점 매출 현황 한눈에 보기
 * - 날짜별 지점별 매출 비교
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { ChevronLeft, ChevronRight, Settings, FileText, LogOut } from 'lucide-react';
import { getTodayString, formatDateDisplay } from '@/lib/salesUtils';

function moveDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  // 이동한 날짜가 일요일이면 같은 방향으로 한 칸 더 이동
  if (d.getDay() === 0) d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useStoreAuth();
  const [currentDate, setCurrentDate] = useState(getTodayString);

  const today = getTodayString();
  const isToday = currentDate === today;

  // 전 지점 매출 조회 (adminDailyDetail: [{branch, record}])
  const { data: dailyDetail = [], isLoading } = trpc.storeSales.adminDailyDetail.useQuery(
    { date: currentDate },
    { enabled: !!user && user.role === 'admin' }
  );

  // 합계 계산
  const totals = useMemo(() => {
    return dailyDetail.reduce(
      (acc: { cash: number; card: number; cashTotal: number; cardTotal: number; expenses: number }, item: { branch: { id: number; name: string }; record: { cash: string | null; card: string | null; cashTotal: string | null; cardTotal: string | null; expenses: unknown } | null }) => ({
        cash: acc.cash + (Number(item.record?.cash) || 0),
        card: acc.card + (Number(item.record?.card) || 0),
        cashTotal: acc.cashTotal + (Number(item.record?.cashTotal) || 0),
        cardTotal: acc.cardTotal + (Number(item.record?.cardTotal) || 0),
        expenses: acc.expenses + (Array.isArray(item.record?.expenses)
          ? (item.record!.expenses as { amount: string }[]).reduce((s, e) => s + (parseInt(e.amount || '0', 10) || 0), 0)
          : 0),
      }),
      { cash: 0, card: 0, cashTotal: 0, cardTotal: 0, expenses: 0 }
    );
  }, [dailyDetail]);

  const fmt = (n: number) => n > 0 ? `₩${n.toLocaleString('ko-KR')}` : '—';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <div className="text-sm" style={{ color: 'oklch(0.45 0.01 50)' }}>불러오는 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <p className="text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>로그인이 필요합니다</p>
        <button onClick={() => navigate('/login')} className="px-4 py-2 rounded text-sm font-bold text-white" style={{ background: 'oklch(0.45 0.18 25)' }}>
          로그인
        </button>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <p className="text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>관리자만 접근할 수 있습니다</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 rounded text-sm font-bold text-white" style={{ background: 'oklch(0.45 0.18 25)' }}>
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.985 0.008 85)' }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'oklch(0.98 0.01 85)', borderColor: 'oklch(0.7 0.015 85)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.08)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
            전지점 통합 현황
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/manage')}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.25 0.01 50)', border: '1px solid oklch(0.75 0.015 85)' }}
          >
            <Settings size={15} />
            관리
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.25 0.01 50)', border: '1px solid oklch(0.75 0.015 85)' }}
          >
            <FileText size={15} />
            입력
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.45 0.18 25)', border: '1px solid oklch(0.75 0.015 85)' }}
          >
            <LogOut size={15} />
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* 날짜 네비게이터 */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setCurrentDate(d => moveDate(d, -1))} className="p-2 rounded-full hover:bg-black/8 transition-colors">
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="text-center flex-1">
            <div className="date-header">{formatDateDisplay(currentDate)}</div>
            {!isToday && (
              <button onClick={() => setCurrentDate(today)} className="text-xs text-primary mt-0.5 underline underline-offset-2">
                오늘로 이동
              </button>
            )}
          </div>
          <button onClick={() => setCurrentDate(d => moveDate(d, 1))} disabled={isToday} className="p-2 rounded-full hover:bg-black/8 transition-colors disabled:opacity-30">
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* 전체 합계 카드 */}
        <div className="rounded-lg p-4 mb-5" style={{ background: 'oklch(0.45 0.18 25)', color: 'white' }}>
          <div className="text-sm font-semibold mb-3 opacity-90" style={{ fontFamily: "'Noto Serif KR', serif" }}>
            전지점 합계
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="opacity-80">오늘 현금</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.cash)}</span>
            <span className="opacity-80">오늘 카드</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.card)}</span>
            <span className="opacity-80">지출 합계</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.expenses)}</span>
            <div className="col-span-2 border-t border-white/30 my-1" />
            <span className="opacity-80 text-xs">현금 누적</span>
            <span className="text-right font-semibold text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.cashTotal)}</span>
            <span className="opacity-80 text-xs">카드 누적</span>
            <span className="text-right font-semibold text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.cardTotal)}</span>
            <span className="font-bold">총 누적</span>
            <span className="text-right font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totals.cashTotal + totals.cardTotal)}</span>
          </div>
        </div>

        {/* 지점별 현황 */}
        <div className="section-title mb-3">■ 지점별 현황</div>

        {isLoading ? (
          <div className="text-center py-8 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>불러오는 중...</div>
        ) : dailyDetail.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>
            등록된 지점이 없습니다.{' '}
            <button onClick={() => navigate('/admin/manage')} className="underline" style={{ color: 'oklch(0.45 0.18 25)' }}>
              지점 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyDetail.map((item: { branch: { id: number; name: string }; record: { cash: string | null; card: string | null; cashTotal: string | null; cardTotal: string | null; expenses: unknown } | null; tableReport: { id: number; teamCount: number; cashAmount: string; cardAmount: string; notes: string | null; items: { id: number; tableNumber: string; guestType: string; guestName: string | null; amount: string; paymentMethod: string; memo: string | null }[]; incentives: { id: number; staffName: string; staffType: string; glassCount: number; bottleCount: number; beerBottleCount: number; salesIncentive: string; workStart: string | null; workEnd: string | null }[] } | null }) => {
              const branch = item.branch;
              const rec = item.record;
              const tr = item.tableReport;
              const cash = Number(rec?.cash || 0);
              const card = Number(rec?.card || 0);
              const cashTotal = Number(rec?.cashTotal || 0);
              const cardTotal = Number(rec?.cardTotal || 0);
              const expTotal = rec && Array.isArray(rec.expenses)
                ? (rec.expenses as { amount: string }[]).reduce((s, e) => s + (parseInt(e.amount || '0', 10) || 0), 0)
                : 0;
              const hasData = cash > 0 || card > 0;
              const hasTableData = !!tr && (tr.items.length > 0 || tr.incentives.length > 0 || tr.teamCount > 0);

              return (
                <div
                  key={branch.id}
                  className="rounded-lg p-4"
                  style={{ background: 'oklch(0.995 0.005 85)', border: `1px solid ${hasData ? 'oklch(0.75 0.015 85)' : 'oklch(0.82 0.01 85)'}` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
                      {branch.name}
                    </span>
                    {!hasData && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'oklch(0.88 0.01 85)', color: 'oklch(0.55 0.01 50)' }}>
                        미입력
                      </span>
                    )}
                    {hasData && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'oklch(0.9 0.08 150)', color: 'oklch(0.35 0.12 150)' }}>
                        입력 완료
                      </span>
                    )}
                  </div>
                  {hasData ? (
                    <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                      <span style={{ color: 'oklch(0.45 0.01 50)' }}>현금</span>
                      <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.12 0.01 50)' }}>{fmt(cash)}</span>
                      <span style={{ color: 'oklch(0.45 0.01 50)' }}>카드</span>
                      <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.12 0.01 50)' }}>{fmt(card)}</span>
                      {expTotal > 0 && (
                        <>
                          <span style={{ color: 'oklch(0.45 0.01 50)' }}>지출</span>
                          <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.12 0.01 50)' }}>{fmt(expTotal)}</span>
                        </>
                      )}
                      <div className="col-span-2 border-t my-1" style={{ borderColor: 'oklch(0.82 0.01 85)' }} />
                      <span className="text-xs" style={{ color: 'oklch(0.45 0.01 50)' }}>현금 누적</span>
                      <span className="text-right text-xs font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.12 0.01 50)' }}>{fmt(cashTotal)}</span>
                      <span className="text-xs" style={{ color: 'oklch(0.45 0.01 50)' }}>카드 누적</span>
                      <span className="text-right text-xs font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.12 0.01 50)' }}>{fmt(cardTotal)}</span>
                      <span className="font-bold text-sm" style={{ color: 'oklch(0.25 0.01 50)' }}>오늘 합계</span>
                      <span className="text-right font-bold text-sm" style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.45 0.18 25)' }}>{fmt(cash + card)}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-center py-2" style={{ color: 'oklch(0.65 0.01 50)' }}>
                      아직 매출이 입력되지 않았습니다
                    </div>
                  )}
                  {/* 테이블 기록 섹션 */}
                  {hasTableData && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold mb-1.5" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.35 0.01 50)' }}>■ 테이블 기록 ({tr!.items.length}건 / 팀수 {tr!.teamCount})</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'oklch(0.93 0.015 85)' }}>
                            <th style={{ padding: '3px 6px', textAlign: 'left', borderBottom: '1px solid oklch(0.78 0.015 85)', color: 'oklch(0.35 0.01 50)', fontWeight: 600 }}>손님</th>
                            <th style={{ padding: '3px 6px', textAlign: 'right', borderBottom: '1px solid oklch(0.78 0.015 85)', color: 'oklch(0.35 0.01 50)', fontWeight: 600 }}>결제</th>
                            <th style={{ padding: '3px 6px', textAlign: 'right', borderBottom: '1px solid oklch(0.78 0.015 85)', color: 'oklch(0.35 0.01 50)', fontWeight: 600 }}>금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tr!.items.map((item, idx) => (
                            <tr key={item.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'oklch(0.97 0.005 85)' }}>
                              <td style={{ padding: '3px 6px', color: 'oklch(0.25 0.01 50)' }}>
                                {item.guestName || (item.guestType === 'walking' ? '워킹' : item.guestType === 'regular' ? '기존' : '지명')}
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', color: item.paymentMethod === 'card' ? 'oklch(0.35 0.15 250)' : 'oklch(0.35 0.15 150)' }}>
                                {item.paymentMethod === 'card' ? '카드' : '현금'}
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'oklch(0.12 0.01 50)' }}>
                                {Number(item.amount).toLocaleString('ko-KR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '1px solid oklch(0.78 0.015 85)', background: 'oklch(0.93 0.015 85)' }}>
                            <td colSpan={2} style={{ padding: '3px 6px', fontWeight: 700, color: 'oklch(0.25 0.01 50)' }}>합계</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'oklch(0.45 0.18 25)' }}>
                              {tr!.items.reduce((s, i) => s + Number(i.amount), 0).toLocaleString('ko-KR')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                      {tr!.notes && (
                        <div className="mt-1.5 text-xs" style={{ color: 'oklch(0.45 0.01 50)' }}>기타: {tr!.notes}</div>
                      )}
                      {/* 출근자 인센티브 섹션 */}
                      {tr!.incentives && tr!.incentives.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold mb-1.5" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.35 0.01 50)' }}>■ 출근자 인센티브 ({tr!.incentives.length}명)</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: 'oklch(0.93 0.015 85)' }}>
                                <th style={{ padding: '3px 6px', textAlign: 'left', borderBottom: '1px solid oklch(0.78 0.015 85)', color: 'oklch(0.35 0.01 50)', fontWeight: 600 }}>직원</th>
                                <th style={{ padding: '3px 6px', textAlign: 'right', borderBottom: '1px solid oklch(0.78 0.015 85)', color: 'oklch(0.35 0.01 50)', fontWeight: 600 }}>잔추</th>
                                <th style={{ padding: '3px 6px', textAlign: 'right', borderBottom: '1px solid oklch(0.78 0.015 85)', color: 'oklch(0.35 0.01 50)', fontWeight: 600 }}>병추</th>
                                <th style={{ padding: '3px 6px', textAlign: 'right', borderBottom: '1px solid oklch(0.78 0.015 85)', color: 'oklch(0.35 0.01 50)', fontWeight: 600 }}>맥주</th>
                                <th style={{ padding: '3px 6px', textAlign: 'right', borderBottom: '1px solid oklch(0.78 0.015 85)', color: 'oklch(0.35 0.01 50)', fontWeight: 600 }}>영업인센</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tr!.incentives.map((inc, idx) => (
                                <tr key={inc.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'oklch(0.97 0.005 85)' }}>
                                  <td style={{ padding: '3px 6px', color: 'oklch(0.25 0.01 50)', fontWeight: 600 }}>
                                    {inc.staffName}
                                    {(inc.workStart || inc.workEnd) && (() => {
                                      const timeStr = `(${inc.workStart || '?'}~${inc.workEnd || '?'})`;
                                      let badgeEl = null;
                                      if (inc.workStart && inc.workEnd) {
                                        const [sh, sm] = inc.workStart.split(':').map(Number);
                                        const [eh, em] = inc.workEnd.split(':').map(Number);
                                        let startMin = sh * 60 + sm;
                                        let endMin = eh * 60 + em;
                                        if (endMin <= startMin) endMin += 24 * 60;
                                        const diff = endMin - startMin;
                                        if (inc.staffType === 'parttime') {
                                          const h = Math.floor(diff / 60);
                                          const m = diff % 60;
                                          const label = `${h > 0 ? `${h}시간` : ''}${m > 0 ? `${m}분` : h === 0 ? '0분' : ''}`;
                                          badgeEl = <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 700, background: 'oklch(0.45 0.18 25)', color: 'white', borderRadius: 3, padding: '1px 5px' }}>{label}</span>;
                                        } else {
                                          const diffFromStd = diff - 420;
                                          const absH = Math.floor(Math.abs(diffFromStd) / 60);
                                          const absM = Math.abs(diffFromStd) % 60;
                                          const label = diffFromStd === 0 ? '✓'
                                            : diffFromStd > 0 ? `+${absH > 0 ? `${absH}시간` : ''}${absM > 0 ? `${absM}분` : ''}`
                                            : `-${absH > 0 ? `${absH}시간` : ''}${absM > 0 ? `${absM}분` : ''}`;
                                          const bg = diffFromStd >= 0 ? 'oklch(0.45 0.15 150)' : 'oklch(0.55 0.2 25)';
                                          badgeEl = <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 700, background: bg, color: 'white', borderRadius: 3, padding: '1px 5px' }}>{label}</span>;
                                        }
                                      }
                                      return <><span className="ml-1" style={{ fontWeight: 400, color: 'oklch(0.55 0.01 50)' }}>{timeStr}</span>{badgeEl}</>;
                                    })()}
                                  </td>
                                  <td style={{ padding: '3px 6px', textAlign: 'right', color: 'oklch(0.25 0.01 50)' }}>{inc.glassCount > 0 ? inc.glassCount : '-'}</td>
                                  <td style={{ padding: '3px 6px', textAlign: 'right', color: 'oklch(0.25 0.01 50)' }}>{inc.bottleCount > 0 ? inc.bottleCount : '-'}</td>
                                  <td style={{ padding: '3px 6px', textAlign: 'right', color: 'oklch(0.25 0.01 50)' }}>{inc.beerBottleCount > 0 ? inc.beerBottleCount : '-'}</td>
                                  <td style={{ padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: Number(inc.salesIncentive) > 0 ? 'oklch(0.45 0.18 25)' : 'oklch(0.55 0.01 50)' }}>
                                    {Number(inc.salesIncentive) > 0 ? Number(inc.salesIncentive).toLocaleString('ko-KR') : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
