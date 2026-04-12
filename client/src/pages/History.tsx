/**
 * 매출 기록 목록 페이지
 * Design: 장부/영수증 감성
 * - 날짜별 기록 목록
 * - 당일 합계, 지출 표시
 * - 기록 삭제 기능
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, Trash2, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import {
  type DailySalesRecord,
  formatDateDisplay,
  calcExpenseTotal,
  calcDailyTotal,
  parseAmount,
  loadRecords,
  saveRecords,
  getDateList,
} from '@/lib/salesUtils';

function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  date,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  date: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'oklch(0 0 0 / 0.5)' }}>
      <div
        className="w-full max-w-sm rounded-xl p-5"
        style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={20} style={{ color: 'oklch(0.45 0.18 25)' }} />
          <span className="font-bold text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>
            기록 삭제
          </span>
        </div>
        <p className="text-sm mb-5" style={{ color: 'oklch(0.35 0.01 50)' }}>
          <strong>{formatDateDisplay(date)}</strong>의 기록을 삭제하시겠습니까?<br />
          삭제된 데이터는 복구할 수 없습니다.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
            style={{
              background: 'oklch(0.92 0.015 85)',
              color: 'oklch(0.25 0.01 50)',
              border: '1px solid oklch(0.75 0.015 85)',
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
            style={{ background: 'oklch(0.45 0.18 25)' }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const [, navigate] = useLocation();
  const [records, setRecords] = useState<DailySalesRecord[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const dateList = getDateList(records);

  const getRecord = (date: string) => records.find(r => r.date === date);

  const handleDelete = (date: string) => {
    setDeleteTarget(date);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated = records.filter(r => r.date !== deleteTarget);
    setRecords(updated);
    saveRecords(updated);
    setDeleteTarget(null);
  };

  // 전체 통계
  const totalCash = records.reduce((s, r) => s + parseAmount(r.cash), 0);
  const totalCard = records.reduce((s, r) => s + parseAmount(r.card), 0);
  const totalExpense = records.reduce((s, r) => s + calcExpenseTotal(r.expenses), 0);

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.985 0.008 85)' }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          background: 'oklch(0.98 0.01 85)',
          borderColor: 'oklch(0.7 0.015 85)',
          boxShadow: '0 1px 4px oklch(0 0 0 / 0.08)',
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-full hover:bg-black/8 transition-colors"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <span
          className="text-base font-bold"
          style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}
        >
          매출 기록
        </span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-10">
        {/* 전체 통계 */}
        {records.length > 0 && (
          <div
            className="mb-5 rounded-xl p-4"
            style={{ background: 'oklch(0.45 0.18 25)', color: 'white' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} />
              <span className="text-sm font-semibold opacity-90" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                전체 누적 ({records.length}일)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs opacity-70 mb-0.5">현금 합계</div>
                <div className="text-sm font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalCash.toLocaleString('ko-KR')}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70 mb-0.5">카드 합계</div>
                <div className="text-sm font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalCard.toLocaleString('ko-KR')}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70 mb-0.5">지출 합계</div>
                <div className="text-sm font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {totalExpense.toLocaleString('ko-KR')}
                </div>
              </div>
            </div>
            <div className="border-t border-white/30 mt-3 pt-2 text-center">
              <span className="text-xs opacity-70">총 매출 합계 </span>
              <span className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ₩{(totalCash + totalCard).toLocaleString('ko-KR')}
              </span>
            </div>
          </div>
        )}

        {/* 기록 목록 */}
        {dateList.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm text-muted-foreground">저장된 기록이 없습니다.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'oklch(0.45 0.18 25)' }}
            >
              오늘 매출 입력하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dateList.map(date => {
              const rec = getRecord(date);
              if (!rec) return null;
              const dailyTotal = calcDailyTotal(rec.cash, rec.card);
              const expenseTotal = calcExpenseTotal(rec.expenses);
              const hasData = rec.cash || rec.card || expenseTotal > 0;

              return (
                <div
                  key={date}
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: 'oklch(0.995 0.005 85)',
                    border: '1px solid oklch(0.75 0.015 85)',
                    boxShadow: '0 1px 3px oklch(0 0 0 / 0.05)',
                  }}
                >
                  <button
                    className="w-full text-left px-4 py-3 flex items-center justify-between active:bg-black/5 transition-colors"
                    onClick={() => navigate('/')}
                  >
                    <div>
                      <div
                        className="font-semibold text-sm mb-0.5"
                        style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.15 0.01 50)' }}
                      >
                        {formatDateDisplay(date)}
                      </div>
                      {hasData ? (
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'oklch(0.5 0.01 50)' }}>
                          <span>현금 {rec.cash ? parseAmount(rec.cash).toLocaleString('ko-KR') : '—'}</span>
                          <span>카드 {rec.card ? parseAmount(rec.card).toLocaleString('ko-KR') : '—'}</span>
                          {expenseTotal > 0 && <span>지출 {expenseTotal.toLocaleString('ko-KR')}</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">데이터 없음</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {dailyTotal > 0 && (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">합계</div>
                          <div
                            className="font-bold text-sm"
                            style={{ fontVariantNumeric: 'tabular-nums', color: 'oklch(0.45 0.18 25)' }}
                          >
                            ₩{dailyTotal.toLocaleString('ko-KR')}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(date); }}
                        className="p-2 rounded-full opacity-30 hover:opacity-70 transition-opacity"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={deleteTarget !== null}
        date={deleteTarget ?? ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
