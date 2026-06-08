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
  staffType: 'staff' | 'parttime' | 'manager' | 'deputy'; // 직원/아르바이트/점장/매니저
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

  // 날짜 변경 시 정산 캐시 무효화 (새로고침 없이 반영)
  useEffect(() => {
    utils.storeSales.getRecord.invalidate();
    utils.storeSales.getRecords.invalidate();
    utils.settlement.getSettlementsByDateRange.invalidate();
  }, [currentDate]);

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
  // ※ highlightPatterns state 선언 이후에 정의하여 TDZ/no-use-before-define 회피.
  //
  // [오학습 방지 - 단어 경계 검사]
  //   - 단순 includes(kw)는 "추가" 키워드가 "병추가" 안에 포함된 경우에도 매칭되어
  //     잘못된 제외 학습이 발생할 수 있다.
  //   - 본 구현은 다음 규칙으로 부분문자열 오학습을 줄인다.
  //       1) 정규식 escape 후 단어 발생 위치를 직접 스캔
  //       2) kw 길이가 매우 짧을 때(<= 1자)는 학습 대상에서 제외
  //       3) kw 양쪽 인접 문자가 "한글/영문/숫자/괄호열기" 이면 다른 단어의 일부로 보고 무시
  //          (예: "추가"의 앞에 "병"이 있으면 → "병추가"이므로 학습 안 함)
  //       4) mark 태그 안의 텍스트(marked) 내에 kw 가 포함되어 있으면 사용자가 형광펜을 유지한 것
  const learnHighlightExcludesFromMemo = (memoHtml: string) => {
    if (!memoHtml) return;
    const patterns = highlightPatterns;
    if (!patterns) return;
    const { yellow: markedYellow, pink: markedPink } = extractMarkedTexts(memoHtml);
    const cleanText = memoHtml.replace(/<[^>]+>/g, '');
    const next = loadHighlightExcludes();

    // 단어 일부로 붙어있으면 안 되는 인접 문자 패턴
    //   한글(가-힣), 영문(a-zA-Z), 숫자(0-9), 괄호 열기 — kw 앞뒤에 이런 문자가 붙어있으면 단어의 일부로 본다.
    const ADJACENT_BAD = /[\uAC00-\uD7A3A-Za-z0-9(]/;
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 단어 경계 기반 평문 발생 검사
    const hasPlainOccurrence = (kw: string): boolean => {
      if (!kw || kw.length <= 1) return false; // 너무 짧은 단어는 stricter — 학습 대상 제외
      const re = new RegExp(escapeRegExp(kw), 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(cleanText)) !== null) {
        const before = m.index > 0 ? cleanText[m.index - 1] : '';
        const after = m.index + kw.length < cleanText.length ? cleanText[m.index + kw.length] : '';
        const beforeBad = before && ADJACENT_BAD.test(before);
        const afterBad = after && ADJACENT_BAD.test(after);
        if (!beforeBad && !afterBad) return true; // 양쪽 모두 단어 경계로 둘러싸여 있음
      }
      return false;
    };

    const containsAsPlain = (kw: string, marked: string[]): boolean => {
      if (!hasPlainOccurrence(kw)) return false;
      // mark 태그 안에 그 단어가 포함되어 있으면 사용자가 형광펜을 유지한 것
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

  // 서버에서 패턴 조회 (account 로드 후 실행, 캐시가 1시간 이내면 재조회 생략)
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

  // 사진 분석 중인 항목 localId 추적
  const [analyzingLocalId, setAnalyzingLocalId] = useState<string | null>(null);
  // 카메라 입력 ref (localId별)
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const pendingAnalyzeLocalIdRef = useRef<string | null>(null);

  // 합치기 모달 상태
  const [mergeTargetLocalId, setMergeTargetLocalId] = useState<string | null>(null); // 합칠 기준 항목
  const [mergeSourceLocalId, setMergeSourceLocalId] = useState<string | null>(null); // 합쳐질 항목
  const mergeItemsMutation = trpc.tableReport.mergeItems.useMutation();

  // 합치기 실행 - targetLocalId와 sourceLocalId를 직접 인자로 받아 stale closure 방지
  const handleMerge = async (targetLocalId: string, sourceLocalId: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const target = items.find(it => it.localId === targetLocalId);
    const source = items.find(it => it.localId === sourceLocalId);
    if (!target || !source || targetLocalId === sourceLocalId) {
      toast.error('합칠 항목을 다시 선택해주세요.');
      setMergeTargetLocalId(null);
      setMergeSourceLocalId(null);
      return;
    }

    const mergeMemo = (a?: string | null, b?: string | null) => {
      const left = (a ?? '').trim();
      const right = (b ?? '').trim();
      if (left && right) return `${left}<br>${right}`;
      return left || right || '';
    };
    const mergedAmountLocal = String((Number(target.amount || 0) || 0) + (Number(source.amount || 0) || 0));
    const mergedMemoLocal = mergeMemo(target.memo, source.memo);

    const applyLocalMerge = (amount: string, memo: string) => {
      setItems(prev => {
        const next = prev
          .map(it => it.localId === targetLocalId
            ? { ...it, amount, memo }
            : it
          )
          .filter(it => it.localId !== sourceLocalId);
        return next.length === 0 ? [emptyItem()] : next;
      });
      setMergeTargetLocalId(null);
      setMergeSourceLocalId(null);
      setSaved(false);
      loadedDateRef.current = currentDate;
    };

    // 아직 저장 전인 신규 항목도 화면에서 먼저 정확히 합쳐지게 처리
    if (!target.id || !source.id || !reportId) {
      applyLocalMerge(mergedAmountLocal, mergedMemoLocal);
      toast.success('합치기 완료! 저장하기를 누르면 서버에 반영됩니다.');
      return;
    }

    try {
      const result = await mergeItemsMutation.mutateAsync({
        targetItemId: target.id,
        sourceItemId: source.id,
        tableReportId: reportId,
        date: currentDate,
        branchId: effectiveBranchId,
      });
      applyLocalMerge(result.mergedAmount, result.mergedMemo ?? '');
      toast.success('합치기 완료! 금액과 메모가 합산되었습니다.');
      // invalidate는 딜레이 후 실행 (즉시 실행 시 로컬 상태 덮어쓰기 방지)
      setTimeout(async () => {
        await utils.tableReport.getByDate.invalidate({ date: currentDate, branchId: effectiveBranchId });
        await utils.storeSales.getRecord.invalidate();
        await utils.storeSales.getRecords.invalidate();
        await utils.storeSales.getPrevRecord.invalidate();
      }, 1000);
    } catch (e: any) {
      toast.error('합치기 실패: ' + (e?.message ?? '알 수 없는 오류'));
      setMergeTargetLocalId(null);
      setMergeSourceLocalId(null);
    }
  };

  // 저장 함수 - batchSave 단일 호출로 모든 항목 한 번에 저장
  const handleSave = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isSaving) return; // 중복 저장 방지
    setIsSaving(true);
    // 저장 중에는 loadedDateRef를 건드리지 않음 → useEffect가 중간에 상태를 덮어쓰지 않도록 방지

    // [수정] 형광펜 학습:
    //   저장 시점의 모든 메모를 보고 사용자가 mark를 지운 단어를 학습한다.
    //   같은 단어를 평문으로 두면 횟수가 누적되어 EXCLUDE_THRESHOLD 이상이 되면
    //   이후 분석에서 자동 제외된다. 학습 실패는 저장 자체에 영향을 주지 않는다.
    try {
      for (const it of items) {
        if (it.memo) learnHighlightExcludesFromMemo(it.memo);
      }
    } catch (e) {
      console.warn('[highlight-excludes] 학습 실패:', e);
    }

    try {
      const { id: rId, cashSum, cardSum, itemIdMap, incentiveIdMap, debugError } = await batchSave.mutateAsync({
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
        incentives: incentives.map((inc, i) => {
          // 자동 계산: glassCount * 5000 + bottleCount * 10000 + beerBottleCount * 3000
          const autoCalculatedIncentive = (inc.glassCount || 0) * 5000 + (inc.bottleCount || 0) * 10000 + (inc.beerBottleCount || 0) * 3000;
          // 영업인센은 직접 입력값 사용. 빈 문자열이면 0, undefined/null이면 자동계산
          const finalSalesIncentive = (inc.salesIncentive === '' || inc.salesIncentive === '0' || Number(inc.salesIncentive) === 0)
            ? 0
            : (inc.salesIncentive !== undefined && inc.salesIncentive !== null && inc.salesIncentive !== '')
              ? Number(inc.salesIncentive)
              : autoCalculatedIncentive;
          return {
            id: inc.id,
            localId: inc.localId,
            staffName: inc.staffName,
            staffType: inc.staffType,
            glassCount: inc.glassCount,
            bottleCount: inc.bottleCount,
            beerBottleCount: inc.beerBottleCount,
            salesIncentive: String(finalSalesIncentive),
            workStart: inc.workStart || undefined,
            workEnd: inc.workEnd || undefined,
            sortOrder: i,
          };
        }),
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

      if (debugError) toast.error(`정산 재계산 오류: ${debugError}`);
      // 정산 페이지 캐시 무효화
      await utils.storeSales.getRecord.invalidate();
      await utils.storeSales.getRecords.invalidate();
      await utils.settlement.getSettlementsByDateRange.invalidate();
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

  // 테이블 항목 업데이트 - 모든 필드 변경 시 자동저장 트리거 (메모 포함)
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
    // 삭제 후 즉시 저장 (날짜 이동 시 복구 방지)
    setTimeout(() => handleSave(), 100);
  };

  // 사진 찍어서 메모 자동 입력
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
      // [수정] 사용자 학습형 형광펜 제외 단어를 사전 필터링하여 서버에 전송
      //   - 사용자가 자동 형광펜을 지운 단어(localStorage 학습값)를
      //     preloadedYellow/preloadedPink 에서 미리 제거한다.
      //   - 서버 측에서도 한 번 더 제거하도록 excludedYellow/excludedPink 도 함께 보낸다.
      const learnedExcludes = loadHighlightExcludes();
      const filteredYellow = filterByExcludes(highlightPatterns?.yellowKeywords, 'yellow', learnedExcludes);
      const filteredPink = filterByExcludes(highlightPatterns?.pinkKeywords, 'pink', learnedExcludes);
      const excludedYellowWords = Object.entries(learnedExcludes.yellow)
        .filter(([, c]) => c >= EXCLUDE_THRESHOLD)
        .map(([w]) => w);
      const excludedPinkWords = Object.entries(learnedExcludes.pink)
        .filter(([, c]) => c >= EXCLUDE_THRESHOLD)
        .map(([w]) => w);

      const { memo, amount } = await analyzeOrderMemo.mutateAsync({
        imageBase64: base64,
        mimeType: file.type || 'image/jpeg',
        branchId: effectiveBranchId,
        date: currentDate,
        // 캐시된 패턴 전달 (DB 재조회 생략으로 속도 개선) - 사용자 제외 단어 필터링 적용
        preloadedYellow: filteredYellow,
        preloadedPink: filteredPink,
        preloadedExamples: highlightPatterns?.recentMemoExamples,
        // [추가] 사용자 학습형 제외 단어 (서버 측 LLM 프롬프트에 절대 금지 단어로 전달)
        excludedYellow: excludedYellowWords,
        excludedPink: excludedPinkWords,
      });
      if (memo) {
        updateItemField(localId, 'memo', memo);
        if (amount) {
          updateItemField(localId, 'amount', amount);
          toast.success('주문 메모와 금액이 자동 입력되었습니다 형광펜도 적용되었습니다', { duration: 2500 });
        } else {
          toast.success('주문 메모가 자동 입력되었습니다', { duration: 2000 });
        }
      } else {
        toast.error('주문 내역을 파악하지 못했습니다. 다시 시도해주세요.');
      }
    } catch (err: any) {
      const errorMsg = err?.message ?? '알 수 없는 오류';
      // 서비스 불가 오류는 재시도 권유
      if (errorMsg.includes('503') || errorMsg.includes('Service Unavailable')) {
        toast.error('서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.');
      } else if (errorMsg.includes('upload') || errorMsg.includes('Storage')) {
        toast.error('사진 업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else if (errorMsg.includes('파악하지 못했습니다')) {
        toast.error('주문 내역을 파악하지 못했습니다. 다시 시도해주세요.');
      } else {
        toast.error('분석 실패: ' + errorMsg);
      }
    } finally {
      setAnalyzingLocalId(null);
    }
  }, [analyzeOrderMemo, updateItemField]);

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
  const totalAll = cashTotal + cardTotal;

  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>
      {/* 카메라/파일 입력 (hidden) - 주문메모 AI 분석용 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFileChange}
      />
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
          <div className="grid grid-cols-3 divide-x" style={{ borderTop: `1px solid ${BORDER}`, background: HEADER_BG } as any}>
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
            <div className="px-3 py-2 text-center" style={{ borderLeft: `1px solid ${BORDER}` }}>
              <div className="text-xs mb-0.5" style={{ color: MUTED }}>전체 합계</div>
              <div className="text-sm font-bold" style={{ color: totalAll > 0 ? 'oklch(0.35 0.18 25)' : MUTED }}>
                {totalAll > 0 ? `₩${totalAll.toLocaleString('ko-KR')}` : '—'}
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
                  {/* 합치기 버튼: 이 항목을 합치기 대상으로 선택 */}
                  <button
                    onClick={() => {
                      if (mergeTargetLocalId === item.localId) {
                        // 이미 대상으로 선택된 경우 취소
                        setMergeTargetLocalId(null);
                        setMergeSourceLocalId(null);
                      } else if (mergeTargetLocalId && mergeTargetLocalId !== item.localId) {
                        // 대상이 이미 선택된 상태에서 다른 항목 누르면 확인 후 합치기 실행
                        const tLocalId = mergeTargetLocalId;
                        const sLocalId = item.localId;
                        const tItem = items.find(it => it.localId === tLocalId);
                        const sItem = items.find(it => it.localId === sLocalId);
                        if (!tItem || !sItem) return;
                        const tLabel = tItem.tableNumber || `#${items.indexOf(tItem) + 1}`;
                        const sLabel = sItem.tableNumber || `#${items.indexOf(sItem) + 1}`;
                        const tAmt = Number(tItem.amount || 0).toLocaleString('ko-KR');
                        const sAmt = Number(sItem.amount || 0).toLocaleString('ko-KR');
                        const mAmt = (Number(tItem.amount || 0) + Number(sItem.amount || 0)).toLocaleString('ko-KR');
                        const ok = window.confirm(
                          `[${tLabel}] + [${sLabel}] 합치기\n\n` +
                          `• [${tLabel}] 금액: \u20a9${tAmt}\n` +
                          `• [${sLabel}] 금액: \u20a9${sAmt}\n` +
                          `→ 합산 금액: \u20a9${mAmt}\n\n` +
                          `메모도 합쳐집니다. [${sLabel}] 항목은 삭제됩니다.\n\n계속하시겠습니까?`
                        );
                        if (ok) {
                          handleMerge(tLocalId, sLocalId);
                        } else {
                          setMergeTargetLocalId(null);
                          setMergeSourceLocalId(null);
                        }
                      } else {
                        // 첫 번째 선택
                        setMergeTargetLocalId(item.localId);
                        setMergeSourceLocalId(null);
                        toast('합치기: 이 항목에 합쳐넣을 다른 항목의 합치기 버튼을 누르세요', { duration: 2500 });
                      }
                    }}
                    className="p-1 flex-shrink-0 transition-colors"
                    style={{
                      color: mergeTargetLocalId === item.localId ? PRIMARY : MUTED,
                      opacity: mergeTargetLocalId === item.localId ? 1 : 0.5,
                    }}
                    title="합치기"
                  >
                    <Merge size={13} />
                  </button>
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
                    {(['card', 'cash'] as const).map(pm => (
                      <button
                        key={pm}
                        onClick={() => updateItemField(item.localId, 'paymentMethod', pm)}
                        className="px-2 py-0.5 text-xs font-medium transition-colors"
                        style={{
                          background: item.paymentMethod === pm ? PRIMARY : 'transparent',
                          color: item.paymentMethod === pm ? 'white' : MUTED,
                        }}
                      >
                        {pm === 'card' ? '카드' : '현금'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3행: 메모 (형광펜 기능 포함) + 카메라 버튼 */}
                <div className="px-3 py-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <MemoEditor
                        value={item.memo}
                        onChange={html => updateItemField(item.localId, 'memo', html)}
                        placeholder="주문 메모 (예: 무제한x2, 지인3간)"
                        textColor={TEXT}
                        borderColor={BORDER}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCameraCapture(item.localId)}
                      disabled={analyzingLocalId === item.localId}
                      title="포스기 사진으로 메모 자동 입력"
                      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors mt-5"
                      style={{
                        background: analyzingLocalId === item.localId ? 'oklch(0.88 0.015 85)' : HEADER_BG,
                        border: `1px solid ${BORDER}`,
                        color: analyzingLocalId === item.localId ? MUTED : PRIMARY,
                      }}
                    >
                      {analyzingLocalId === item.localId ? (
                        <svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      ) : (
                        <Camera size={14} />
                      )}
                    </button>
                  </div>
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
                {/* 1행: 이름 + 아르바이트/직원 토글 + 삭제 */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}`, background: HEADER_BG }}>
                  <input
                    type="text"
                    value={inc.staffName}
                    onChange={e => updateIncentiveField(inc.localId, 'staffName', e.target.value)}
                    placeholder="직원 이름"
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-semibold"
                    style={{ color: TEXT }}
                    lang="ko"
                    inputMode="text"
                  />
                  <button
                    onClick={() => {
                      const next = inc.staffType === 'staff' ? 'parttime' : inc.staffType === 'parttime' ? 'manager' : inc.staffType === 'manager' ? 'deputy' : 'staff';
                      updateIncentiveField(inc.localId, 'staffType', next);
                    }}
                    className="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap"
                    style={{
                      background: inc.staffType === 'staff' ? PRIMARY : inc.staffType === 'parttime' ? 'oklch(0.65 0.12 200)' : inc.staffType === 'manager' ? 'oklch(0.60 0.15 30)' : 'oklch(0.55 0.18 270)',
                      color: 'white',
                    }}
                  >
                    {inc.staffType === 'staff' ? '직원' : inc.staffType === 'parttime' ? '아르바' : inc.staffType === 'manager' ? '점장' : '매니저'}
                  </button>
                  <button onClick={() => removeIncentive(inc)} className="p-1 opacity-40 hover:opacity-70 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* 2행: 잔추가 / 병추가 / 맥주병 - 점장은 미표시 */}
                {((inc.staffType !== 'manager' && inc.staffType !== 'deputy') && inc.staffType !== 'deputy') && <div className="grid grid-cols-3 divide-x" style={{ borderBottom: `1px solid ${BORDER}` }}>
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
                </div>}

                {/* 3행: 영업인센 금액 - 점장은 미표시 */}
                {(inc.staffType !== 'manager' && inc.staffType !== 'deputy') && (() => {
                  // 자동 계산: glassCount * 5000 + bottleCount * 10000 + beerBottleCount * 3000
                  const autoCalcIncentive = (inc.glassCount || 0) * 5000 + (inc.bottleCount || 0) * 10000 + (inc.beerBottleCount || 0) * 3000;
                  // 영업인센: 직접 입력값 우선. 0이면 빈칸, 없으면 자동계산 표시
                  const hasIncentiveValue = inc.salesIncentive !== undefined && inc.salesIncentive !== null && inc.salesIncentive !== '';
                  const displayValue = hasIncentiveValue
                    ? (Number(inc.salesIncentive) === 0 ? '' : String(inc.salesIncentive))
                    : (autoCalcIncentive > 0 ? String(autoCalcIncentive) : '');
                  return (
                    <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <span className="text-xs flex-shrink-0" style={{ color: MUTED }}>영업인센</span>
                      <span className="text-xs flex-shrink-0" style={{ color: MUTED }}>₩</span>
                      <AmountInput
                        value={displayValue}
                        onChange={v => updateIncentiveField(inc.localId, 'salesIncentive', v)}
                        placeholder="금액 입력"
                        className="flex-1 text-sm font-semibold"
                      />
                    </div>
                  );
                })()}

                {/* 4행: 근무 시간 - 점장은 미표시 */}
                {(inc.staffType !== 'manager' && inc.staffType !== 'deputy') && (
                <div className="px-3 py-2 space-y-1.5">
                  {/* 시작 시간 - 출근은 오후(PM) 고정 */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs w-8 flex-shrink-0" style={{ color: MUTED }}>출근</span>
                    <div className="flex rounded overflow-hidden border text-xs" style={{ borderColor: BORDER }}>
                      <span
                        className="px-2 py-0.5 font-medium"
                        style={{ background: PRIMARY, color: 'white' }}
                      >
                        오후
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      lang="ko"
                      value={inc.workStartHour}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        updateIncentiveField(inc.localId, 'workStartHour', v);
                        const hhmm = toHHMM('PM', v, inc.workStartMin);
                        if (hhmm) updateIncentiveField(inc.localId, 'workStart', hhmm);
                        if (inc.workStartAmPm !== 'PM') updateIncentiveField(inc.localId, 'workStartAmPm', 'PM');
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
                        const hhmm = toHHMM('PM', inc.workStartHour, v);
                        if (hhmm) updateIncentiveField(inc.localId, 'workStart', hhmm);
                        if (inc.workStartAmPm !== 'PM') updateIncentiveField(inc.localId, 'workStartAmPm', 'PM');
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
                      const STANDARD_MINUTES = 420; // 7시간 기준
                      const diffFromStandard = diff - STANDARD_MINUTES; // 양수=초과, 음수=부족
                      const absDiffHours = Math.floor(Math.abs(diffFromStandard) / 60);
                      const absDiffMins = Math.abs(diffFromStandard) % 60;
                      const diffLabel = diffFromStandard === 0
                        ? '✓'
                        : diffFromStandard > 0
                          ? `+${absDiffHours > 0 ? `${absDiffHours}시간` : ''}${absDiffMins > 0 ? `${absDiffMins}분` : ''}`
                          : `-${absDiffHours > 0 ? `${absDiffHours}시간` : ''}${absDiffMins > 0 ? `${absDiffMins}분` : ''}`;
                      const diffColor = diffFromStandard === 0
                        ? 'oklch(0.45 0.15 150)'
                        : diffFromStandard > 0
                          ? 'oklch(0.45 0.15 150)'
                          : 'oklch(0.55 0.2 25)';
                      return (
                        <>
                          {inc.staffType === 'parttime' && (
                            <span className="text-xs font-semibold flex-shrink-0 px-1.5 py-0.5 rounded ml-1" style={{ background: PRIMARY, color: 'white' }}>
                              {hours > 0 ? `${hours}시간` : ''}{mins > 0 ? `${mins}분` : hours === 0 ? '0분' : ''}
                            </span>
                          )}
                          {inc.staffType === 'staff' && (
                            <span className="text-xs font-semibold flex-shrink-0 px-1.5 py-0.5 rounded ml-1" style={{ background: diffColor, color: 'white' }}>
                              {diffLabel}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 아르바이트 근무시간 + 추가판매 요약 ── */}
        {(() => {
          // 아르바이트 총 근무시간 계산
          const parttimeMinutes = incentives
            .filter(inc => inc.staffType === 'parttime' && inc.workStart && inc.workEnd)
            .reduce((sum, inc) => {
              const [sh, sm] = inc.workStart.split(':').map(Number);
              const [eh, em] = inc.workEnd.split(':').map(Number);
              let startMin = sh * 60 + sm;
              let endMin = eh * 60 + em;
              if (endMin <= startMin) endMin += 24 * 60;
              return sum + (endMin - startMin);
            }, 0);
          const ptHours = Math.floor(parttimeMinutes / 60);
          const ptMins = parttimeMinutes % 60;

          // 전체(직원+아르바이트) 추가판매 합산
          const totalGlass = incentives.reduce((s, inc) => s + (inc.glassCount || 0), 0);
          const totalBottle = incentives.reduce((s, inc) => s + (inc.bottleCount || 0), 0);
          const totalBeer = incentives.reduce((s, inc) => s + (inc.beerBottleCount || 0), 0);

          // 단가 상수
          const GLASS_PRICE = 5000;
          const BOTTLE_PRICE = 10000;
          const BEER_PRICE = 3000;

          // 추가판매 금액 합계
          const totalAddSalesAmount = totalGlass * GLASS_PRICE + totalBottle * BOTTLE_PRICE + totalBeer * BEER_PRICE;

          // 영업인센 합계
          const totalSalesIncentive = incentives.reduce((s, inc) => s + (Number(inc.salesIncentive) || 0), 0);

          const hasParttime = incentives.some(inc => inc.staffType === 'parttime' && inc.workStart && inc.workEnd);
          const hasAdds = totalGlass > 0 || totalBottle > 0 || totalBeer > 0;
          const hasSalesIncentive = totalSalesIncentive > 0;
          
          // 관리자 여부 확인
          const isAdmin = account?.role === 'admin';
          // v1 관리자만 추가판매/영업인센 합계 표시
          const canViewSummary = isAdmin;

          if (!hasParttime && !hasAdds && !hasSalesIncentive) return null;

          return (
            <div className="rounded-lg p-3" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              {/* 아르바이트 총 근무시간 - 모든 사용자에게 표시 */}
              {hasParttime && (
                <div className="mb-2">
                  <div className="text-xs font-semibold mb-1.5" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT, opacity: 0.7 }}>아르바이트 총 근무시간</div>
                  <div className="flex flex-wrap gap-2">
                    {incentives
                      .filter(inc => inc.staffType === 'parttime' && inc.workStart && inc.workEnd)
                      .map(inc => {
                        const [sh, sm] = inc.workStart.split(':').map(Number);
                        const [eh, em] = inc.workEnd.split(':').map(Number);
                        let startMin = sh * 60 + sm;
                        let endMin = eh * 60 + em;
                        if (endMin <= startMin) endMin += 24 * 60;
                        const diff = endMin - startMin;
                        const h = Math.floor(diff / 60);
                        const m = diff % 60;
                        return (
                          <span key={inc.localId} className="text-xs px-2 py-1 rounded" style={{ background: 'oklch(0.88 0.02 85)', color: TEXT }}>
                            {inc.staffName || '이름없음'} {h > 0 ? `${h}시간` : ''}{m > 0 ? `${m}분` : h === 0 ? '0분' : ''}
                          </span>
                        );
                      })}
                    <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: PRIMARY, color: 'white' }}>
                      합계 {ptHours > 0 ? `${ptHours}시간` : ''}{ptMins > 0 ? `${ptMins}분` : ptHours === 0 ? '0분' : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* 추가판매 총계 - 관리자/지점 매니저만 표시 */}
              {hasAdds && canViewSummary && (
                <div className={hasParttime ? 'pt-2 border-t' : ''} style={hasParttime ? { borderColor: BORDER } : {}}>
                  <div className="text-xs font-semibold mb-1.5" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT, opacity: 0.7 }}>추가판매 총계 (전체)</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1.5">
                    {totalGlass > 0 && (
                      <span className="text-sm font-semibold" style={{ color: TEXT }}>
                        잔추가 <span style={{ color: PRIMARY }}>{totalGlass}잔</span>
                        <span className="text-xs ml-1" style={{ color: MUTED }}>×{GLASS_PRICE.toLocaleString()} = <span style={{ color: PRIMARY }}>{(totalGlass * GLASS_PRICE).toLocaleString()}원</span></span>
                      </span>
                    )}
                    {totalBottle > 0 && (
                      <span className="text-sm font-semibold" style={{ color: TEXT }}>
                        병추가 <span style={{ color: PRIMARY }}>{totalBottle}병</span>
                        <span className="text-xs ml-1" style={{ color: MUTED }}>×{BOTTLE_PRICE.toLocaleString()} = <span style={{ color: PRIMARY }}>{(totalBottle * BOTTLE_PRICE).toLocaleString()}원</span></span>
                      </span>
                    )}
                    {totalBeer > 0 && (
                      <span className="text-sm font-semibold" style={{ color: TEXT }}>
                        맥주병추가 <span style={{ color: PRIMARY }}>{totalBeer}병</span>
                        <span className="text-xs ml-1" style={{ color: MUTED }}>×{BEER_PRICE.toLocaleString()} = <span style={{ color: PRIMARY }}>{(totalBeer * BEER_PRICE).toLocaleString()}원</span></span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t" style={{ borderColor: BORDER }}>
                    <span className="text-xs font-semibold" style={{ color: TEXT, opacity: 0.7 }}>추가판매 합계</span>
                    <span className="text-sm font-bold" style={{ color: PRIMARY }}>{totalAddSalesAmount.toLocaleString()}원</span>
                  </div>
                </div>
              )}

              {/* 영업인센 합계 - 관리자/지점 매니저만 표시 */}
              {hasSalesIncentive && canViewSummary && (
                <div className={hasParttime || hasAdds ? 'pt-2 border-t mt-2' : ''} style={hasParttime || hasAdds ? { borderColor: BORDER } : {}}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT, opacity: 0.7 }}>영업인센 합계</span>
                    <span className="text-sm font-bold" style={{ color: PRIMARY }}>{totalSalesIncentive.toLocaleString()}원</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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
