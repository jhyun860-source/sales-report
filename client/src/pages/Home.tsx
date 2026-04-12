/**
 * 매출 일일 보고 - 메인 입력 페이지
 * Design: 장부/영수증 감성
 * - 크림색 배경, 먹색 텍스트, 붉은 포인트
 * - Noto Serif KR 헤더, Noto Sans KR 본문
 * - 실물 양식과 유사한 레이아웃
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, List, CheckCircle2 } from 'lucide-react';
import {
  type DailySalesRecord,
  type ExpenseItem,
  formatNumber,
  parseAmount,
  formatDateDisplay,
  calcExpenseTotal,
  calcDailyTotal,
  loadRecords,
  saveRecords,
  findRecordByDate,
  createEmptyRecord,
  upsertRecord,
  getTodayString,
  saveCurrentDate,
  loadCurrentDate,
  shouldResetMonthly,
  resetMonthlyTotals,
} from '@/lib/salesUtils';

// 숫자 입력 컴포넌트
function AmountInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  readOnly = false,
  autoFocus = false,
}: {
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === '' || value === '0') {
      setDisplayValue(value === '0' ? '0' : '');
    } else {
      const num = parseAmount(value);
      setDisplayValue(isNaN(num) ? '' : num.toLocaleString('ko-KR'));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setDisplayValue('');
      onChange?.('');
    } else {
      const num = parseInt(raw, 10);
      setDisplayValue(num.toLocaleString('ko-KR'));
      onChange?.(raw);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9,]*"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      readOnly={readOnly}
      autoFocus={autoFocus}
      className={`amount-input ${className} ${readOnly ? 'opacity-70' : ''}`}
    />
  );
}

// 날짜 이동 버튼
function DateNavigator({
  currentDate,
  onPrev,
  onNext,
  onToday,
}: {
  currentDate: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const today = getTodayString();
  const isToday = currentDate === today;

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrev}
        className="p-2 rounded-full hover:bg-black/8 active:bg-black/15 transition-colors"
        aria-label="이전 날짜"
      >
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>
      <div className="text-center flex-1">
        <div className="date-header">{formatDateDisplay(currentDate)}</div>
        {!isToday && (
          <button
            onClick={onToday}
            className="text-xs text-primary mt-0.5 underline underline-offset-2"
          >
            오늘로 이동
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={isToday}
        className="p-2 rounded-full hover:bg-black/8 active:bg-black/15 transition-colors disabled:opacity-30"
        aria-label="다음 날짜"
      >
        <ChevronRight size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [records, setRecords] = useState<DailySalesRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(loadCurrentDate);
  const [record, setRecord] = useState<DailySalesRecord>(() => createEmptyRecord(loadCurrentDate()));
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 초기 로드
  useEffect(() => {
    let loaded = loadRecords();
    
    // 매월 1일에 누적값 리셋
    if (shouldResetMonthly()) {
      loaded = resetMonthlyTotals(loaded);
      saveRecords(loaded);
      toast.success('월초 리셋: 누적값이 초기화되었습니다', { duration: 2000 });
    }
    
    setRecords(loaded);
    const existing = findRecordByDate(loaded, currentDate);
    setRecord(existing ?? createEmptyRecord(currentDate));
  }, []);

  // 날짜 변경 시 해당 날짜 기록 로드
  useEffect(() => {
    saveCurrentDate(currentDate);
    const existing = findRecordByDate(records, currentDate);
    setRecord(existing ?? createEmptyRecord(currentDate));
    setSaved(false);
  }, [currentDate, records]);

  // 자동 저장 (입력 후 1.5초)
  const autoSave = useCallback((updatedRecord: DailySalesRecord) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const updated = upsertRecord(records, updatedRecord);
      setRecords(updated);
      saveRecords(updated);
      setSaved(true);
    }, 1500);
  }, [records]);

  const updateRecord = useCallback((patch: Partial<DailySalesRecord>) => {
    setRecord(prev => {
      const updated = { ...prev, ...patch };
      autoSave(updated);
      setSaved(false);
      return updated;
    });
  }, [autoSave]);

  // 지출 항목 업데이트
  const updateExpense = useCallback((id: string, field: keyof ExpenseItem, value: string) => {
    setRecord(prev => {
      const expenses = prev.expenses.map(e =>
        e.id === id ? { ...e, [field]: value } : e
      );
      const updated = { ...prev, expenses };
      autoSave(updated);
      setSaved(false);
      return updated;
    });
  }, [autoSave]);

  // 지출 항목 추가
  const addExpense = useCallback(() => {
    setRecord(prev => {
      const expenses = [
        ...prev.expenses,
        { id: `exp_${Date.now()}`, description: '', amount: '' },
      ];
      const updated = { ...prev, expenses };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // 지출 항목 삭제
  const removeExpense = useCallback((id: string) => {
    setRecord(prev => {
      if (prev.expenses.length <= 1) return prev;
      const expenses = prev.expenses.filter(e => e.id !== id);
      const updated = { ...prev, expenses };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // 수동 저장
  const handleSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const updated = upsertRecord(records, record);
    setRecords(updated);
    saveRecords(updated);
    setSaved(true);
    toast.success('저장되었습니다', { duration: 1500 });
  };

  // 날짜 이동
  const moveDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setCurrentDate(`${y}-${m}-${day}`);
  };

  // 계산값
  const todayCash = parseAmount(record.cash);
  const todayCard = parseAmount(record.card);
  const dailyTotal = todayCash + todayCard;
  const expenseTotal = calcExpenseTotal(record.expenses);
  
  // 어제까지의 누적값 계산 (이전 날짜들의 누적)
  const getPreviousCumulativeTotal = (dateStr: string, type: 'cash' | 'card'): number => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d);
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    
    const prevY = previousDate.getFullYear();
    const prevM = String(previousDate.getMonth() + 1).padStart(2, '0');
    const prevD = String(previousDate.getDate()).padStart(2, '0');
    const prevDateStr = `${prevY}-${prevM}-${prevD}`;
    
    const prevRecord = findRecordByDate(records, prevDateStr);
    if (!prevRecord) return 0;
    
    if (type === 'cash') {
      return parseAmount(prevRecord.cashTotal);
    } else {
      return parseAmount(prevRecord.cardTotal);
    }
  };
  
  // 누적값 = 어제 누적 + 오늘 매출
  const previousCashTotal = getPreviousCumulativeTotal(currentDate, 'cash');
  const previousCardTotal = getPreviousCumulativeTotal(currentDate, 'card');
  const autoCalculatedCashTotal = previousCashTotal + todayCash;
  const autoCalculatedCardTotal = previousCardTotal + todayCard;
  
  // 사용자 입력값이 있으면 사용, 없으면 자동 계산값 사용
  const cashTotalAmount = parseAmount(record.cashTotal) || autoCalculatedCashTotal;
  const cardTotalAmount = parseAmount(record.cardTotal) || autoCalculatedCardTotal;
  const grandTotal = cashTotalAmount + cardTotalAmount;

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.985 0.008 85)' }}>
      {/* 상단 헤더 */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'oklch(0.98 0.01 85)',
          borderColor: 'oklch(0.7 0.015 85)',
          boxShadow: '0 1px 4px oklch(0 0 0 / 0.08)',
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="text-base font-bold"
            style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}
          >
            매출 일일 보고
          </span>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'oklch(0.45 0.15 150)' }}>
              <CheckCircle2 size={14} />
              저장됨
            </span>
          )}
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              background: 'oklch(0.92 0.015 85)',
              color: 'oklch(0.25 0.01 50)',
              border: '1px solid oklch(0.75 0.015 85)',
            }}
          >
            <List size={15} />
            기록
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium text-white transition-colors active:scale-95"
            style={{ background: 'oklch(0.45 0.18 25)' }}
          >
            <Save size={15} />
            저장
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-lg mx-auto px-4 py-5 pb-24">
        {/* 날짜 네비게이터 */}
        <DateNavigator
          currentDate={currentDate}
          onPrev={() => moveDate(-1)}
          onNext={() => moveDate(1)}
          onToday={() => setCurrentDate(getTodayString())}
        />

        {/* POS 시작금 */}
        <div
          className="mb-4 p-3 rounded"
          style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              POS 시작금
            </span>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">₩</span>
              <AmountInput
                value={record.posStartAmount}
                onChange={val => updateRecord({ posStartAmount: val })}
                placeholder="0"
                className="w-36 text-right font-semibold text-base"
              />
            </div>
          </div>
        </div>

        {/* 매출 표 */}
        <div className="mb-4">
          <div className="section-title">■ 매출 현황</div>
          <table className="ledger-table">
            <tbody>
              {/* 현금 / 현금누적 */}
              <tr>
                <td className="w-1/4 text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>
                  현금
                </td>
                <td className="w-1/4">
                  <AmountInput
                    value={record.cash}
                    onChange={val => updateRecord({ cash: val })}
                    placeholder="0"
                  />
                </td>
                <td className="w-1/4 text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>
                  현금누적
                </td>
                <td className="w-1/4">
                  <AmountInput
                    value={record.cashTotal}
                    onChange={val => updateRecord({ cashTotal: val })}
                    placeholder={autoCalculatedCashTotal > 0 ? autoCalculatedCashTotal.toString() : '0'}
                    readOnly={true}
                  />
                </td>
              </tr>
              {/* 카드 / 카드누적 */}
              <tr>
                <td className="text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>
                  카드
                </td>
                <td>
                  <AmountInput
                    value={record.card}
                    onChange={val => updateRecord({ card: val })}
                    placeholder="0"
                  />
                </td>
                <td className="text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>
                  카드누적
                </td>
                <td>
                  <AmountInput
                    value={record.cardTotal}
                    onChange={val => updateRecord({ cardTotal: val })}
                    placeholder={autoCalculatedCardTotal > 0 ? autoCalculatedCardTotal.toString() : '0'}
                    readOnly={true}
                  />
                </td>
              </tr>
              {/* 합계 / 총합계 */}
              <tr className="total-row">
                <td className="text-center font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                  오늘
                </td>
                <td className="text-right">
                  <span className="total-amount text-sm">
                    {dailyTotal > 0 ? dailyTotal.toLocaleString('ko-KR') : '—'}
                  </span>
                </td>
                <td className="text-center font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                  누적
                </td>
                <td className="text-right">
                  <span className="total-amount text-sm">
                    {grandTotal > 0 ? grandTotal.toLocaleString('ko-KR') : '—'}
                  </span>
                </td>
              </tr>
              {/* 지출 / 지출합계 */}
              <tr>
                <td className="text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>
                  지출
                </td>
                <td className="text-right">
                  <span className="text-sm font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {expenseTotal > 0 ? expenseTotal.toLocaleString('ko-KR') : '—'}
                  </span>
                </td>
                <td className="text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>
                  지출합계
                </td>
                <td className="text-right">
                  <span className="text-sm font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {expenseTotal > 0 ? expenseTotal.toLocaleString('ko-KR') : '—'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* POS 마감금 */}
        <div
          className="mb-5 p-3 rounded"
          style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              POS 마감금
            </span>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">₩</span>
              <AmountInput
                value={record.posEndAmount}
                onChange={val => updateRecord({ posEndAmount: val })}
                placeholder="0"
                className="w-36 text-right font-semibold text-base"
              />
            </div>
          </div>
        </div>

        {/* 지출 내역 */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="section-title mb-0">■ 지출 내역</div>
            <button
              onClick={addExpense}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors active:scale-95"
              style={{
                background: 'oklch(0.92 0.015 85)',
                color: 'oklch(0.25 0.01 50)',
                border: '1px solid oklch(0.75 0.015 85)',
              }}
            >
              <Plus size={13} />
              항목 추가
            </button>
          </div>
          <table className="ledger-table">
            <thead>
              <tr>
                <th className="w-[38%]">내용</th>
                <th className="w-[28%]">금액</th>
                <th className="w-[38%]">내용</th>
                <th className="w-[28%]">금액</th>
              </tr>
            </thead>
            <tbody>
              {/* 2열씩 묶어서 표시 */}
              {Array.from({ length: Math.ceil(record.expenses.length / 2) }, (_, rowIdx) => {
                const left = record.expenses[rowIdx * 2];
                const right = record.expenses[rowIdx * 2 + 1];
                return (
                  <tr key={rowIdx}>
                    {/* 왼쪽 */}
                    <td className="p-0">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={left?.description ?? ''}
                          onChange={e => updateExpense(left.id, 'description', e.target.value)}
                          placeholder="내용"
                          className="w-full bg-transparent border-none outline-none text-sm px-2 py-1.5"
                          style={{ color: 'oklch(0.12 0.01 50)' }}
                        />
                        {record.expenses.length > 1 && (
                          <button
                            onClick={() => removeExpense(left.id)}
                            className="pr-1 opacity-30 hover:opacity-70 transition-opacity flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-0">
                      <AmountInput
                        value={left?.amount ?? ''}
                        onChange={val => updateExpense(left.id, 'amount', val)}
                        placeholder="0"
                        className="px-2 py-1.5 text-sm"
                      />
                    </td>
                    {/* 오른쪽 */}
                    <td className="p-0">
                      {right ? (
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={right.description}
                            onChange={e => updateExpense(right.id, 'description', e.target.value)}
                            placeholder="내용"
                            className="w-full bg-transparent border-none outline-none text-sm px-2 py-1.5"
                            style={{ color: 'oklch(0.12 0.01 50)' }}
                          />
                          <button
                            onClick={() => removeExpense(right.id)}
                            className="pr-1 opacity-30 hover:opacity-70 transition-opacity flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground/30">—</div>
                      )}
                    </td>
                    <td className="p-0">
                      {right ? (
                        <AmountInput
                          value={right.amount}
                          onChange={val => updateExpense(right.id, 'amount', val)}
                          placeholder="0"
                          className="px-2 py-1.5 text-sm"
                        />
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground/30">—</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* 지출 합계 행 */}
              {expenseTotal > 0 && (
                <tr className="total-row">
                  <td colSpan={2} className="text-center font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                    지출 합계
                  </td>
                  <td colSpan={2} className="text-right">
                    <span className="total-amount text-sm">
                      {expenseTotal.toLocaleString('ko-KR')}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 결제변경 사항 */}
        <div
          className="mb-6 p-3 rounded"
          style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}
        >
          <div className="section-title">■ 결제변경 사항</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm w-20 flex-shrink-0">결제 날짜</span>
              <input
                type="text"
                value={record.paymentChangeDate}
                onChange={e => updateRecord({ paymentChangeDate: e.target.value })}
                placeholder="예) 4/10"
                className="flex-1 bg-transparent border-b text-sm py-1 outline-none"
                style={{ borderColor: 'oklch(0.7 0.015 85)', color: 'oklch(0.12 0.01 50)' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-20 flex-shrink-0">변경 내용</span>
              <input
                type="text"
                value={record.paymentChangeNote}
                onChange={e => updateRecord({ paymentChangeNote: e.target.value })}
                placeholder="변경 내용 입력"
                className="flex-1 bg-transparent border-b text-sm py-1 outline-none"
                style={{ borderColor: 'oklch(0.7 0.015 85)', color: 'oklch(0.12 0.01 50)' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-20 flex-shrink-0">금액</span>
              <div className="flex-1 flex items-center gap-1 border-b" style={{ borderColor: 'oklch(0.7 0.015 85)' }}>
                <span className="text-muted-foreground text-sm">₩</span>
                <AmountInput
                  value={record.paymentChangeAmount}
                  onChange={val => updateRecord({ paymentChangeAmount: val })}
                  placeholder="0"
                  className="flex-1 py-1 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 요약 카드 */}
        <div
          className="rounded-lg p-4"
          style={{
            background: 'oklch(0.45 0.18 25)',
            color: 'white',
          }}
        >
          <div className="text-sm font-semibold mb-3 opacity-90" style={{ fontFamily: "'Noto Serif KR', serif" }}>
            오늘의 요약
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="opacity-80">오늘 현금</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {todayCash > 0 ? `₩${todayCash.toLocaleString('ko-KR')}` : '—'}
            </span>
            <span className="opacity-80">오뉸 카드</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {todayCard > 0 ? `₩${todayCard.toLocaleString('ko-KR')}` : '—'}
            </span>
            <span className="opacity-80">지출</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {expenseTotal > 0 ? `₩${expenseTotal.toLocaleString('ko-KR')}` : '—'}
            </span>
            <div className="col-span-2 border-t border-white/30 my-1" />
            <span className="opacity-80 text-xs">현금 누적</span>
            <span className="text-right font-semibold text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {cashTotalAmount > 0 ? `₩${cashTotalAmount.toLocaleString('ko-KR')}` : '—'}
            </span>
            <span className="opacity-80 text-xs">카드 누적</span>
            <span className="text-right font-semibold text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {cardTotalAmount > 0 ? `₩${cardTotalAmount.toLocaleString('ko-KR')}` : '—'}
            </span>
            <span className="font-bold">총 누적</span>
            <span className="text-right font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {grandTotal > 0 ? `₩${grandTotal.toLocaleString('ko-KR')}` : '—'}
            </span>
          </div>
        </div>
      </main>

      {/* 하단 저장 버튼 (고정) */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 flex gap-3"
        style={{
          background: 'oklch(0.985 0.008 85)',
          borderTop: '1px solid oklch(0.75 0.015 85)',
          boxShadow: '0 -2px 8px oklch(0 0 0 / 0.06)',
        }}
      >
        <button
          onClick={() => navigate('/history')}
          className="flex-1 py-3 rounded-lg text-sm font-semibold transition-colors active:scale-95"
          style={{
            background: 'oklch(0.92 0.015 85)',
            color: 'oklch(0.25 0.01 50)',
            border: '1px solid oklch(0.75 0.015 85)',
          }}
        >
          기록 보기
        </button>
        <button
          onClick={handleSave}
          className="flex-[2] py-3 rounded-lg text-sm font-bold text-white transition-colors active:scale-95 flex items-center justify-center gap-2"
          style={{ background: 'oklch(0.45 0.18 25)' }}
        >
          <Save size={16} />
          저장
        </button>
      </div>
    </div>
  );
}
