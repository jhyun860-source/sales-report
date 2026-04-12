/**
 * 테이블 영업 기록 페이지
 * - 날짜별 테이블 목록 (번호, 손님구분, 금액, 결제수단, 메모)
 * - 출근자 인센티브 (잔추가, 병추가, 맥주병추가)
 * - 팀수, 기타 사항, 신규손님 팁
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, CheckCircle2, Users, Wine } from 'lucide-react';
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
      className={`bg-transparent border-none outline-none text-right ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    />
  );
}

// 테이블 카드 타입
type TableItemLocal = {
  id?: number;
  localId: string;
  tableNumber: string;
  guestType: 'walking' | 'regular';
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
};

function makeLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function emptyItem(): TableItemLocal {
  return { localId: makeLocalId(), tableNumber: '', guestType: 'walking', amount: '', paymentMethod: 'card', memo: '' };
}

function emptyIncentive(): IncentiveLocal {
  return { localId: makeLocalId(), staffName: '', glassCount: 0, bottleCount: 0, beerBottleCount: 0 };
}

export default function TableReport() {
  const [, navigate] = useLocation();
  const { user: account, loading: authLoading } = useStoreAuth();
  const [currentDate, setCurrentDate] = useState(getTodayString);
  const [teamCount, setTeamCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [branchNewGuestTip, setBranchNewGuestTip] = useState('');
  const [barNewGuestTip, setBarNewGuestTip] = useState('');
  const [items, setItems] = useState<TableItemLocal[]>([emptyItem()]);
  const [incentives, setIncentives] = useState<IncentiveLocal[]>([emptyIncentive()]);
  const [reportId, setReportId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 날짜별 기록 조회
  const { data: reportData, refetch } = trpc.tableReport.getByDate.useQuery(
    { date: currentDate },
    { enabled: !!account }
  );


  // 서버 데이터 → 로컬 상태 동기화
  useEffect(() => {
    if (reportData) {
      setReportId(reportData.id);
      setTeamCount(reportData.teamCount ?? 0);
      setNotes(reportData.notes ?? '');
      setBranchNewGuestTip(reportData.branchNewGuestTip ?? '');
      setBarNewGuestTip(reportData.barNewGuestTip ?? '');
      if (reportData.items && reportData.items.length > 0) {
        setItems(reportData.items.map((it: any) => ({
          id: it.id,
          localId: makeLocalId(),
          tableNumber: it.tableNumber,
          guestType: it.guestType,
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
        })));
      } else {
        setIncentives([emptyIncentive()]);
      }
    } else {
      setReportId(null);
      setTeamCount(0);
      setNotes('');
      setBranchNewGuestTip('');
      setBarNewGuestTip('');
      setItems([emptyItem()]);
      setIncentives([emptyIncentive()]);
    }
    setSaved(false);
  }, [reportData, currentDate]);

  // tRPC mutations
  const upsertReport = trpc.tableReport.upsert.useMutation();
  const addItem = trpc.tableReport.addItem.useMutation();
  const updateItem = trpc.tableReport.updateItem.useMutation();
  const deleteItem = trpc.tableReport.deleteItem.useMutation();
  const addIncentive = trpc.tableReport.addIncentive.useMutation();
  const updateIncentive = trpc.tableReport.updateIncentive.useMutation();
  const deleteIncentive = trpc.tableReport.deleteIncentive.useMutation();

  // 저장 함수
  const handleSave = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    try {
      // 1. 기록 upsert
      const { id: rId } = await upsertReport.mutateAsync({
        date: currentDate,
        teamCount,
        notes,
        branchNewGuestTip: branchNewGuestTip || '0',
        barNewGuestTip: barNewGuestTip || '0',
      });
      setReportId(rId);

      // 2. 테이블 항목 저장 (id 없으면 추가, 있으면 수정)
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.tableNumber && !it.amount && !it.memo) continue; // 빈 항목 스킵
        if (it.id) {
          await updateItem.mutateAsync({
            id: it.id,
            tableNumber: it.tableNumber,
            guestType: it.guestType,
            amount: it.amount || '0',
            paymentMethod: it.paymentMethod,
            memo: it.memo,
          });
        } else {
          const { id: newId } = await addItem.mutateAsync({
            tableReportId: rId,
            tableNumber: it.tableNumber,
            guestType: it.guestType,
            amount: it.amount || '0',
            paymentMethod: it.paymentMethod,
            memo: it.memo,
            sortOrder: i,
          });
          setItems(prev => prev.map(p => p.localId === it.localId ? { ...p, id: newId } : p));
        }
      }

      // 3. 인센티브 저장
      for (let i = 0; i < incentives.length; i++) {
        const inc = incentives[i];
        if (!inc.staffName) continue;
        if (inc.id) {
          await updateIncentive.mutateAsync({
            id: inc.id,
            staffName: inc.staffName,
            glassCount: inc.glassCount,
            bottleCount: inc.bottleCount,
            beerBottleCount: inc.beerBottleCount,
          });
        } else {
          const { id: newId } = await addIncentive.mutateAsync({
            tableReportId: rId,
            staffName: inc.staffName,
            glassCount: inc.glassCount,
            bottleCount: inc.bottleCount,
            beerBottleCount: inc.beerBottleCount,
            sortOrder: i,
          });
          setIncentives(prev => prev.map(p => p.localId === inc.localId ? { ...p, id: newId } : p));
        }
      }

      setSaved(true);
      toast.success('저장되었습니다', { duration: 1500 });
      refetch();
    } catch (e: any) {
      toast.error('저장 실패: ' + (e?.message ?? '알 수 없는 오류'));
    }
  }, [currentDate, teamCount, notes, branchNewGuestTip, barNewGuestTip, items, incentives]);

  // 자동 저장 트리거
  const scheduleAutoSave = useCallback(() => {
    setSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => handleSave(), 2000);
  }, [handleSave]);

  // 테이블 항목 업데이트
  const updateItemField = (localId: string, field: keyof TableItemLocal, value: string) => {
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, [field]: value } : it));
    scheduleAutoSave();
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-white"
              style={{ background: PRIMARY }}
            >
              <Save size={13} />저장
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
        {/* 팀수 */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
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
                {/* 1행: 테이블 번호 + 손님구분 + 삭제 */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}`, background: HEADER_BG }}>
                  <span className="text-xs font-semibold w-6 text-center" style={{ color: MUTED }}>{idx + 1}</span>
                  <input
                    type="text"
                    value={item.tableNumber}
                    onChange={e => updateItemField(item.localId, 'tableNumber', e.target.value)}
                    placeholder="테이블 번호"
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold"
                    style={{ color: TEXT }}
                  />
                  {/* 손님 구분 토글 */}
                  <div className="flex rounded overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                    {(['walking', 'regular'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => updateItemField(item.localId, 'guestType', type)}
                        className="px-2 py-0.5 text-xs font-medium transition-colors"
                        style={{
                          background: item.guestType === type ? PRIMARY : 'transparent',
                          color: item.guestType === type ? 'white' : MUTED,
                        }}
                      >
                        {type === 'walking' ? '워킹' : '기존'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => removeItem(item)} className="p-1 opacity-40 hover:opacity-70">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* 2행: 금액 + 결제수단 */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <span className="text-xs" style={{ color: MUTED }}>₩</span>
                  <AmountInput
                    value={item.amount}
                    onChange={v => updateItemField(item.localId, 'amount', v)}
                    placeholder="금액"
                    className="flex-1 text-sm font-semibold"
                  />
                  {/* 결제수단 */}
                  <div className="flex rounded overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
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

                {/* 3행: 메모 */}
                <div className="px-3 py-2">
                  <input
                    type="text"
                    value={item.memo}
                    onChange={e => updateItemField(item.localId, 'memo', e.target.value)}
                    placeholder="주문 메모 (예: 무제한x2, 지인3간)"
                    className="w-full bg-transparent border-none outline-none text-xs"
                    style={{ color: TEXT }}
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

          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {/* 헤더 행 */}
            <div className="grid text-xs font-semibold py-2" style={{ gridTemplateColumns: '1fr 60px 60px 60px 32px', background: HEADER_BG, color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
              <div className="px-3">이름</div>
              <div className="text-center">잔추가</div>
              <div className="text-center">병추가</div>
              <div className="text-center">맥주병</div>
              <div />
            </div>

            {incentives.map(inc => (
              <div
                key={inc.localId}
                className="grid items-center py-1.5"
                style={{ gridTemplateColumns: '1fr 60px 60px 60px 32px', background: CARD_BG, borderBottom: `1px solid ${BORDER}` }}
              >
                <div className="px-3">
                  <input
                    type="text"
                    value={inc.staffName}
                    onChange={e => updateIncentiveField(inc.localId, 'staffName', e.target.value)}
                    placeholder="이름"
                    className="w-full bg-transparent border-none outline-none text-sm"
                    style={{ color: TEXT }}
                  />
                </div>
                {(['glassCount', 'bottleCount', 'beerBottleCount'] as const).map(field => (
                  <div key={field} className="flex items-center justify-center gap-0.5">
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
                ))}
                <div className="flex justify-center">
                  <button onClick={() => removeIncentive(inc)} className="p-1 opacity-40 hover:opacity-70">
                    <Trash2 size={12} />
                  </button>
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
            placeholder="근무 시간, 특이사항 등 자유롭게 입력"
            rows={3}
            className="w-full bg-transparent border-none outline-none text-sm resize-none"
            style={{ color: TEXT }}
          />
        </div>

        {/* 신규손님 팁 */}
        <div className="rounded-lg p-3" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-bold mb-3" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>■ 신규손님 팁</div>
          <div className="space-y-2">
            {[
              { label: '지점 신규손님', value: branchNewGuestTip, onChange: setBranchNewGuestTip },
              { label: 'BAR 신규손님', value: barNewGuestTip, onChange: setBarNewGuestTip },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <span className="text-sm" style={{ color: MUTED }}>{label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: MUTED }}>₩</span>
                  <AmountInput
                    value={value}
                    onChange={v => { onChange(v); scheduleAutoSave(); }}
                    placeholder="0"
                    className="w-28 text-sm font-semibold"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 하단 저장 버튼 */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3"
        style={{ background: BG, borderTop: `1px solid ${BORDER}`, boxShadow: '0 -2px 8px oklch(0 0 0 / 0.06)' }}
      >
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: PRIMARY }}
        >
          <Save size={16} />저장하기
        </button>
      </div>
    </div>
  );
}
