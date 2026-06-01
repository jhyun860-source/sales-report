/**
 * 테이블 영업 기록 페이지
 * - 날짜별 테이블 목록 (번호, 손님구분, 금액, 결제수단, 메모)
 * - 출근자 인센티브 (잔추가, 병추가, 맥주병추가, 영업인센, 근무시간)
 * - 팀수, 기타 사항
 * - 저장 시 현금/카드 합산값이 매출기록에 자동 반영됨
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, CheckCircle2, Users, Wine, Camera, Merge } from 'lucide-react';
import { MemoEditor } from '@/components/MemoEditor';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { MANAGER_LIQUOR_EDIT_IDS } from '@/lib/accountAccess';

// Google Sheets 전송을 위한 GAS URL
const GAS_URL = "https://script.google.com/macros/s/AKfycbxZ8v9UvsEKUGRuipvDPwFvdVh3SccEg7NQAjHRGGAUCry8-UEhkD7l62LyrlN7Yq_Vdg/exec";

// 날짜 포맷
function getTodayString() {
  const d = new Date();
  // 일요일(0)이면 전날(토요일)로
  if (d.getDay() === 0) d.setDate(d.getDate() - 1);
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
  // 이동한 날짜가 일요일이면 같은 방향으로 한 칸 더 이동
  if (d.getDay() === 0) d.setDate(d.getDate() + days);
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
  paymentMethod: 'card' | 'cash';
  memo: string;
};

// 직원 인센티브 타입
type IncentiveLocal = {
  id?: number;
  localId: string;
  staffName: string;
  staffType: 'staff' | 'parttime'; // 직원/아르바이트
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
  return { localId: makeLocalId(), staffName: '', staffType: 'staff', glassCount: 0, bottleCount: 0, beerBottleCount: 0, salesIncentive: '', workStart: '', workEnd: '', workStartAmPm: 'PM', workEndAmPm: 'PM', workStartHour: '', workEndHour: '', workStartMin: '', workEndMin: '' };
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
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        // 일요일이면 토요일로 보정
        const d = new Date(saved.replace(/-/g, '/'));
        if (d.getDay() === 0) {
          d.setDate(d.getDate() - 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        return saved;
      }
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

  // URL 파라미터에서 branchId 읽기 (관리자가 지점 선택 후 이동 시 사용)
  const search = useSearch();
  const urlBranchId = (() => {
    const params = new URLSearchParams(search);
    const v = params.get('branchId');
    const parsed = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  })();
  const storedBranchId = (() => {
    try {
      const saved = localStorage.getItem('selectedBranchId');
      const parsed = saved ? parseInt(saved, 10) : NaN;
      return Number.isFinite(parsed) ? parsed : undefined;
    } catch { return undefined; }
  })();
  const effectiveBranchId = urlBranchId ?? (account?.role === 'admin' ? storedBranchId : account?.branchId) ?? undefined;

  useEffect(() => {
    if (!effectiveBranchId) return;
    try { localStorage.setItem('selectedBranchId', String(effectiveBranchId)); } catch {}
  }, [effectiveBranchId]);

  // 날짜별 기록 조회 - staleTime을 길게 설정해 자동 리페치 방지
  const { data: reportData, dataUpdatedAt } = trpc.tableReport.getByDate.useQuery(
    { date: currentDate, branchId: effectiveBranchId },
    { enabled: !!account && !!effectiveBranchId, staleTime: Infinity, refetchOnWindowFocus: false }
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
          staffType: (inc.staffType as 'staff' | 'parttime') ?? 'staff',
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

  // 형광펜 패턴 자동 학습 - 앱 로드 시 이전 메모에서 패턴 추출 후 localStorage 캐시
  const highlightCacheKey = `highlight_patterns_${effectiveBranchId ?? 'unknown'}`;

  // [수정] 사용자 학습형 형광펜 제외 단어 저장 키
  //   - 사용자가 자동 형광펜을 지운 단어를 누적 카운트하여,
  //     일정 횟수(EXCLUDE_THRESHOLD 이상) 제거되면 다음 분석부터 자동 제외하는 학습형 로직.
  const highlightExcludeKey = `excluded_highlight_patterns_${effectiveBranchId ?? 'unknown'}`;

  type HighlightExcludes = {
    yellow: Record<string, number>; // 단어 -> 사용자가 mark를 지운 횟수
    pink: Record<string, number>;
    updatedAt: number;
  };

  const loadHighlightExcludes = (): HighlightExcludes => {
    try {
      const raw = localStorage.getItem(highlightExcludeKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          yellow: parsed.yellow ?? {},
          pink: parsed.pink ?? {},
          updatedAt: parsed.updatedAt ?? 0,
        };
      }
    } catch {}
    return { yellow: {}, pink: {}, updatedAt: 0 };
  };

  const saveHighlightExcludes = (next: HighlightExcludes) => {
    try {
      localStorage.setItem(highlightExcludeKey, JSON.stringify(next));
    } catch {}
  };

  // 학습 임계값: 1이면 한 번 지우면 즉시 제외, 2이면 두 번 이상 지웠을 때 제외
  const EXCLUDE_THRESHOLD = 1;

  const isExcluded = (excludes: HighlightExcludes, color: 'yellow' | 'pink', word: string): boolean => {
    const map = color === 'yellow' ? excludes.yellow : excludes.pink;
    return (map[word] ?? 0) >= EXCLUDE_THRESHOLD;
  };

  const filterByExcludes = (
    list: string[] | undefined,
    color: 'yellow' | 'pink',
    excludes: HighlightExcludes,
  ): string[] => {
    if (!list || list.length === 0) return [];
    return list.filter(w => !isExcluded(excludes, color, w));
  };

  // 메모 HTML에서 색깔별 mark 텍스트 추출 (yellow / pink)
  const extractMarkedTexts = (html: string): { yellow: string[]; pink: string[] } => {
    const yellow: string[] = [];
    const pink: string[] = [];
    if (!html) return { yellow, pink };
    const yMatches = Array.from(html.matchAll(/<mark[^>]*rgb\(255,\s*224,\s*102\)[^>]*>([\s\S]*?)<\/mark>/g));
    for (const m of yMatches) yellow.push(m[1].replace(/<[^>]+>/g, '').trim());
    const pMatches = Array.from(html.matchAll(/<mark[^>]*rgb\(255,\s*179,\s*209\)[^>]*>([\s\S]*?)<\/mark>/g));
    for (const m of pMatches) pink.push(m[1].replace(/<[^>]+>/g, '').trim());
    return { yellow, pink };
  };

  // localStorage에서 캐시된 패턴 초기 로드
  const [highlightPatterns, setHighlightPatterns] = useState<{
    yellowKeywords: string[];
    pinkKeywords: string[];
    recentMemoExamples: string[];
    cachedAt: number;
  } | null>(() => {
    try {
      const raw = localStorage.getItem(highlightCacheKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  // [학습 함수] 분석된 keyword 중, 메모 HTML에 "단어 경계가 보존된 평문"으로는 존재하나
  // mark 태그로는 적용되어 있지 않은 단어를 "사용자가 mark를 지운 단어"로 보고 카운트 +1.
  const learnHighlightExcludesFromMemo = (memoHtml: string) => {
    if (!memoHtml) return;
    const patterns = highlightPatterns;
    if (!patterns) return;
    const { yellow: markedYellow, pink: markedPink } = extractMarkedTexts(memoHtml);
    const cleanText = memoHtml.replace(/<[^>]+>/g, '');
    const next = loadHighlightExcludes();

    // 단어 일부로 붙어있으면 안 되는 인접 문자 패턴
    const ADJACENT_BAD = /[\uAC00-\uD7A3A-Za-z0-9(]/;
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 단어 경계 기반 평문 발생 검사
    const hasPlainOccurrence = (kw: string): boolean => {
      if (!kw || kw.length <= 1) return false;
      const re = new RegExp(escapeRegExp(kw), 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(cleanText)) !== null) {
        const before = m.index > 0 ? cleanText[m.index - 1] : '';
        const after = m.index + kw.length < cleanText.length ? cleanText[m.index + kw.length] : '';
        const beforeBad = before && ADJACENT_BAD.test(before);
        const afterBad = after && ADJACENT_BAD.test(after);
        if (!beforeBad && !afterBad) return true;
      }
      return false;
    };

    const containsAsPlain = (kw: string, marked: string[]): boolean => {
      if (!hasPlainOccurrence(kw)) return false;
      const inMark = marked.some(m => m.includes(kw));
      return !inMark;
    };

    let changed = false;
    for (const kw of patterns.yellowKeywords ?? []) {
      if (containsAsPlain(kw, markedYellow)) {
        next.yellow[kw] = (next.yellow[kw] ?? 0) + 1;
        changed = true;
      }
    }
    for (const kw of patterns.pinkKeywords ?? []) {
      if (containsAsPlain(kw, markedPink)) {
        next.pink[kw] = (next.pink[kw] ?? 0) + 1;
        changed = true;
      }
    }
    if (changed) {
      next.updatedAt = Date.now();
      saveHighlightExcludes(next);
    }
  };

  // 서버에서 패턴 조회
  const shouldFetchPatterns = !!account && !!effectiveBranchId && (
    !highlightPatterns || Date.now() - highlightPatterns.cachedAt > 60 * 60 * 1000
  );
  const { data: fetchedPatterns } = trpc.tableReport.getHighlightPatterns.useQuery(
    { branchId: effectiveBranchId },
    { enabled: shouldFetchPatterns, staleTime: Infinity, refetchOnWindowFocus: false }
  );

  // 서버에서 패턴 받으면 localStorage에 캐시
  useEffect(() => {
    if (!fetchedPatterns) return;
    const cached = {
      yellowKeywords: fetchedPatterns.yellowKeywords,
      pinkKeywords: fetchedPatterns.pinkKeywords,
      recentMemoExamples: fetchedPatterns.recentMemoExamples,
      cachedAt: Date.now(),
    };
    setHighlightPatterns(cached);
    try { localStorage.setItem(highlightCacheKey, JSON.stringify(cached)); } catch {}
  }, [fetchedPatterns, highlightCacheKey]);

  // tRPC mutations
  const utils = trpc.useUtils();
  const batchSave = trpc.tableReport.batchSave.useMutation();
  const deleteItem = trpc.tableReport.deleteItem.useMutation();
  const deleteIncentive = trpc.tableReport.deleteIncentive.useMutation();
  const analyzeOrderMemo = trpc.tableReport.analyzeOrderMemo.useMutation();

  // Google Sheets 전송 함수
  const syncToGoogleSheets = async (rData: any) => {
    try {
      const branchName = account?.branch?.name || "알 수 없음";
      const totalSales = items.reduce((s, it) => s + Number(it.amount || 0), 0);
      
      // 전송 데이터 구성
      const payload = {
        date: currentDate,
        branchName: branchName,
        sales: totalSales,
        commission: 0, // 로직에 따라 계산 필요
        netProfit: totalSales, // 예시
        staffType: incentives[0]?.staffType || "staff",
        drinkCount: incentives.reduce((s, inc) => s + (inc.glassCount || 0) + (inc.bottleCount || 0), 0),
        staffDrinkIncentive: incentives.reduce((s, inc) => s + Number(inc.salesIncentive || 0), 0),
        rent: 0 // 전날 데이터 기반 조회 필요
      };

      await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("Google Sheets sync triggered");
    } catch (e) {
      console.error("Google Sheets sync failed:", e);
    }
  };

  // 저장 함수
  const handleSave = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isSaving) return;
    setIsSaving(true);

    try {
      for (const it of items) {
        if (it.memo) learnHighlightExcludesFromMemo(it.memo);
      }
    } catch (e) {
      console.warn('[highlight-excludes] 학습 실패:', e);
    }

    try {
      const result = await batchSave.mutateAsync({
        date: currentDate,
        teamCount,
        notes,
        branchId: effectiveBranchId,
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
          staffType: inc.staffType,
          glassCount: inc.glassCount,
          bottleCount: inc.bottleCount,
          beerBottleCount: inc.beerBottleCount,
          salesIncentive: inc.salesIncentive || '0',
          workStart: inc.workStart || undefined,
          workEnd: inc.workEnd || undefined,
          sortOrder: i,
        })),
      });

      // Google Sheets 동기화 실행
      syncToGoogleSheets(result);

      setReportId(result.id);
      if (Object.keys(result.itemIdMap).length > 0) {
        setItems(prev => prev.map(p => result.itemIdMap[p.localId] ? { ...p, id: result.itemIdMap[p.localId] } : p));
      }
      if (Object.keys(result.incentiveIdMap).length > 0) {
        setIncentives(prev => prev.map(p => result.incentiveIdMap[p.localId] ? { ...p, id: result.incentiveIdMap[p.localId] } : p));
      }

      loadedDateRef.current = currentDate;
      setSaved(true);
      toast.success(`저장 완료 | 구글 시트 동기화 중...`, { duration: 2500 });
    } catch (e: any) {
      toast.error('저장 실패: ' + (e?.message ?? '알 수 없는 오류'));
    } finally {
      setIsSaving(false);
    }
  }, [currentDate, teamCount, notes, items, incentives, isSaving, effectiveBranchId, account]);

  // 자동 저장 트리거
  const scheduleAutoSave = useCallback(() => {
    setSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => handleSave(), 5000);
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

  // 사진 찍어서 메모 자동 입력
  const [analyzingLocalId, setAnalyzingLocalId] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const pendingAnalyzeLocalIdRef = useRef<string | null>(null);

  const handleCameraCapture = useCallback((localId: string) => {
    pendingAnalyzeLocalIdRef.current = localId;
    cameraInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const localId = pendingAnalyzeLocalIdRef.current;
    e.target.value = '';
    if (!file || !localId) return;

    setAnalyzingLocalId(localId);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const learnedExcludes = loadHighlightExcludes();
      const filteredYellow = filterByExcludes(highlightPatterns?.yellowKeywords, 'yellow', learnedExcludes);
      const filteredPink = filterByExcludes(highlightPatterns?.pinkKeywords, 'pink', learnedExcludes);
      const excludedYellowWords = Object.entries(learnedExcludes.yellow).filter(([, c]) => c >= EXCLUDE_THRESHOLD).map(([w]) => w);
      const excludedPinkWords = Object.entries(learnedExcludes.pink).filter(([, c]) => c >= EXCLUDE_THRESHOLD).map(([w]) => w);

      const { memo, amount } = await analyzeOrderMemo.mutateAsync({
        imageBase64: base64,
        mimeType: file.type || 'image/jpeg',
        branchId: effectiveBranchId,
        date: currentDate,
        preloadedYellow: filteredYellow,
        preloadedPink: filteredPink,
        preloadedExamples: highlightPatterns?.recentMemoExamples,
        excludedYellow: excludedYellowWords,
        excludedPink: excludedPinkWords,
      });
      if (memo) {
        updateItemField(localId, 'memo', memo);
        if (amount) updateItemField(localId, 'amount', amount);
        toast.success('분석 완료');
      }
    } catch (err: any) {
      toast.error('분석 실패');
    } finally {
      setAnalyzingLocalId(null);
    }
  }, [analyzeOrderMemo, updateItemField, effectiveBranchId, currentDate, highlightPatterns]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  if (!account) return <div className="min-h-screen flex items-center justify-center">로그인이 필요합니다</div>;

  const cashTotal = items.filter(it => it.paymentMethod === 'cash').reduce((s, it) => s + Number(it.amount || 0), 0);
  const cardTotal = items.filter(it => it.paymentMethod === 'card').reduce((s, it) => s + Number(it.amount || 0), 0);
  const totalAll = cashTotal + cardTotal;

  return (
    <div className="min-h-screen pb-28" style={{ background: 'oklch(0.985 0.008 85)' }}>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageFileChange} />
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-2.5 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">테이블 기록</div>
          <div className="text-xs text-gray-500">{account.branch?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={13} />저장됨</span>}
          <button onClick={handleSave} disabled={isSaving} className="bg-black text-white px-3 py-1.5 rounded text-xs">
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* 요약 */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold">팀수</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setTeamCount(c => Math.max(0, c - 1))} className="w-8 h-8 rounded-full bg-gray-100">−</button>
              <span className="font-bold">{teamCount}</span>
              <button onClick={() => setTeamCount(c => c + 1)} className="w-8 h-8 rounded-full bg-black text-white">+</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><div className="text-gray-500">현금</div><div className="font-bold">₩{cashTotal.toLocaleString()}</div></div>
            <div><div className="text-gray-500">카드</div><div className="font-bold">₩{cardTotal.toLocaleString()}</div></div>
            <div><div className="text-gray-500">합계</div><div className="font-bold">₩{totalAll.toLocaleString()}</div></div>
          </div>
        </div>

        {/* 테이블 목록 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold">■ 테이블 기록</span>
            <button onClick={() => setItems([...items, emptyItem()])} className="text-xs border px-2 py-1 rounded">+ 추가</button>
          </div>
          {items.map((item, idx) => (
            <div key={item.localId} className="bg-white rounded-lg border p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{idx + 1}</span>
                <input value={item.tableNumber} onChange={e => updateItemField(item.localId, 'tableNumber', e.target.value)} placeholder="번호" className="text-sm font-bold outline-none" />
                <button onClick={() => removeItem(item)}><Trash2 size={14} className="text-red-400" /></button>
              </div>
              <div className="flex gap-2">
                <AmountInput value={item.amount} onChange={v => updateItemField(item.localId, 'amount', v)} className="flex-1 text-right font-bold" />
                <button onClick={() => updateItemField(item.localId, 'paymentMethod', item.paymentMethod === 'card' ? 'cash' : 'card')} className="text-xs border px-2 py-1 rounded">
                  {item.paymentMethod === 'card' ? '카드' : '현금'}
                </button>
              </div>
              <MemoEditor value={item.memo} onChange={v => updateItemField(item.localId, 'memo', v)} onCamera={() => handleCameraCapture(item.localId)} isAnalyzing={analyzingLocalId === item.localId} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
