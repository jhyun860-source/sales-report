/**
 * 매출 기록 목록 페이지 (서버 기반)
 * - 서버 DB에서 기록 조회
 * - storeAccount 인증 기반
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { ChevronLeft, TrendingUp, Calendar, AlertTriangle, LogIn } from 'lucide-react';
import { formatDateDisplay, calcExpenseTotal, parseAmount } from '@/lib/salesUtils';

// 지난 90일 날짜 범위 계산
function getDateRange(days = 90) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { startDate: fmt(start), endDate: fmt(end) };
}

export default function History() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useStoreAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  // 내 지점 목록
  const myBranches = user?.role === 'admin'
    ? (user.allBranches ?? [])
    : user?.branch ? [user.branch] : [];

  // 첫 번째 지점 자동 선택
  const activeBranchId = selectedBranchId ?? (myBranches.length > 0 ? myBranches[0].id : null);

  const { startDate, endDate } = useMemo(() => getDateRange(90), []);

  // 서버에서 기록 조회
  const { data: records = [], isLoading } = trpc.storeSales.getRecords.useQuery(
    { branchId: activeBranchId!, startDate, endDate },
    { enabled: !!activeBranchId && !!user }
  );

  const fmt = (n: number) => n > 0 ? `₩${n.toLocaleString('ko-KR')}` : '—';

  // 전체 합계
  const totals = useMemo(() => {
    let totalCash = 0, totalCard = 0, totalExpense = 0;
    records.forEach((r: { cash?: string | null; card?: string | null; expenses?: unknown }) => {
      totalCash += parseAmount((r.cash as string) || '0');
      totalCard += parseAmount((r.card as string) || '0');
      totalExpense += calcExpenseTotal((r.expenses as any[]) || []);
    });
    return { totalCash, totalCard, totalExpense };
  }, [records]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <div className="text-sm" style={{ color: 'oklch(0.45 0.01 50)' }}>불러오는 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
            매출 일일 보고
          </h1>
          <p className="text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>로그인 후 이용하실 수 있습니다</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white"
          style={{ background: 'oklch(0.45 0.18 25)' }}
        >
          <LogIn size={16} />
          로그인
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.985 0.008 85)' }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'oklch(0.98 0.01 85)',
          borderColor: 'oklch(0.7 0.015 85)',
          boxShadow: '0 1px 4px oklch(0 0 0 / 0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-black/8 active:bg-black/15 transition-colors"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <span className="text-base font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
            매출 기록
          </span>
        </div>

        {/* 지점 선택 (관리자만) */}
        {user.role === 'admin' && myBranches.length > 1 && (
          <select
            value={activeBranchId ?? ''}
            onChange={e => setSelectedBranchId(Number(e.target.value))}
            className="text-sm px-2 py-1 rounded border outline-none"
            style={{
              background: 'oklch(0.97 0.008 85)',
              borderColor: 'oklch(0.75 0.015 85)',
              color: 'oklch(0.25 0.01 50)',
            }}
          >
            {myBranches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-12">
        {/* 현재 지점 표시 */}
        {activeBranchId && myBranches.find(b => b.id === activeBranchId) && (
          <div className="flex items-center gap-1.5 mb-4">
            <Calendar size={14} style={{ color: 'oklch(0.45 0.18 25)' }} />
            <span className="text-sm font-semibold" style={{ color: 'oklch(0.35 0.01 50)' }}>
              {myBranches.find(b => b.id === activeBranchId)?.name} · 최근 90일
            </span>
          </div>
        )}

        {/* 전체 합계 카드 */}
        {records.length > 0 && (
          <div
            className="mb-5 rounded-lg p-4"
            style={{ background: 'oklch(0.45 0.18 25)', color: 'white' }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp size={15} className="opacity-80" />
              <span className="text-sm font-semibold opacity-90" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                기간 합계 ({records.length}일)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="opacity-70 text-xs mb-0.5">현금</div>
                <div className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(totals.totalCash)}
                </div>
              </div>
              <div>
                <div className="opacity-70 text-xs mb-0.5">카드</div>
                <div className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(totals.totalCard)}
                </div>
              </div>
              <div>
                <div className="opacity-70 text-xs mb-0.5">합계</div>
                <div className="font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(totals.totalCash + totals.totalCard)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 기록 목록 */}
        {isLoading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>
            불러오는 중...
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm" style={{ color: 'oklch(0.55 0.01 50)' }}>
              최근 90일간 기록이 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record: { id: number; date: string; cash?: string | null; card?: string | null; expenses?: unknown }) => {
              const cash = parseAmount(record.cash || '0');
              const card = parseAmount(record.card || '0');
              const dailyTotal = cash + card;
              const expenseTotal = calcExpenseTotal(record.expenses as any[] || []);

              return (
                <div
                  key={record.id}
                  onClick={() => navigate('/')}
                  className="rounded-lg px-4 py-3 cursor-pointer transition-all active:scale-99"
                  style={{
                    background: 'oklch(0.995 0.005 85)',
                    border: '1px solid oklch(0.78 0.015 85)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
                        {formatDateDisplay(record.date)}
                      </div>
                      <div className="text-xs mt-0.5 flex gap-2" style={{ color: 'oklch(0.55 0.01 50)' }}>
                        <span>현금 {cash > 0 ? `₩${cash.toLocaleString('ko-KR')}` : '—'}</span>
                        <span>·</span>
                        <span>카드 {card > 0 ? `₩${card.toLocaleString('ko-KR')}` : '—'}</span>
                        {expenseTotal > 0 && (
                          <>
                            <span>·</span>
                            <span>지출 ₩{expenseTotal.toLocaleString('ko-KR')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-base font-bold"
                        style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.45 0.18 25)' }}
                      >
                        {dailyTotal > 0 ? `₩${dailyTotal.toLocaleString('ko-KR')}` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
