/**
 * 매출 일일 보고 - 메인 입력 페이지
 * - 로그인 필수
 * - 점장: 배정된 지점만 접근 가능
 * - 관리자: 전체 지점 접근 가능
 * - 데이터는 서버 DB에 저장
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, List, CheckCircle2, Bell, BellOff, LogIn, LayoutDashboard } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';
import {
  type ExpenseItem,
  parseAmount,
  formatDateDisplay,
  calcExpenseTotal,
  getTodayString,
} from '@/lib/salesUtils';

// 숫자 입력 컴포넌트
function AmountInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  readOnly = false,
}: {
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
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

// 빈 기록 생성
function createEmptyLocalRecord() {
  return {
    posStartAmount: '',
    cash: '',
    card: '',
    cashDeposit: '',
    paymentChangeDate: '',
    paymentChangeNote: '',
    paymentChangeAmount: '',
    expenses: [{ id: `exp_${Date.now()}`, description: '', amount: '' }] as ExpenseItem[],
  };
}

type LocalRecord = ReturnType<typeof createEmptyLocalRecord>;

export default function Home() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [currentDate, setCurrentDate] = useState(getTodayString);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [record, setRecord] = useState<LocalRecord>(createEmptyLocalRecord);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 내 지점 목록 조회
  const { data: myBranches = [], isLoading: branchesLoading } = trpc.branch.myBranches.useQuery(
    undefined,
    { enabled: !!user }
  );

  // 첫 번째 지점 자동 선택
  useEffect(() => {
    if (myBranches.length > 0 && selectedBranchId === null) {
      setSelectedBranchId(myBranches[0].id);
    }
  }, [myBranches, selectedBranchId]);

  // 서버에서 해당 날짜 기록 조회
  const { data: serverRecord, refetch: refetchRecord } = trpc.sales.getRecord.useQuery(
    { branchId: selectedBranchId!, date: currentDate },
    { enabled: !!selectedBranchId && !!user }
  );

  // 서버 데이터로 로컬 상태 동기화
  useEffect(() => {
    if (serverRecord) {
      setRecord({
        posStartAmount: serverRecord.posStartAmount?.toString() || '',
        cash: serverRecord.cash?.toString() || '',
        card: serverRecord.card?.toString() || '',
        cashDeposit: '',
        paymentChangeDate: serverRecord.paymentChangeDate || '',
        paymentChangeNote: serverRecord.paymentChangeNote || '',
        paymentChangeAmount: serverRecord.paymentChangeAmount?.toString() || '',
        expenses: (serverRecord.expenses as ExpenseItem[]).length > 0
          ? (serverRecord.expenses as ExpenseItem[])
          : [{ id: `exp_${Date.now()}`, description: '', amount: '' }],
      });
    } else {
      setRecord(createEmptyLocalRecord());
    }
    setSaved(false);
  }, [serverRecord, currentDate, selectedBranchId]);

  // 이전 날짜 마감금 조회 (POS 시작금 자동 계산용)
  const prevDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [currentDate]);

  const { data: prevRecord } = trpc.sales.getRecord.useQuery(
    { branchId: selectedBranchId!, date: prevDate },
    { enabled: !!selectedBranchId && !!user }
  );

  // 이전 날짜 누적값 (현금/카드)
  const previousCashTotal = prevRecord ? Number(prevRecord.cashTotal || 0) : 0;
  const previousCardTotal = prevRecord ? Number(prevRecord.cardTotal || 0) : 0;
  const autoCalculatedPosStartAmount = prevRecord ? Number(prevRecord.posEndAmount || 0) : 0;

  // 계산값
  const todayCash = parseAmount(record.cash);
  const todayCard = parseAmount(record.card);
  const dailyTotal = todayCash + todayCard;
  const expenseTotal = calcExpenseTotal(record.expenses);
  const autoCalculatedCashTotal = previousCashTotal + todayCash;
  const autoCalculatedCardTotal = previousCardTotal + todayCard;
  const grandTotal = autoCalculatedCashTotal + autoCalculatedCardTotal;
  const posStartAmountValue = parseAmount(record.posStartAmount) || autoCalculatedPosStartAmount;
  const cashDepositValue = parseAmount(record.cashDeposit);
  const autoCalculatedPosEndAmount = posStartAmountValue - expenseTotal + cashDepositValue;

  const updateRecord = useCallback((patch: Partial<LocalRecord>) => {
    setRecord(prev => ({ ...prev, ...patch }));
    setSaved(false);
  }, []);

  const updateExpense = useCallback((id: string, field: keyof ExpenseItem, value: string) => {
    setRecord(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...e, [field]: value } : e),
    }));
    setSaved(false);
  }, []);

  const addExpense = useCallback(() => {
    setRecord(prev => ({
      ...prev,
      expenses: [...prev.expenses, { id: `exp_${Date.now()}`, description: '', amount: '' }],
    }));
  }, []);

  const removeExpense = useCallback((id: string) => {
    setRecord(prev => {
      if (prev.expenses.length <= 1) return prev;
      return { ...prev, expenses: prev.expenses.filter(e => e.id !== id) };
    });
  }, []);

  // 저장 mutation
  const saveMutation = trpc.sales.save.useMutation();
  const { isSubscribed, isLoading: pushLoading, isSupported, subscribe, unsubscribe } = usePushNotification();

  const handleSave = async () => {
    if (!selectedBranchId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    const cashTotalStr = autoCalculatedCashTotal.toString();
    const cardTotalStr = autoCalculatedCardTotal.toString();
    const posEndStr = autoCalculatedPosEndAmount > 0 ? autoCalculatedPosEndAmount.toString() : '0';

    try {
      const result = await saveMutation.mutateAsync({
        branchId: selectedBranchId,
        date: currentDate,
        posStartAmount: (parseAmount(record.posStartAmount) || autoCalculatedPosStartAmount).toString(),
        cash: record.cash || '0',
        card: record.card || '0',
        cashTotal: cashTotalStr,
        cardTotal: cardTotalStr,
        posEndAmount: posEndStr,
        cashDeposit: record.cashDeposit || '0',
        paymentChangeDate: record.paymentChangeDate,
        paymentChangeNote: record.paymentChangeNote,
        paymentChangeAmount: record.paymentChangeAmount || '0',
        expenses: record.expenses.filter(e => e.description || e.amount),
      });

      setSaved(true);
      toast.success('저장되었습니다', { duration: 1500 });
      if (result.pushSent) {
        toast.success('핸드폰으로 알림이 발송되었습니다 🔔', { duration: 2000 });
      }
      refetchRecord();
    } catch (error) {
      console.error('저장 실패:', error);
      toast.error('저장에 실패했습니다');
    }
  };

  const moveDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const selectedBranch = myBranches.find(b => b.id === selectedBranchId);

  // 로딩 중
  if (authLoading || branchesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <div className="text-sm" style={{ color: 'oklch(0.45 0.01 50)' }}>불러오는 중...</div>
      </div>
    );
  }

  // 로그인 필요
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
            매출 일일 보고
          </h1>
          <p className="text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>
            로그인 후 이용하실 수 있습니다
          </p>
        </div>
        <button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white"
          style={{ background: 'oklch(0.45 0.18 25)' }}
        >
          <LogIn size={16} />
          로그인
        </button>
      </div>
    );
  }

  // 배정된 지점 없음
  if (myBranches.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
            배정된 지점이 없습니다
          </h1>
          <p className="text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>
            관리자에게 지점 배정을 요청해 주세요
          </p>
        </div>
        <button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="text-sm underline"
          style={{ color: 'oklch(0.45 0.18 25)' }}
        >
          다른 계정으로 로그인
        </button>
      </div>
    );
  }

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
        <div className="flex items-center gap-3">
          <span
            className="text-base font-bold"
            style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}
          >
            매출 일일 보고
          </span>
          {myBranches.length > 1 ? (
            <select
              value={selectedBranchId ?? ''}
              onChange={(e) => setSelectedBranchId(Number(e.target.value))}
              className="px-3 py-1.5 rounded text-sm font-medium border"
              style={{
                background: 'oklch(0.92 0.015 85)',
                color: 'oklch(0.25 0.01 50)',
                borderColor: 'oklch(0.75 0.015 85)',
              }}
            >
              {myBranches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          ) : (
            <span
              className="px-3 py-1.5 rounded text-sm font-semibold border"
              style={{
                background: 'oklch(0.92 0.015 85)',
                color: 'oklch(0.25 0.01 50)',
                borderColor: 'oklch(0.75 0.015 85)',
              }}
            >
              {selectedBranch?.name ?? ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'oklch(0.45 0.15 150)' }}>
              <CheckCircle2 size={14} />
              저장됨
            </span>
          )}
          {isSupported && (
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading}
              title={isSubscribed ? '알림 끄기' : '저장 시 핸드폰 알림 받기'}
              className="p-1.5 rounded transition-colors"
              style={{
                background: isSubscribed ? 'oklch(0.45 0.18 25)' : 'oklch(0.92 0.015 85)',
                color: isSubscribed ? 'white' : 'oklch(0.45 0.01 50)',
                border: '1px solid oklch(0.75 0.015 85)',
              }}
            >
              {isSubscribed ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
          )}
          {user.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                background: 'oklch(0.92 0.015 85)',
                color: 'oklch(0.25 0.01 50)',
                border: '1px solid oklch(0.75 0.015 85)',
              }}
            >
              <LayoutDashboard size={15} />
              관리
            </button>
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
            disabled={saveMutation.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium text-white transition-colors active:scale-95 disabled:opacity-60"
            style={{ background: 'oklch(0.45 0.18 25)' }}
          >
            <Save size={15} />
            {saveMutation.isPending ? '저장 중...' : '저장'}
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
                placeholder={autoCalculatedPosStartAmount > 0 ? autoCalculatedPosStartAmount.toLocaleString('ko-KR') : '0'}
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
              <tr>
                <td className="w-1/4 text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>현금</td>
                <td className="w-1/4">
                  <AmountInput value={record.cash} onChange={val => updateRecord({ cash: val })} placeholder="0" />
                </td>
                <td className="w-1/4 text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>현금누적</td>
                <td className="w-1/4">
                  <div className="text-right font-semibold text-base px-2" style={{ color: 'oklch(0.12 0.01 50)' }}>
                    {autoCalculatedCashTotal > 0 ? autoCalculatedCashTotal.toLocaleString('ko-KR') : '0'}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>카드</td>
                <td>
                  <AmountInput value={record.card} onChange={val => updateRecord({ card: val })} placeholder="0" />
                </td>
                <td className="text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>카드누적</td>
                <td>
                  <div className="text-right font-semibold text-base px-2" style={{ color: 'oklch(0.12 0.01 50)' }}>
                    {autoCalculatedCardTotal > 0 ? autoCalculatedCardTotal.toLocaleString('ko-KR') : '0'}
                  </div>
                </td>
              </tr>
              <tr className="total-row">
                <td className="text-center font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif" }}>오늘</td>
                <td className="text-right"><span className="total-amount text-sm">{dailyTotal > 0 ? dailyTotal.toLocaleString('ko-KR') : '—'}</span></td>
                <td className="text-center font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif" }}>누적</td>
                <td className="text-right"><span className="total-amount text-sm">{grandTotal > 0 ? grandTotal.toLocaleString('ko-KR') : '—'}</span></td>
              </tr>
              <tr>
                <td className="text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>지출</td>
                <td className="text-right">
                  <span className="text-sm font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {expenseTotal > 0 ? expenseTotal.toLocaleString('ko-KR') : '—'}
                  </span>
                </td>
                <td className="text-center font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)' }}>지출합계</td>
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
        <div className="mb-5 p-3 rounded" style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>POS 마감금</span>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">₩</span>
              <div className="w-36 text-right font-semibold text-base" style={{ color: 'oklch(0.12 0.01 50)' }}>
                {autoCalculatedPosEndAmount > 0 ? autoCalculatedPosEndAmount.toLocaleString('ko-KR') : '0'}
              </div>
            </div>
          </div>
        </div>

        {/* 시제 입금 */}
        <div className="mb-5 p-3 rounded" style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>시제 입금</span>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">₩</span>
              <AmountInput
                value={record.cashDeposit}
                onChange={val => updateRecord({ cashDeposit: val })}
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
              style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.25 0.01 50)', border: '1px solid oklch(0.75 0.015 85)' }}
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
              {Array.from({ length: Math.ceil(record.expenses.length / 2) }, (_, rowIdx) => {
                const left = record.expenses[rowIdx * 2];
                const right = record.expenses[rowIdx * 2 + 1];
                return (
                  <tr key={rowIdx}>
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
                          <button onClick={() => removeExpense(left.id)} className="pr-1 opacity-30 hover:opacity-70 transition-opacity flex-shrink-0">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-0">
                      <AmountInput value={left?.amount ?? ''} onChange={val => updateExpense(left.id, 'amount', val)} placeholder="0" className="px-2 py-1.5 text-sm" />
                    </td>
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
                          <button onClick={() => removeExpense(right.id)} className="pr-1 opacity-30 hover:opacity-70 transition-opacity flex-shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : <div className="px-2 py-1.5 text-sm text-muted-foreground/30">—</div>}
                    </td>
                    <td className="p-0">
                      {right
                        ? <AmountInput value={right.amount} onChange={val => updateExpense(right.id, 'amount', val)} placeholder="0" className="px-2 py-1.5 text-sm" />
                        : <div className="px-2 py-1.5 text-sm text-muted-foreground/30">—</div>
                      }
                    </td>
                  </tr>
                );
              })}
              {expenseTotal > 0 && (
                <tr className="total-row">
                  <td colSpan={2} className="text-center font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif" }}>지출 합계</td>
                  <td colSpan={2} className="text-right"><span className="total-amount text-sm">{expenseTotal.toLocaleString('ko-KR')}</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 결제변경 사항 */}
        <div className="mb-6 p-3 rounded" style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}>
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
        <div className="rounded-lg p-4" style={{ background: 'oklch(0.45 0.18 25)', color: 'white' }}>
          <div className="text-sm font-semibold mb-3 opacity-90" style={{ fontFamily: "'Noto Serif KR', serif" }}>오늘의 요약</div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="opacity-80">오늘 현금</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{todayCash > 0 ? `₩${todayCash.toLocaleString('ko-KR')}` : '—'}</span>
            <span className="opacity-80">오늘 카드</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{todayCard > 0 ? `₩${todayCard.toLocaleString('ko-KR')}` : '—'}</span>
            <span className="opacity-80">지출</span>
            <span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{expenseTotal > 0 ? `₩${expenseTotal.toLocaleString('ko-KR')}` : '—'}</span>
            <div className="col-span-2 border-t border-white/30 my-1" />
            <span className="opacity-80 text-xs">현금 누적</span>
            <span className="text-right font-semibold text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>{autoCalculatedCashTotal > 0 ? `₩${autoCalculatedCashTotal.toLocaleString('ko-KR')}` : '—'}</span>
            <span className="opacity-80 text-xs">카드 누적</span>
            <span className="text-right font-semibold text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>{autoCalculatedCardTotal > 0 ? `₩${autoCalculatedCardTotal.toLocaleString('ko-KR')}` : '—'}</span>
            <span className="font-bold">총 누적</span>
            <span className="text-right font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>{grandTotal > 0 ? `₩${grandTotal.toLocaleString('ko-KR')}` : '—'}</span>
          </div>
        </div>
      </main>

      {/* 하단 저장 버튼 */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 flex gap-3"
        style={{ background: 'oklch(0.985 0.008 85)', borderTop: '1px solid oklch(0.75 0.015 85)', boxShadow: '0 -2px 8px oklch(0 0 0 / 0.06)' }}
      >
        <button
          onClick={() => navigate('/history')}
          className="flex-1 py-3 rounded-lg text-sm font-semibold transition-colors active:scale-95"
          style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.25 0.01 50)', border: '1px solid oklch(0.75 0.015 85)' }}
        >
          기록 보기
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex-[2] py-3 rounded-lg text-sm font-bold text-white transition-colors active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'oklch(0.45 0.18 25)' }}
        >
          <Save size={16} />
          {saveMutation.isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
