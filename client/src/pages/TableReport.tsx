/**
 * íì´ë¸ ìì ê¸°ë¡ íì´ì§
 * - ë ì§ë³ íì´ë¸ ëª©ë¡ (ë²í¸, ìëêµ¬ë¶, ê¸ì¡, ê²°ì ìë¨, ë©ëª¨)
 * - ì¶ê·¼ì ì¸ì¼í°ë¸ (ìì¶ê°, ë³ì¶ê°, ë§¥ì£¼ë³ì¶ê°, ììì¸ì¼, ê·¼ë¬´ìê°)
 * - íì, ê¸°í ì¬í­
 * - ì ì¥ ì íê¸/ì¹´ë í©ì°ê°ì´ ë§¤ì¶ê¸°ë¡ì ìë ë°ìë¨
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, CheckCircle2, Users, Wine, Camera, Merge } from 'lucide-react';
import { MemoEditor } from '@/components/MemoEditor';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { MANAGER_LIQUOR_EDIT_IDS } from '@/lib/accountAccess';

// Google Sheets ì ì¡ì ìí GAS URL
const GAS_URL = "https://script.google.com/macros/s/AKfycbxZ8v9UvsEKUGRuipvDPwFvdVh3SccEg7NQAjHRGGAUCry8-UEhkD7l62LyrlN7Yq_Vdg/exec";

// ë ì§ í¬ë§·
function getTodayString() {
  const d = new Date();
  // ì¼ìì¼(0)ì´ë©´ ì ë (í ìì¼)ë¡
  if (d.getDay() === 0) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  const days = ['ì¼', 'ì', 'í', 'ì', 'ëª©', 'ê¸', 'í '];
  const dow = new Date(Number(y), Number(m) - 1, Number(d)).getDay();
  return `${Number(m)}ì ${Number(d)}ì¼ (${days[dow]})`;
}

function moveDateBy(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  // ì´ëí ë ì§ê° ì¼ìì¼ì´ë©´ ê°ì ë°©í¥ì¼ë¡ í ì¹¸ ë ì´ë
  if (d.getDay() === 0) d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ê¸ì¡ ìë ¥ ì»´í¬ëí¸
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

// íì´ë¸ ì¹´ë íì
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

// ì§ì ì¸ì¼í°ë¸ íì
type IncentiveLocal = {
  id?: number;
  localId: string;
  staffName: string;
  staffType: 'staff' | 'parttime'; // ì§ì/ìë¥´ë°ì´í¸
  glassCount: number;
  bottleCount: number;
  beerBottleCount: number;
  salesIncentive: string;
  workStart: string;       // HH:mm 24ìê° íìì¼ë¡ ì ì¥
  workEnd: string;         // HH:mm 24ìê° íìì¼ë¡ ì ì¥
  workStartAmPm: 'AM' | 'PM';
  workEndAmPm: 'AM' | 'PM';
  workStartHour: string;   // íìì© ìê° (1~12)
  workEndHour: string;     // íìì© ìê° (1~12)
  workStartMin: string;    // íìì© ë¶ (00~59)
  workEndMin: string;      // íìì© ë¶ (00~59)
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

// HH:mm â ì¤ì /ì¤í, ìê°(1~12), ë¶ ì­ë³í
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

// ì¤ì /ì¤í + ìê°/ë¶ â HH:mm 24ìê° ë³í
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
  // ë ì§ë¥¼ localStorageì ì ì¥/ë³µì (ìë¡ê³ ì¹¨ íìë ì ì§)
  const [currentDate, setCurrentDateState] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedDate');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        // ì¼ìì¼ì´ë©´ í ìì¼ë¡ ë³´ì 
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
        // ë ì§ê° ë¬ë¼ì§ë©´ loadedDateRef ì´ê¸°í â ì ë ì§ ë°ì´í° ë¡ë íì©
        loadedDateRef.current = null;
        setSaved(false);
        // ìëì ì¥ íì´ë¨¸ ì·¨ì: ë ì§ ì´ë ì ì´ì  ë ì§ ë°ì´í°ê° ì ë ì§ë¡ ì ì¥ëë ê² ë°©ì§
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
  // ì´ë¯¸ ë¡ëí ë ì§ ì¶ì  (items ë®ì´ì°ê¸° ë°©ì§)
  const loadedDateRef = useRef<string | null>(null);

  // URL íë¼ë¯¸í°ìì branchId ì½ê¸° (ê´ë¦¬ìê° ì§ì  ì í í ì´ë ì ì¬ì©)
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

  // ë ì§ë³ ê¸°ë¡ ì¡°í - staleTimeì ê¸¸ê² ì¤ì í´ ìë ë¦¬íì¹ ë°©ì§
  const { data: reportData, dataUpdatedAt } = trpc.tableReport.getByDate.useQuery(
    { date: currentDate, branchId: effectiveBranchId },
    { enabled: !!account && !!effectiveBranchId, staleTime: Infinity, refetchOnWindowFocus: false }
  );

  // ìë² ë°ì´í° â ë¡ì»¬ ìí ëê¸°í
  // reportDataê° í´ë¹ ë ì§(currentDate)ì ë°ì´í°ì¼ ëë§ ë®ì´ì
  useEffect(() => {
    // reportDataê° ìì§ undefinedë©´ ë¡ë© ì¤ â ê±´ëë
    if (reportData === undefined) return;
    // ì´ë¯¸ ì´ ë ì§ ë°ì´í°ë¥¼ ë¡ëíì¼ë©´ ë¤ì ë®ì´ì°ì§ ìì
    if (loadedDateRef.current === currentDate) return;
    // íì¬ ë ì§ ê¸°ë¡ ìë£
    loadedDateRef.current = currentDate;
    // ìëì ì¥ íì´ë¨¸ê° ìì¼ë©´ ì·¨ì (ë ì§ ì´ë ì ì´ì  ë ì§ ë°ì´í°ë¡ ì ì¥ëë ê² ë°©ì§)
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
    // ë ì§ê° ì¤ì ë¡ ë³ê²½ëìì ëë§ saved ë¦¬ì (ì ì¥ ìë£ í ë°ì´í° ë¡ë ììë saved ì ì§)
    // setSaved(false)ë¥¼ ì¬ê¸°ì í¸ì¶íë©´ ì ì¥ ìë£ í ìë² ë°ì´í°ê° ë¤ì ë¤ì´ì¬ ë saved íìê° ì¬ë¼ì§
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData, currentDate, dataUpdatedAt]); // currentDateë loadedDateRefë¡ ì²´í¬íì§ë§ ìì¡´ì±ìë í¬í¨íì¬ ë ì§ ë³ê²½ ì ì¤í ë³´ì¥

  // íê´í í¨í´ ìë íìµ - ì± ë¡ë ì ì´ì  ë©ëª¨ìì í¨í´ ì¶ì¶ í localStorage ìºì
  const highlightCacheKey = `highlight_patterns_${effectiveBranchId ?? 'unknown'}`;

  // [ìì ] ì¬ì©ì íìµí íê´í ì ì¸ ë¨ì´ ì ì¥ í¤
  //   - ì¬ì©ìê° ìë íê´íì ì§ì´ ë¨ì´ë¥¼ ëì  ì¹´ì´í¸íì¬,
  //     ì¼ì  íì(EXCLUDE_THRESHOLD ì´ì) ì ê±°ëë©´ ë¤ì ë¶ìë¶í° ìë ì ì¸íë íìµí ë¡ì§.
  const highlightExcludeKey = `excluded_highlight_patterns_${effectiveBranchId ?? 'unknown'}`;

  type HighlightExcludes = {
    yellow: Record<string, number>; // ë¨ì´ -> ì¬ì©ìê° markë¥¼ ì§ì´ íì
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

  // íìµ ìê³ê°: 1ì´ë©´ í ë² ì§ì°ë©´ ì¦ì ì ì¸, 2ì´ë©´ ë ë² ì´ì ì§ì ì ë ì ì¸
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

  // ë©ëª¨ HTMLìì ìê¹ë³ mark íì¤í¸ ì¶ì¶ (yellow / pink)
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

  // localStorageìì ìºìë í¨í´ ì´ê¸° ë¡ë
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

  // [íìµ í¨ì] ë¶ìë keyword ì¤, ë©ëª¨ HTMLì "ë¨ì´ ê²½ê³ê° ë³´ì¡´ë íë¬¸"ì¼ë¡ë ì¡´ì¬íë
  // mark íê·¸ë¡ë ì ì©ëì´ ìì§ ìì ë¨ì´ë¥¼ "ì¬ì©ìê° markë¥¼ ì§ì´ ë¨ì´"ë¡ ë³´ê³  ì¹´ì´í¸ +1.
  const learnHighlightExcludesFromMemo = (memoHtml: string) => {
    if (!memoHtml) return;
    const patterns = highlightPatterns;
    if (!patterns) return;
    const { yellow: markedYellow, pink: markedPink } = extractMarkedTexts(memoHtml);
    const cleanText = memoHtml.replace(/<[^>]+>/g, '');
    const next = loadHighlightExcludes();

    // ë¨ì´ ì¼ë¶ë¡ ë¶ì´ìì¼ë©´ ì ëë ì¸ì  ë¬¸ì í¨í´
    const ADJACENT_BAD = /[\uAC00-\uD7A3A-Za-z0-9(]/;
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // ë¨ì´ ê²½ê³ ê¸°ë° íë¬¸ ë°ì ê²ì¬
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

  // ìë²ìì í¨í´ ì¡°í
  const shouldFetchPatterns = !!account && !!effectiveBranchId && (
    !highlightPatterns || Date.now() - highlightPatterns.cachedAt > 60 * 60 * 1000
  );
  const { data: fetchedPatterns } = trpc.tableReport.getHighlightPatterns.useQuery(
    { branchId: effectiveBranchId },
    { enabled: shouldFetchPatterns, staleTime: Infinity, refetchOnWindowFocus: false }
  );

  // ìë²ìì í¨í´ ë°ì¼ë©´ localStorageì ìºì
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

  // 주류 당일 출고 총액 조회
  const { data: liquorHistoryData } = trpc.liquor.history.useQuery(
    {
      startDate: currentDate,
      endDate:   currentDate,
      branchId:  effectiveBranchId,
      type:      'OUT',
    },
    {
      enabled:              !!account && !!effectiveBranchId,
      staleTime:            Infinity,
      refetchOnWindowFocus: false,
    }
  );

  const dailyLiquorTotal = (liquorHistoryData?.movements ?? []).reduce(
    (sum: number, m: any) => sum + Number(m.totalCost ?? 0),
    0
  );

  // Google Sheets ì ì¡ í¨ì
  const syncToGoogleSheets = async (_rData: any) => {
    try {
      const branchName = account?.branch?.name || '알 수 없음';

      const cashSales = items
        .filter(it => it.paymentMethod === 'cash')
        .reduce((s, it) => s + Number(it.amount || 0), 0);
      const cardSales = items
        .filter(it => it.paymentMethod === 'card')
        .reduce((s, it) => s + Number(it.amount || 0), 0);
      const totalSales = cashSales + cardSales;

      const liquorPrice = dailyLiquorTotal;

      const staffDrink = incentives.reduce(
        (s, inc) => s + (inc.glassCount || 0) + (inc.bottleCount || 0) + (inc.beerBottleCount || 0),
        0
      );

      const incentiveTotal = incentives.reduce(
        (s, inc) => s + Number(inc.salesIncentive || 0),
        0
      );

      const staffList = incentives
        .filter(inc => inc.staffName?.trim())
        .map(inc => ({
          staffType: inc.staffType === 'parttime' ? 'parttime' : 'staff',
          count: 1,
          name: inc.staffName,
        }));

      const payload = {
        date:                currentDate,
        branchName:          branchName,
        totalSales:          totalSales,
        cashSales:           cashSales,
        cardSales:           cardSales,
        liquorPrice:         liquorPrice,
        staffDrink:          staffDrink,
        incentiveTotal:      incentiveTotal,
        staffList:           staffList,
        staffSalaryOverride: 0,
      };

      await fetch(GAS_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      console.log('[SalesDash] Google Sheets 동기화 완료', payload);
    } catch (err) {
      console.error('[SalesDash] Google Sheets 동기화 실패:', err);
    }
  };

  // ì ì¥ í¨ì
  const handleSave = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isSaving) return;
    setIsSaving(true);

    try {
      for (const it of items) {
        if (it.memo) learnHighlightExcludesFromMemo(it.memo);
      }
    } catch (e) {
      console.warn('[highlight-excludes] íìµ ì¤í¨:', e);
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

      // Google Sheets ëê¸°í ì¤í
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
      toast.success(`ì ì¥ ìë£ | êµ¬ê¸ ìí¸ ëê¸°í ì¤...`, { duration: 2500 });
    } catch (e: any) {
      toast.error('ì ì¥ ì¤í¨: ' + (e?.message ?? 'ì ì ìë ì¤ë¥'));
    } finally {
      setIsSaving(false);
    }
  }, [currentDate, teamCount, notes, items, incentives, isSaving, effectiveBranchId, account]);

  // ìë ì ì¥ í¸ë¦¬ê±°
  const scheduleAutoSave = useCallback(() => {
    setSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => handleSave(), 5000);
  }, [handleSave]);

  // íì´ë¸ í­ëª© ìë°ì´í¸
  const updateItemField = (localId: string, field: keyof TableItemLocal, value: string) => {
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, [field]: value } : it));
    scheduleAutoSave();
  };

  // íì´ë¸ í­ëª© ì­ì 
  const removeItem = async (item: TableItemLocal) => {
    if (item.id) {
      try { await deleteItem.mutateAsync({ id: item.id }); } catch {}
    }
    setItems(prev => {
      const next = prev.filter(it => it.localId !== item.localId);
      return next.length === 0 ? [emptyItem()] : next;
    });
  };

  // ì¸ì¼í°ë¸ ìë°ì´í¸
  const updateIncentiveField = (localId: string, field: keyof IncentiveLocal, value: string | number) => {
    setIncentives(prev => prev.map(inc => inc.localId === localId ? { ...inc, [field]: value } : inc));
    scheduleAutoSave();
  };

  // ì¸ì¼í°ë¸ ì­ì 
  const removeIncentive = async (inc: IncentiveLocal) => {
    if (inc.id) {
      try { await deleteIncentive.mutateAsync({ id: inc.id }); } catch {}
    }
    setIncentives(prev => {
      const next = prev.filter(i => i.localId !== inc.localId);
      return next.length === 0 ? [emptyIncentive()] : next;
    });
  };

  // ì¬ì§ ì°ì´ì ë©ëª¨ ìë ìë ¥
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
        toast.success('ë¶ì ìë£');
      }
    } catch (err: any) {
      toast.error('ë¶ì ì¤í¨');
    } finally {
      setAnalyzingLocalId(null);
    }
  }, [analyzeOrderMemo, updateItemField, effectiveBranchId, currentDate, highlightPatterns]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">ë¡ë© ì¤...</div>;
  if (!account) return <div className="min-h-screen flex items-center justify-center">ë¡ê·¸ì¸ì´ íìí©ëë¤</div>;

  const cashTotal = items.filter(it => it.paymentMethod === 'cash').reduce((s, it) => s + Number(it.amount || 0), 0);
  const cardTotal = items.filter(it => it.paymentMethod === 'card').reduce((s, it) => s + Number(it.amount || 0), 0);
  const totalAll = cashTotal + cardTotal;

  return (
    <div className="min-h-screen pb-28" style={{ background: 'oklch(0.985 0.008 85)' }}>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageFileChange} />
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-2.5 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">íì´ë¸ ê¸°ë¡</div>
          <div className="text-xs text-gray-500">{account.branch?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={13} />ì ì¥ë¨</span>}
          <button onClick={handleSave} disabled={isSaving} className="bg-black text-white px-3 py-1.5 rounded text-xs">
            {isSaving ? 'ì ì¥ ì¤...' : 'ì ì¥'}
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* ìì½ */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold">íì</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setTeamCount(c => Math.max(0, c - 1))} className="w-8 h-8 rounded-full bg-gray-100">â</button>
              <span className="font-bold">{teamCount}</span>
              <button onClick={() => setTeamCount(c => c + 1)} className="w-8 h-8 rounded-full bg-black text-white">+</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><div className="text-gray-500">íê¸</div><div className="font-bold">â©{cashTotal.toLocaleString()}</div></div>
            <div><div className="text-gray-500">ì¹´ë</div><div className="font-bold">â©{cardTotal.toLocaleString()}</div></div>
            <div><div className="text-gray-500">í©ê³</div><div className="font-bold">â©{totalAll.toLocaleString()}</div></div>
          </div>
        </div>

        {/* íì´ë¸ ëª©ë¡ */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold">â  íì´ë¸ ê¸°ë¡</span>
            <button onClick={() => setItems([...items, emptyItem()])} className="text-xs border px-2 py-1 rounded">+ ì¶ê°</button>
          </div>
          {items.map((item, idx) => (
            <div key={item.localId} className="bg-white rounded-lg border p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{idx + 1}</span>
                <input value={item.tableNumber} onChange={e => updateItemField(item.localId, 'tableNumber', e.target.value)} placeholder="ë²í¸" className="text-sm font-bold outline-none" />
                <button onClick={() => removeItem(item)}><Trash2 size={14} className="text-red-400" /></button>
              </div>
              <div className="flex gap-2">
                <AmountInput value={item.amount} onChange={v => updateItemField(item.localId, 'amount', v)} className="flex-1 text-right font-bold" />
                <button onClick={() => updateItemField(item.localId, 'paymentMethod', item.paymentMethod === 'card' ? 'cash' : 'card')} className="text-xs border px-2 py-1 rounded">
                  {item.paymentMethod === 'card' ? 'ì¹´ë' : 'íê¸'}
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
