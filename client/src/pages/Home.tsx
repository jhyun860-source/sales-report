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
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, List, CheckCircle2, Bell, BellOff, LogIn, LayoutDashboard, LogOut, ClipboardList, BarChart2 } from 'lucide-react';
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
            className="text-xs mt-0.5 underline underline-offset-2"
            style={{ color: 'oklch(0.45 0.18 25)' }}
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
    expenses: [{ id: `exp_${Date.now()}`, description: '', amount: '' }] as ExpenseItem[],
  };
}

type LocalRecord = ReturnType<typeof createEmptyLocalRecord>;

// 입력 행 컴포넌트 (라벨 + 금액 입력)
function InputRow({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  displayValue,
}: {
  label: string;
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  displayValue?: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg mb-2"
      style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.82 0.012 85)' }}
    >
      <span className="text-sm font-semibold flex-shrink-0 mr-3" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.3 0.01 50)' }}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-sm" style={{ color: 'oklch(0.6 0.01 50)' }}>₩</span>
        {readOnly && displayValue !== undefined ? (
          <span className="text-right font-bold text-base tabular-nums" style={{ color: 'oklch(0.12 0.01 50)', minWidth: '6rem' }}>
            {displayValue}
          </span>
        ) : (
          <AmountInput
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder ?? '0'}
            className="text-right font-semibold text-base"
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useStoreAuth();
  const [currentDate, setCurrentDateState] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedDate');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
    } catch {}
    return getTodayString();
  });

  const setCurrentDate = (dateOrUpdater: string | ((prev: string) => string)) => {
    setCurrentDateState(prev => {
      const next = typeof dateOrUpdater === 'function' ? dateOrUpdater(prev) : dateOrUpdater;
      try { localStorage.setItem('selectedDate', next); } catch {}
      return next;
    });
  };
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [record, setRecord] = useState<LocalRecord>(createEmptyLocalRecord);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myBranches = user?.role === 'admin'
    ? (user.allBranches ?? [])
    : user?.branch ? [user.branch] : [];

  useEffect(() => {
    if (myBranches.length > 0 && selectedBranchId === null) {
      setSelectedBranchId(myBranches[0].id);
    }
  }, [myBranches, selectedBranchId]);

  const { data: serverRecord, refetch: refetchRecord } = trpc.storeSales.getRecord.useQuery(
    { branchId: selectedBranchId!, date: currentDate },
    { enabled: !!selectedBranchId && !!user }
  );

  useEffect(() => {
    if (serverRecord) {
      setRecord({
        posStartAmount: serverRecord.posStartAmount?.toString() || '',
        cash: serverRecord.cash?.toString() || '',
        card: serverRecord.card?.toString() || '',
        cashDeposit: '',
        expenses: (serverRecord.expenses as ExpenseItem[]).length > 0
          ? (serverRecord.expenses as ExpenseItem[])
          : [{ id: `exp_${Date.now()}`, description: '', amount: '' }],
      });
    } else {
      setRecord(createEmptyLocalRecord());
    }
    setSaved(false);
  }, [serverRecord, currentDate, selectedBranchId]);

  const prevDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [currentDate]);

  const { data: prevRecord } = trpc.storeSales.getPrevRecord.useQuery(
    { branchId: selectedBranchId!, date: prevDate },
    { enabled: !!selectedBranchId && !!user }
  );

  const previousCashTotal = prevRecord ? Number(prevRecord.cashTotal || 0) : 0;
  const previousCardTotal = prevRecord ? Number(prevRecord.cardTotal || 0) : 0;
  const autoCalculatedPosStartAmount = prevRecord ? Number(prevRecord.posEndAmount || 0) : 0;

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

  const saveMutation = trpc.storeSales.save.useMutation();
  const { isSubscribed, isLoading: pushLoading, isSupported, subscribe, unsubscribe } = usePushNotification();

  const handleSave = async () => {
    if (!selectedBranchId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    try {
      const result = await saveMutation.mutateAsync({
        branchId: selectedBranchId,
        date: currentDate,
        posStartAmount: (parseAmount(record.posStartAmount) || autoCalculatedPosStartAmount).toString(),
        cash: record.cash || '0',
        card: record.card || '0',
        cashTotal: autoCalculatedCashTotal.toString(),
        cardTotal: autoCalculatedCardTotal.toString(),
        posEndAmount: autoCalculatedPosEndAmount > 0 ? autoCalculatedPosEndAmount.toString() : '0',
        cashDeposit: record.cashDeposit || '0',
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

  if (myBranches.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
            배정된 지점이 없습니다
          </h1>
          <p className="text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>관리자에게 지점 배정을 요청해 주세요</p>
        </div>
        <button onClick={logout} className="text-sm underline" style={{ color: 'oklch(0.45 0.18 25)' }}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.985 0.008 85)' }}>
      {/* ── 상단 헤더: 2줄 구조 ── */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          background: 'oklch(0.98 0.01 85)',
          borderColor: 'oklch(0.78 0.012 85)',
          boxShadow: '0 1px 4px oklch(0 0 0 / 0.07)',
        }}
      >
        {/* 1줄: 앱 타이틀 + 지점 선택 + 저장됨 표시 */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-base font-bold flex-shrink-0"
              style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}
            >
              매출 보고
            </span>
            {myBranches.length > 1 ? (
              <select
                value={selectedBranchId ?? ''}
                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                className="px-2 py-1 rounded text-sm font-medium border min-w-0 max-w-[130px]"
                style={{
                  background: 'oklch(0.92 0.015 85)',
                  color: 'oklch(0.25 0.01 50)',
                  borderColor: 'oklch(0.78 0.012 85)',
                }}
              >
                {myBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            ) : (
              <span
                className="px-2 py-1 rounded text-sm font-semibold border"
                style={{
                  background: 'oklch(0.92 0.015 85)',
                  color: 'oklch(0.25 0.01 50)',
                  borderColor: 'oklch(0.78 0.012 85)',
                }}
              >
                {selectedBranch?.name ?? ''}
              </span>
            )}
          </div>
          {saved && (
            <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'oklch(0.42 0.15 150)' }}>
              <CheckCircle2 size={13} />
              저장됨
            </span>
          )}
        </div>

        {/* 2줄: 액션 버튼들 */}
        <div className="flex items-center gap-1.5 px-4 pb-2.5">
          {/* 알림 토글 */}
          {isSupported && (
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading}
              title={isSubscribed ? '알림 끄기' : '알림 켜기'}
              className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors flex-shrink-0"
              style={{
                background: isSubscribed ? 'oklch(0.45 0.18 25)' : 'oklch(0.92 0.015 85)',
                color: isSubscribed ? 'white' : 'oklch(0.45 0.01 50)',
                borderColor: 'oklch(0.78 0.012 85)',
              }}
            >
              {isSubscribed ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
          )}

          {/* 관리자 버튼 */}
          {user.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-medium border transition-colors flex-shrink-0"
              style={{
                background: 'oklch(0.92 0.015 85)',
                color: 'oklch(0.25 0.01 50)',
                borderColor: 'oklch(0.78 0.012 85)',
              }}
            >
              <LayoutDashboard size={14} />
              관리
            </button>
          )}

          {/* 테이블 기록 버튼 */}
          <button
            onClick={() => navigate('/table-report')}
            className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-medium border transition-colors flex-shrink-0"
            style={{
              background: 'oklch(0.92 0.015 85)',
              color: 'oklch(0.25 0.01 50)',
              borderColor: 'oklch(0.78 0.012 85)',
            }}
          >
            <ClipboardList size={14} />
            테이블
          </button>

          {/* 인센티브 통계 버튼 */}
          <button
            onClick={() => navigate('/staff-incentive')}
            className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-medium border transition-colors flex-shrink-0"
            style={{
              background: 'oklch(0.92 0.015 85)',
              color: 'oklch(0.25 0.01 50)',
              borderColor: 'oklch(0.78 0.012 85)',
            }}
          >
            <BarChart2 size={14} />
            인센
          </button>

          {/* 기록 버튼 */}
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-medium border transition-colors flex-shrink-0"
            style={{
              background: 'oklch(0.92 0.015 85)',
              color: 'oklch(0.25 0.01 50)',
              borderColor: 'oklch(0.78 0.012 85)',
            }}
          >
            <List size={14} />
            기록
          </button>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-bold text-white transition-colors active:scale-95 disabled:opacity-60 flex-shrink-0"
            style={{ background: 'oklch(0.45 0.18 25)' }}
          >
            <Save size={14} />
            {saveMutation.isPending ? '저장 중' : '저장'}
          </button>

          {/* 로그아웃 아이콘 버튼 */}
          <button
            onClick={logout}
            title="로그아웃"
            className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors flex-shrink-0 ml-auto"
            style={{
              background: 'oklch(0.92 0.015 85)',
              color: 'oklch(0.5 0.01 50)',
              borderColor: 'oklch(0.78 0.012 85)',
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-28">

        {/* 날짜 네비게이터 */}
        <DateNavigator
          currentDate={currentDate}
          onPrev={() => moveDate(-1)}
          onNext={() => moveDate(1)}
          onToday={() => setCurrentDate(getTodayString())}
        />

        {/* POS 시작금 */}
        <InputRow
          label="POS 시작금"
          value={record.posStartAmount}
          onChange={val => updateRecord({ posStartAmount: val })}
          placeholder={autoCalculatedPosStartAmount > 0 ? autoCalculatedPosStartAmount.toLocaleString('ko-KR') : '0'}
        />

        {/* ── 매출 현황 ── */}
        <div className="mb-3">
          <div className="section-title">■ 매출 현황</div>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid oklch(0.78 0.012 85)' }}
          >
            {/* 현금 행 */}
            <div className="flex items-center" style={{ borderBottom: '1px solid oklch(0.85 0.01 85)' }}>
              <div
                className="w-20 flex-shrink-0 text-center text-sm font-semibold py-3"
                style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)', color: 'oklch(0.3 0.01 50)' }}
              >
                현금
              </div>
              <div className="flex-1 px-3 py-2">
                <AmountInput value={record.cash} onChange={val => updateRecord({ cash: val })} placeholder="0" />
              </div>
              <div
                className="w-20 flex-shrink-0 text-center text-sm font-semibold py-3"
                style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)', color: 'oklch(0.3 0.01 50)', borderLeft: '1px solid oklch(0.85 0.01 85)' }}
              >
                현금누적
              </div>
              <div className="w-24 flex-shrink-0 text-right px-3 py-2 font-semibold text-sm tabular-nums" style={{ color: 'oklch(0.12 0.01 50)' }}>
                {autoCalculatedCashTotal > 0 ? autoCalculatedCashTotal.toLocaleString('ko-KR') : '0'}
              </div>
            </div>

            {/* 카드 행 */}
            <div className="flex items-center" style={{ borderBottom: '1px solid oklch(0.85 0.01 85)' }}>
              <div
                className="w-20 flex-shrink-0 text-center text-sm font-semibold py-3"
                style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)', color: 'oklch(0.3 0.01 50)' }}
              >
                카드
              </div>
              <div className="flex-1 px-3 py-2">
                <AmountInput value={record.card} onChange={val => updateRecord({ card: val })} placeholder="0" />
              </div>
              <div
                className="w-20 flex-shrink-0 text-center text-sm font-semibold py-3"
                style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)', color: 'oklch(0.3 0.01 50)', borderLeft: '1px solid oklch(0.85 0.01 85)' }}
              >
                카드누적
              </div>
              <div className="w-24 flex-shrink-0 text-right px-3 py-2 font-semibold text-sm tabular-nums" style={{ color: 'oklch(0.12 0.01 50)' }}>
                {autoCalculatedCardTotal > 0 ? autoCalculatedCardTotal.toLocaleString('ko-KR') : '0'}
              </div>
            </div>

            {/* 오늘 합계 행 */}
            <div className="flex items-center" style={{ background: 'oklch(0.93 0.02 50)', borderBottom: '1px solid oklch(0.85 0.01 85)' }}>
              <div className="w-20 flex-shrink-0 text-center text-sm font-bold py-2.5" style={{ fontFamily: "'Noto Serif KR', serif" }}>오늘</div>
              <div className="flex-1 text-right px-3 py-2.5">
                <span className="total-amount text-sm">{dailyTotal > 0 ? dailyTotal.toLocaleString('ko-KR') : '—'}</span>
              </div>
              <div className="w-20 flex-shrink-0 text-center text-sm font-bold py-2.5" style={{ fontFamily: "'Noto Serif KR', serif", borderLeft: '1px solid oklch(0.85 0.01 85)' }}>누적</div>
              <div className="w-24 flex-shrink-0 text-right px-3 py-2.5">
                <span className="total-amount text-sm">{grandTotal > 0 ? grandTotal.toLocaleString('ko-KR') : '—'}</span>
              </div>
            </div>

            {/* 지출 행 */}
            <div className="flex items-center">
              <div
                className="w-20 flex-shrink-0 text-center text-sm font-semibold py-3"
                style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)', color: 'oklch(0.3 0.01 50)' }}
              >
                지출
              </div>
              <div className="flex-1 text-right px-3 py-2 text-sm font-medium tabular-nums" style={{ color: 'oklch(0.12 0.01 50)' }}>
                {expenseTotal > 0 ? expenseTotal.toLocaleString('ko-KR') : '—'}
              </div>
              <div
                className="w-20 flex-shrink-0 text-center text-sm font-semibold py-3"
                style={{ fontFamily: "'Noto Serif KR', serif", background: 'oklch(0.93 0.015 85)', color: 'oklch(0.3 0.01 50)', borderLeft: '1px solid oklch(0.85 0.01 85)' }}
              >
                지출합계
              </div>
              <div className="w-24 flex-shrink-0 text-right px-3 py-2 text-sm font-medium tabular-nums" style={{ color: 'oklch(0.12 0.01 50)' }}>
                {expenseTotal > 0 ? expenseTotal.toLocaleString('ko-KR') : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* POS 마감금 */}
        <InputRow
          label="POS 마감금"
          readOnly
          displayValue={autoCalculatedPosEndAmount > 0 ? autoCalculatedPosEndAmount.toLocaleString('ko-KR') : '0'}
        />

        {/* 시제 입금 */}
        <InputRow
          label="시제 입금"
          value={record.cashDeposit}
          onChange={val => updateRecord({ cashDeposit: val })}
          placeholder="0"
        />

        {/* ── 지출 내역 (1열 리스트) ── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="section-title mb-0">■ 지출 내역</div>
            <button
              onClick={addExpense}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors active:scale-95"
              style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.25 0.01 50)', border: '1px solid oklch(0.78 0.012 85)' }}
            >
              <Plus size={13} />
              항목 추가
            </button>
          </div>

          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid oklch(0.78 0.012 85)' }}
          >
            {/* 헤더 */}
            <div
              className="grid grid-cols-[1fr_auto] px-3 py-2 text-xs font-semibold"
              style={{ background: 'oklch(0.9 0.015 85)', fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.35 0.01 50)', borderBottom: '1px solid oklch(0.82 0.012 85)' }}
            >
              <span>내용</span>
              <span className="text-right w-28">금액</span>
            </div>

            {/* 지출 항목들 */}
            {record.expenses.map((expense, idx) => (
              <div
                key={expense.id}
                className="flex items-center"
                style={{ borderBottom: idx < record.expenses.length - 1 ? '1px solid oklch(0.88 0.01 85)' : 'none' }}
              >
                <input
                  type="text"
                  value={expense.description}
                  onChange={e => updateExpense(expense.id, 'description', e.target.value)}
                  placeholder="내용 입력"
                  className="flex-1 bg-transparent border-none outline-none text-sm px-3 py-2.5"
                  style={{ color: 'oklch(0.12 0.01 50)' }}
                />
                <div className="w-28 flex-shrink-0 flex items-center gap-1 px-2" style={{ borderLeft: '1px solid oklch(0.88 0.01 85)' }}>
                  <AmountInput
                    value={expense.amount}
                    onChange={val => updateExpense(expense.id, 'amount', val)}
                    placeholder="0"
                    className="text-sm py-2.5"
                  />
                  {record.expenses.length > 1 && (
                    <button
                      onClick={() => removeExpense(expense.id)}
                      className="flex-shrink-0 opacity-30 hover:opacity-70 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* 지출 합계 */}
            {expenseTotal > 0 && (
              <div
                className="flex items-center justify-between px-3 py-2.5"
                style={{ background: 'oklch(0.93 0.02 50)', borderTop: '1px solid oklch(0.82 0.012 85)' }}
              >
                <span className="text-sm font-bold" style={{ fontFamily: "'Noto Serif KR', serif" }}>지출 합계</span>
                <span className="total-amount text-sm">{expenseTotal.toLocaleString('ko-KR')}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 오늘의 요약 카드 ── */}
        <div className="rounded-xl p-4" style={{ background: 'oklch(0.45 0.18 25)', color: 'white' }}>
          <div className="text-sm font-semibold mb-3 opacity-90" style={{ fontFamily: "'Noto Serif KR', serif" }}>오늘의 요약</div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="opacity-75">오늘 현금</span>
              <span className="font-semibold tabular-nums">{todayCash > 0 ? `₩${todayCash.toLocaleString('ko-KR')}` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-75">오늘 카드</span>
              <span className="font-semibold tabular-nums">{todayCard > 0 ? `₩${todayCard.toLocaleString('ko-KR')}` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-75">지출</span>
              <span className="font-semibold tabular-nums">{expenseTotal > 0 ? `₩${expenseTotal.toLocaleString('ko-KR')}` : '—'}</span>
            </div>
            <div className="border-t border-white/25 my-2" />
            <div className="flex justify-between text-xs opacity-70">
              <span>현금 누적</span>
              <span className="tabular-nums">{autoCalculatedCashTotal > 0 ? `₩${autoCalculatedCashTotal.toLocaleString('ko-KR')}` : '—'}</span>
            </div>
            <div className="flex justify-between text-xs opacity-70">
              <span>카드 누적</span>
              <span className="tabular-nums">{autoCalculatedCardTotal > 0 ? `₩${autoCalculatedCardTotal.toLocaleString('ko-KR')}` : '—'}</span>
            </div>
            <div className="flex justify-between font-bold text-base mt-1">
              <span>총 누적</span>
              <span className="tabular-nums">{grandTotal > 0 ? `₩${grandTotal.toLocaleString('ko-KR')}` : '—'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── 하단 고정 버튼 ── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 flex gap-3"
        style={{
          background: 'oklch(0.985 0.008 85)',
          borderTop: '1px solid oklch(0.78 0.012 85)',
          boxShadow: '0 -2px 8px oklch(0 0 0 / 0.06)',
        }}
      >
        <button
          onClick={() => navigate('/history')}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors active:scale-95"
          style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.25 0.01 50)', border: '1px solid oklch(0.78 0.012 85)' }}
        >
          기록 보기
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex-[2] py-3 rounded-xl text-sm font-bold text-white transition-colors active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'oklch(0.45 0.18 25)' }}
        >
          <Save size={16} />
          {saveMutation.isPending ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
