/**
 * 테이블 영업 기록 페이지
 * - 날짜별 테이블 목록 (번호, 손님구분, 금액, 결제수단, 메모)
 * - 출근자 인센티브 (잔추가, 병추가, 맥주병추가, 영업인센, 근무시간)
 * - 팀수, 기타 사항
 * - 저장 시 현금/카드 합산값이 매출기록에 자동 반영됨
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, CheckCircle2, Users, Wine } from 'lucide-react';
import { MemoEditor } from '@/components/MemoEditor';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';

// 날짜 포맷
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = new Date(Number(y), Number(m) - 1, Number(d)).getDay();
  return `${Number(m)}월 ${Number(d)}일 (${days[dow]})`;
}

function moveDateBy(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 금액 입력 컴포넌트
function AmountInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!value || value === '0') { setDisplay(''); return; }
    const n = Number(value.replace(/,/g, ''));
    setDisplay(isNaN(n) ? '' : n.toLocaleString('ko-KR'));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        if (!raw) { setDisplay(''); onChange(''); return; }
        const n = parseInt(raw, 10);
        setDisplay(n.toLocaleString('ko-KR'));
        onChange(raw);
      }}
      placeholder={placeholder}
      className={`bg-transparent border-none outline-none ${className}`}
    />
  );
}

// 테이블 카드 타입
type TableItemLocal = {
  id?: number;
  localId: string;
  tableNumber: string;
  guestType: 'walking' | 'regular' | 'named';
  guestName: string;
  amount: string;
  paymentMethod: 'card' | 'cash' | 'mixed';
  memo: string;
};

// 직원 인센티브 타입
type IncentiveLocal = {
  id?: number;
  localId: string;
  staffName: string;
  glassCount: number;
  bottleCount: number;
  beerBottleCount: number;
  salesIncentive: string;
  workStart: string;       // HH:mm 24시간 형식으로 저장
  workEnd: string;         // HH:mm 24시간 형식으로 저장
  workStartAmPm: 'AM' | 'PM';
  workEndAmPm: 'AM' | 'PM';
  workStartHour: string;   // 표시용 시간 (1~12)
  workEndHour: string;     // 표시용 시간 (1~12)
  workStartMin: string;    // 표시용 분 (00~59)
  workEndMin: string;      // 표시용 분 (00~59)
};

function makeLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function emptyItem(): TableItemLocal {
  return { localId: makeLocalId(), tableNumber: '', guestType: 'walking', guestName: '', amount: '', paymentMethod: 'card', memo: '' };
}

function emptyIncentive(): IncentiveLocal {
  return { localId: makeLocalId(), staffName: '', glassCount: 0, bottleCount: 0, beerBottleCount: 0, salesIncentive: '', workStart: '', workEnd: '', workStartAmPm: 'PM', workEndAmPm: 'PM', workStartHour: '', workEndHour: '', workStartMin: '', workEndMin: '' };
}

// HH:mm → 오전/오후, 시간(1~12), 분 역변환
function fromHHMM(hhmm: string): { ampm: 'AM' | 'PM'; hour: string; min: string } {
  if (!hhmm) return { ampm: 'PM', hour: '', min: '' };
  const [hStr, mStr] = hhmm.split(':');
  const h24 = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h24) || isNaN(m)) return { ampm: 'PM', hour: '', min: '' };
  const ampm: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { ampm, hour: String(h12), min: String(m).padStart(2, '0') };
}

// 오전/오후 + 시간/분 → HH:mm 24시간 변환
function toHHMM(ampm: 'AM' | 'PM', hour: string, min: string): string {
  const h = parseInt(hour, 10);
  const m = parseInt(min || '0', 10);
  if (isNaN(h) || h < 1 || h > 12) return '';
  if (isNaN(m) || m < 0 || m > 59) return '';
  let h24 = h;
  if (ampm === 'AM' && h === 12) h24 = 0;
  else if (ampm === 'PM' && h !== 12) h24 = h + 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function TableReport() {
  const [, navigate] = useLocation();
  const { user: account, loading: authLoading } = useStoreAuth();
  // 날짜를 localStorage에 저장/복원 (새로고침 후에도 유지)
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
      if (next !== prev) {
        // 날짜가 달라지면 loadedDateRef 초기화 → 새 날짜 데이터 로드 허용
        loadedDateRef.current = null;
        setSaved(false);
        // 자동저장 타이머 취소: 날짜 이동 시 이전 날짜 데이터가 새 날짜로 저장되는 것 방지
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
      }
      try { localStorage.setItem('selectedDate', next); } catch {}
      return next;
    });
  };
  const [teamCount, setTeamCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TableItemLocal[]>([emptyItem()]);
  const [incentives, setIncentives] = useState<IncentiveLocal[]>([emptyIncentive()]);
  const [reportId, setReportId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 이미 로드한 날짜 추적 (items 덮어쓰기 방지)
  const loadedDateRef = useRef<string | null>(null);

  // 날짜별 기록 조회 - staleTime을 길게 설정해 자동 리페치 방지
  const { data: reportData, dataUpdatedAt } = trpc.tableReport.getByDate.useQuery(
    { date: currentDate },
    { enabled: !!account, staleTime: Infinity, refetchOnWindowFocus: false }
  );

  // 서버 데이터 → 로컬 상태 동기화
  // reportData가 해당 날짜(currentDate)의 데이터일 때만 덮어씀
  useEffect(() => {
    // reportData가 아직 undefined면 로딩 중 → 건너뜀
    if (reportData === undefined) return;
    // 이미 이 날짜 데이터를 로드했으면 다시 덮어쓰지 않음
    if (loadedDateRef.current === currentDate) return;
    // 현재 날짜 기록 완료
    loadedDateRef.current = currentDate;
    // 자동저장 타이머가 있으면 취소 (날짜 이동 시 이전 날짜 데이터로 저장되는 것 방지)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (reportData) {
      setReportId(reportData.id);
      setTeamCount(reportData.teamCount ?? 0);
      setNotes(reportData.notes ?? '');
      if (reportData.items && reportData.items.length > 0) {
        setItems(reportData.items.map((it: any) => ({
          id: it.id,
          localId: makeLocalId(),
          tableNumber: it.tableNumber,
          guestType: it.guestType,
          guestName: it.guestName ?? '',
          amount: it.amount ?? '',
          paymentMethod: it.paymentMethod,
          memo: it.memo ?? '',
        })));
      } else {
        setItems([emptyItem()]);
      }
      if (reportData.incentives && reportData.incentives.length > 0) {
        setIncentives(reportData.incentives.map((inc: any) => ({
          id: inc.id,
          localId: makeLocalId(),
          staffName: inc.staffName,
          glassCount: inc.glassCount ?? 0,
          bottleCount: inc.bottleCount ?? 0,
          beerBottleCount: inc.beerBottleCount ?? 0,
          salesIncentive: inc.salesIncentive ?? '',
          workStart: inc.workStart ?? '',
          workEnd: inc.workEnd ?? '',
          workStartAmPm: fromHHMM(inc.workStart ?? '').ampm,
          workEndAmPm: fromHHMM(inc.workEnd ?? '').ampm,
          workStartHour: fromHHMM(inc.workStart ?? '').hour,
          workEndHour: fromHHMM(inc.workEnd ?? '').hour,
          workStartMin: fromHHMM(inc.workStart ?? '').min,
          workEndMin: fromHHMM(inc.workEnd ?? '').min,
        })));
      } else {
        setIncentives([emptyIncentive()]);
      }
    } else if (reportData === null) {
      setReportId(null);
      setTeamCount(0);
      setNotes('');
      setItems([emptyItem()]);
      setIncentives([emptyIncentive()]);
    }
    // 날짜가 실제로 변경되었을 때만 saved 리셋 (저장 완료 후 데이터 로드 시에는 saved 유지)
    // setSaved(false)를 여기서 호출하면 저장 완료 후 서버 데이터가 다시 들어올 때 saved 표시가 사라짘
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData, currentDate, dataUpdatedAt]); // currentDate는 loadedDateRef로 체크하지만 의존성에도 포함하여 날짜 변경 시 실행 보장

  // tRPC mutations
  const batchSave = trpc.tableReport.batchSave.useMutation();
  const deleteItem = trpc.tableReport.deleteItem.useMutation();
  const deleteIncentive = trpc.tableReport.deleteIncentive.useMutation();

  // 저장 함수 - batchSave 단일 호출로 모든 항목 한 번에 저장
  const handleSave = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isSaving) return; // 중복 저장 방지
    setIsSaving(true);
    // 저장 중에는 loadedDateRef를 건드리지 않음 → useEffect가 중간에 상태를 덮어쓰지 않도록 방지
    try {
      const { id: rId, cashSum, cardSum, itemIdMap, incentiveIdMap } = await batchSave.mutateAsync({
        date: currentDate,
        teamCount,
        notes,
        items: items.map((it, i) => ({
          id: it.id,
          localId: it.localId,
          tableNumber: it.tableNumber,
          guestType: it.guestType,
          guestName: it.guestName || null,
          amount: it.amount || '0',
          paymentMethod: it.paymentMethod,
          memo: it.memo,
          sortOrder: i,
        })),
        incentives: incentives.map((inc, i) => ({
          id: inc.id,
          localId: inc.localId,
          staffName: inc.staffName,
          glassCount: inc.glassCount,
          bottleCount: inc.bottleCount,
          beerBottleCount: inc.beerBottleCount,
          salesIncentive: inc.salesIncentive || '0',
          workStart: inc.workStart || undefined,
          workEnd: inc.workEnd || undefined,
          sortOrder: i,
        })),
      });

      // 저장 완료 후 reportId 및 새 id 반영
      setReportId(rId);
      if (Object.keys(itemIdMap).length > 0) {
        setItems(prev => prev.map(p => itemIdMap[p.localId] ? { ...p, id: itemIdMap[p.localId] } : p));
      }
      if (Object.keys(incentiveIdMap).length > 0) {
        setIncentives(prev => prev.map(p => incentiveIdMap[p.localId] ? { ...p, id: incentiveIdMap[p.localId] } : p));
      }

      // 저장 완료 후 loadedDateRef를 현재 날짜로 설정 → useEffect가 서버 데이터로 덮어쓰지 않도록
      loadedDateRef.current = currentDate;

      setSaved(true);
      const cashFmt = cashSum > 0 ? `₩${cashSum.toLocaleString('ko-KR')}` : '—';
      const cardFmt = cardSum > 0 ? `₩${cardSum.toLocaleString('ko-KR')}` : '—';
      toast.success(`저장 완료 | 현금 ${cashFmt} / 카드 ${cardFmt}`, { duration: 2500 });
    } catch (e: any) {
      toast.error('저장 실패: ' + (e?.message ?? '알 수 없는 오류'));
    } finally {
      setIsSaving(false);
    }
  }, [currentDate, teamCount, notes, items, incentives, isSaving]);

  // 자동 저장 트리거 - 메모 입력 중 덮어쓰기 방지를 위해 딜레이를 길게 설정
  const scheduleAutoSave = useCallback(() => {
    setSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    // 자동저장은 5초 후 (입력 중 리셋 방지)
    saveTimeoutRef.current = setTimeout(() => handleSave(), 5000);
  }, [handleSave]);

  // 테이블 항목 업데이트 - 메모 변경 시 자동저장 트리거 안 함 (수동 저장만)
  const updateItemField = (localId: string, field: keyof TableItemLocal, value: string) => {
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, [field]: value } : it));
    if (field !== 'memo') scheduleAutoSave();
  };

  // 테이블 항목 삭제
  const removeItem = async (item: TableItemLocal) => {
    if (item.id) {
      try { await deleteItem.mutateAsync({ id: item.id }); } catch {}
    }
    setItems(prev => {
      const next = prev.filter(it => it.localId !== item.localId);
      return next.length === 0 ? [emptyItem()] : next;
    });
  };

  // 인센티브 업데이트
  const updateIncentiveField = (localId: string, field: keyof IncentiveLocal, value: string | number) => {
    setIncentives(prev => prev.map(inc => inc.localId === localId ? { ...inc, [field]: value } : inc));
    scheduleAutoSave();
  };

  // 인센티브 삭제
  const removeIncentive = async (inc: IncentiveLocal) => {
    if (inc.id) {
      try { await deleteIncentive.mutateAsync({ id: inc.id }); } catch {}
    }
    setIncentives(prev => {
      const next = prev.filter(i => i.localId !== inc.localId);
      return next.length === 0 ? [emptyIncentive()] : next;
    });
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.985 0.008 85)' }}>
      <div className="text-sm" style={{ color: 'oklch(0.45 0.01 50)' }}>로딩 중...</div>
    </div>;
  }

  if (!account) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'oklch(0.985 0.008 85)' }}>
      <p className="text-sm" style={{ color: 'oklch(0.45 0.01 50)' }}>로그인이 필요합니다</p>
      <button onClick={() => navigate('/login')} className="px-4 py-2 rounded text-sm text-white" style={{ background: 'oklch(0.45 0.18 25)' }}>로그인</button>
    </div>;
  }

  const today = getTodayString();
  const isToday = currentDate === today;

  const BG = 'oklch(0.985 0.008 85)';
  const BORDER = 'oklch(0.75 0.015 85)';
  const CARD_BG = 'oklch(0.995 0.005 85)';
  const HEADER_BG = 'oklch(0.93 0.015 85)';
  const PRIMARY = 'oklch(0.45 0.18 25)';
  const TEXT = 'oklch(0.12 0.01 50)';
  const MUTED = 'oklch(0.55 0.01 50)';

  // 현금/카드 합산 (화면 표시용)
  const cashTotal = items.filter(it => it.paymentMethod === 'cash').reduce((s, it) => s + Number(it.amount || 0), 0);
  const cardTotal = items.filter(it => it.paymentMethod === 'card').reduce((s, it) => s + Number(it.amount || 0), 0);

  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-10" style={{ background: BG, borderBottom: `1px solid ${BORDER}`, boxShadow: '0 1px 4px oklch(0 0 0 / 0.07)' }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <div className="text-sm font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>테이블 기록</div>
            <div className="text-xs" style={{ color: MUTED }}>{account.branch?.name ?? account.loginId}</div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'oklch(0.45 0.15 150)' }}>
                <CheckCircle2 size={13} />저장됨
              </span>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-2.5 py-1.5 rounded text-xs font-medium"
              style={{ background: HEADER_BG, color: TEXT, border: `1px solid ${BORDER}` }}
            >
              매출보고
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-white disabled:opacity-60"
              style={{ background: PRIMARY }}
            >
              {isSaving ? (
                <svg className="animate-spin" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              ) : (
                <Save size={13} />
              )}
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 날짜 네비게이터 */}
        <div className="flex items-center justify-between px-4 pb-2.5">
          <button onClick={() => setCurrentDate(d => moveDateBy(d, -1))} className="p-1.5 rounded-full" style={{ color: TEXT }}>
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <div className="text-base font-semibold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>
              {formatDateDisplay(currentDate)}
            </div>
            {!isToday && (
              <button onClick={() => setCurrentDate(today)} className="text-xs underline underline-offset-2" style={{ color: PRIMARY }}>
                오늘로 이동
              </button>
            )}
          </div>
          <button onClick={() => setCurrentDate(d => moveDateBy(d, 1))} disabled={isToday} className="p-1.5 rounded-full disabled:opacity-30" style={{ color: TEXT }}>
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* 팀수 + 현금/카드 합산 요약 */}
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between px-3 py-2.5" style={{ background: CARD_BG }}>
            <div className="flex items-center gap-2">
              <Users size={15} style={{ color: MUTED }} />
              <span className="text-sm font-semibold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>팀수</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setTeamCount(c => Math.max(0, c - 1)); scheduleAutoSave(); }} className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold" style={{ background: HEADER_BG, color: TEXT }}>−</button>
              <span className="w-8 text-center font-bold text-base" style={{ color: TEXT }}>{teamCount}</span>
              <button onClick={() => { setTeamCount(c => c + 1); scheduleAutoSave(); }} className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold" style={{ background: PRIMARY, color: 'white' }}>+</button>
            </div>
          </div>
          {/* 현금/카드 합산 표시 */}
          <div className="grid grid-cols-2 divide-x" style={{ borderTop: `1px solid ${BORDER}`, background: HEADER_BG, divideColor: BORDER } as any}>
            <div className="px-3 py-2 text-center">
              <div className="text-xs mb-0.5" style={{ color: MUTED }}>현금 합계</div>
              <div className="text-sm font-bold" style={{ color: cashTotal > 0 ? 'oklch(0.35 0.15 150)' : MUTED }}>
                {cashTotal > 0 ? `₩${cashTotal.toLocaleString('ko-KR')}` : '—'}
              </div>
            </div>
            <div className="px-3 py-2 text-center" style={{ borderLeft: `1px solid ${BORDER}` }}>
              <div className="text-xs mb-0.5" style={{ color: MUTED }}>카드 합계</div>
              <div className="text-sm font-bold" style={{ color: cardTotal > 0 ? 'oklch(0.35 0.12 250)' : MUTED }}>
                {cardTotal > 0 ? `₩${cardTotal.toLocaleString('ko-KR')}` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* 테이블 목록 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>■ 테이블 기록</div>
            <button
              onClick={() => setItems(prev => [...prev, emptyItem()])}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
              style={{ background: HEADER_BG, color: TEXT, border: `1px solid ${BORDER}` }}
            >
              <Plus size={12} />테이블 추가
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.localId} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: CARD_BG }}>
                {/* 1행: 번호 + 손님구분 + 삭제 */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}`, background: HEADER_BG }}>
                  <span className="text-xs font-semibold w-5 text-center flex-shrink-0" style={{ color: MUTED }}>{idx + 1}</span>
                  <input
                    type="text"
                    value={item.tableNumber}
                    onChange={e => updateItemField(item.localId, 'tableNumber', e.target.value)}
                    placeholder="테이블 번호"
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold min-w-0"
                    style={{ color: TEXT }}
                    lang="ko"
                    inputMode="text"
                  />
                  {/* 손님 구분 토글 */}
                  <div className="flex rounded overflow-hidden flex-shrink-0" style={{ border: `1px solid ${BORDER}` }}>
                    {(['walking', 'named'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => updateItemField(item.localId, 'guestType', type)}
                        className="px-2 py-0.5 text-xs font-medium transition-colors"
                        style={{
                          background: item.guestType === type ? PRIMARY : 'transparent',
                          color: item.guestType === type ? 'white' : MUTED,
                        }}
                      >
                        {type === 'walking' ? '워킹' : '지명'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => removeItem(item)} className="p-1 opacity-40 hover:opacity-70 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* 1.5행: 지명 시 손님 이름 입력 */}
                {item.guestType === 'named' && (
                  <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: `1px solid ${BORDER}`, background: `${PRIMARY}10` }}>
                    <span className="text-xs flex-shrink-0 font-medium" style={{ color: PRIMARY }}>손님</span>
                    <input
                      type="text"
                      value={item.guestName}
                      onChange={e => updateItemField(item.localId, 'guestName', e.target.value)}
                      placeholder="손님 이름 입력"
                      className="flex-1 bg-transparent border-none outline-none text-sm font-semibold min-w-0"
                      style={{ color: TEXT }}
                      lang="ko"
                      inputMode="text"
                    />
                  </div>
                )}

                {/* 2행: 금액 + 결제수단 */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <span className="text-xs flex-shrink-0" style={{ color: MUTED }}>₩</span>
                  <AmountInput
                    value={item.amount}
                    onChange={v => updateItemField(item.localId, 'amount', v)}
                    placeholder="금액"
                    className="flex-1 text-sm font-semibold min-w-0"
                  />
                  {/* 결제수단 */}
                  <div className="flex rounded overflow-hidden flex-shrink-0" style={{ border: `1px solid ${BORDER}` }}>
                    {(['card', 'cash', 'mixed'] as const).map(pm => (
                      <button
                        key={pm}
                        onClick={() => updateItemField(item.localId, 'paymentMethod', pm)}
                        className="px-2 py-0.5 text-xs font-medium transition-colors"
                        style={{
                          background: item.paymentMethod === pm ? PRIMARY : 'transparent',
                          color: item.paymentMethod === pm ? 'white' : MUTED,
                        }}
                      >
                        {pm === 'card' ? '카드' : pm === 'cash' ? '현금' : '혼합'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3행: 메모 (형광펜 기능 포함) */}
                <div className="px-3 py-2">
                  <MemoEditor
                    value={item.memo}
                    onChange={html => updateItemField(item.localId, 'memo', html)}
                    placeholder="주문 메모 (예: 무제한x2, 지인3간)"
                    textColor={TEXT}
                    borderColor={BORDER}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 출근자 인센티브 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Wine size={14} style={{ color: MUTED }} />
              <div className="text-sm font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>■ 출근자 인센티브</div>
            </div>
            <button
              onClick={() => setIncentives(prev => [...prev, emptyIncentive()])}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
              style={{ background: HEADER_BG, color: TEXT, border: `1px solid ${BORDER}` }}
            >
              <Plus size={12} />추가
            </button>
          </div>

          <div className="space-y-2">
            {incentives.map(inc => (
              <div key={inc.localId} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: CARD_BG }}>
                {/* 1행: 이름 + 삭제 */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}`, background: HEADER_BG }}>
                  <input
                    type="text"
                    value={inc.staffName}
                    onChange={e => updateIncentiveField(inc.localId, 'staffName', e.target.value)}
                    placeholder="직원 이름"
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold"
                    style={{ color: TEXT }}
                    lang="ko"
                    inputMode="text"
                  />
                  <button onClick={() => removeIncentive(inc)} className="p-1 opacity-40 hover:opacity-70">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* 2행: 잔추가 / 병추가 / 맥주병 */}
                <div className="grid grid-cols-3 divide-x" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {([
                    { field: 'glassCount' as const, label: '잔추가' },
                    { field: 'bottleCount' as const, label: '병추가' },
                    { field: 'beerBottleCount' as const, label: '맥주병' },
                  ]).map(({ field, label }) => (
                    <div key={field} className="px-2 py-2 text-center" style={{ borderRight: field !== 'beerBottleCount' ? `1px solid ${BORDER}` : undefined }}>
                      <div className="text-xs mb-1" style={{ color: MUTED }}>{label}</div>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateIncentiveField(inc.localId, field, Math.max(0, (inc[field] as number) - 1))}
                          className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                          style={{ background: HEADER_BG, color: TEXT }}
                        >−</button>
                        <span className="w-5 text-center text-sm font-semibold" style={{ color: TEXT }}>{inc[field]}</span>
                        <button
                          onClick={() => updateIncentiveField(inc.localId, field, (inc[field] as number) + 1)}
                          className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                          style={{ background: PRIMARY, color: 'white' }}
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3행: 영업인센 금액 */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <span className="text-xs flex-shrink-0" style={{ color: MUTED }}>영업인센</span>
                  <span className="text-xs flex-shrink-0" style={{ color: MUTED }}>₩</span>
                  <AmountInput
                    value={inc.salesIncentive}
                    onChange={v => updateIncentiveField(inc.localId, 'salesIncentive', v)}
                    placeholder="금액 입력"
                    className="flex-1 text-sm font-semibold"
                  />
                </div>

                {/* 4행: 근무 시간 - 오전/오후 토글 + 시간 직접 입력 */}
                <div className="px-3 py-2 space-y-1.5">
                  {/* 시작 시간 */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs w-8 flex-shrink-0" style={{ color: MUTED }}>출근</span>
                    <div className="flex rounded overflow-hidden border text-xs" style={{ borderColor: BORDER }}>
                      {(['AM', 'PM'] as const).map(ap => (
                        <button
                          key={ap}
                          type="button"
                          onClick={() => {
                            const hhmm = toHHMM(ap, inc.workStartHour, inc.workStartMin);
                            updateIncentiveField(inc.localId, 'workStartAmPm', ap);
                            if (hhmm) updateIncentiveField(inc.localId, 'workStart', hhmm);
                          }}
                          className="px-2 py-0.5 font-medium transition-colors"
                          style={{
                            background: inc.workStartAmPm === ap ? PRIMARY : 'transparent',
                            color: inc.workStartAmPm === ap ? 'white' : MUTED,
                          }}
                        >
                          {ap === 'AM' ? '오전' : '오후'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      lang="ko"
                      value={inc.workStartHour}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        updateIncentiveField(inc.localId, 'workStartHour', v);
                        const hhmm = toHHMM(inc.workStartAmPm, v, inc.workStartMin);
                        if (hhmm) updateIncentiveField(inc.localId, 'workStart', hhmm);
                      }}
                      placeholder="시"
                      className="w-10 text-center border rounded text-sm py-0.5 bg-transparent outline-none"
                      style={{ borderColor: BORDER, color: TEXT }}
                    />
                    <span className="text-xs" style={{ color: MUTED }}>:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      lang="ko"
                      value={inc.workStartMin}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        updateIncentiveField(inc.localId, 'workStartMin', v);
                        const hhmm = toHHMM(inc.workStartAmPm, inc.workStartHour, v);
                        if (hhmm) updateIncentiveField(inc.localId, 'workStart', hhmm);
                      }}
                      placeholder="분"
                      className="w-10 text-center border rounded text-sm py-0.5 bg-transparent outline-none"
                      style={{ borderColor: BORDER, color: TEXT }}
                    />
                  </div>
                  {/* 종료 시간 */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs w-8 flex-shrink-0" style={{ color: MUTED }}>퇴근</span>
                    <div className="flex rounded overflow-hidden border text-xs" style={{ borderColor: BORDER }}>
                      {(['AM', 'PM'] as const).map(ap => (
                        <button
                          key={ap}
                          type="button"
                          onClick={() => {
                            const hhmm = toHHMM(ap, inc.workEndHour, inc.workEndMin);
                            updateIncentiveField(inc.localId, 'workEndAmPm', ap);
                            if (hhmm) updateIncentiveField(inc.localId, 'workEnd', hhmm);
                          }}
                          className="px-2 py-0.5 font-medium transition-colors"
                          style={{
                            background: inc.workEndAmPm === ap ? PRIMARY : 'transparent',
                            color: inc.workEndAmPm === ap ? 'white' : MUTED,
                          }}
                        >
                          {ap === 'AM' ? '오전' : '오후'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      lang="ko"
                      value={inc.workEndHour}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        updateIncentiveField(inc.localId, 'workEndHour', v);
                        const hhmm = toHHMM(inc.workEndAmPm, v, inc.workEndMin);
                        if (hhmm) updateIncentiveField(inc.localId, 'workEnd', hhmm);
                      }}
                      placeholder="시"
                      className="w-10 text-center border rounded text-sm py-0.5 bg-transparent outline-none"
                      style={{ borderColor: BORDER, color: TEXT }}
                    />
                    <span className="text-xs" style={{ color: MUTED }}>:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      lang="ko"
                      value={inc.workEndMin}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        updateIncentiveField(inc.localId, 'workEndMin', v);
                        const hhmm = toHHMM(inc.workEndAmPm, inc.workEndHour, v);
                        if (hhmm) updateIncentiveField(inc.localId, 'workEnd', hhmm);
                      }}
                      placeholder="분"
                      className="w-10 text-center border rounded text-sm py-0.5 bg-transparent outline-none"
                      style={{ borderColor: BORDER, color: TEXT }}
                    />
                    {/* 자동 계산 총 근무시간 */}
                    {inc.workStart && inc.workEnd && (() => {
                      const [sh, sm] = inc.workStart.split(':').map(Number);
                      const [eh, em] = inc.workEnd.split(':').map(Number);
                      let startMin = sh * 60 + sm;
                      let endMin = eh * 60 + em;
                      if (endMin <= startMin) endMin += 24 * 60;
                      const diff = endMin - startMin;
                      const hours = Math.floor(diff / 60);
                      const mins = diff % 60;
                      return (
                        <span className="text-xs font-semibold flex-shrink-0 px-1.5 py-0.5 rounded ml-1" style={{ background: PRIMARY, color: 'white' }}>
                          {hours > 0 ? `${hours}시간` : ''}{mins > 0 ? `${mins}분` : hours === 0 ? '0분' : ''}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 기타 사항 */}
        <div className="rounded-lg p-3" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-bold mb-2" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>■ 기타 사항</div>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); scheduleAutoSave(); }}
            placeholder="특이사항 등 자유롭게 입력"
            rows={3}
            className="w-full bg-transparent border-none outline-none text-sm resize-none"
            style={{ color: TEXT }}
          />
        </div>
      </main>

      {/* 하단 저장 버튼 */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3"
        style={{ background: BG, borderTop: `1px solid ${BORDER}`, boxShadow: '0 -2px 8px oklch(0 0 0 / 0.06)' }}
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
          style={{ background: PRIMARY }}
        >
          {isSaving ? (
            <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          ) : (
            <Save size={16} />
          )}
          {isSaving ? '저장 중...' : '저장하기 (현금/카드 매출 자동 반영)'}
        </button>
      </div>
    </div>
  );
}
