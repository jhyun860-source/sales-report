/**
 * Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â Ã¬ÂÂÃ¬ÂÂ ÃªÂ¸Â°Ã«Â¡Â Ã­ÂÂÃ¬ÂÂ´Ã¬Â§Â
 * - Ã«ÂÂ Ã¬Â§ÂÃ«Â³Â Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â Ã«ÂªÂ©Ã«Â¡Â (Ã«Â²ÂÃ­ÂÂ¸, Ã¬ÂÂÃ«ÂÂÃªÂµÂ¬Ã«Â¶Â, ÃªÂ¸ÂÃ¬ÂÂ¡, ÃªÂ²Â°Ã¬Â ÂÃ¬ÂÂÃ«ÂÂ¨, Ã«Â©ÂÃ«ÂªÂ¨)
 * - Ã¬Â¶ÂÃªÂ·Â¼Ã¬ÂÂ Ã¬ÂÂ¸Ã¬ÂÂ¼Ã­ÂÂ°Ã«Â¸Â (Ã¬ÂÂÃ¬Â¶ÂÃªÂ°Â, Ã«Â³ÂÃ¬Â¶ÂÃªÂ°Â, Ã«Â§Â¥Ã¬Â£Â¼Ã«Â³ÂÃ¬Â¶ÂÃªÂ°Â, Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¸Ã¬ÂÂ¼, ÃªÂ·Â¼Ã«Â¬Â´Ã¬ÂÂÃªÂ°Â)
 * - Ã­ÂÂÃ¬ÂÂ, ÃªÂ¸Â°Ã­ÂÂ Ã¬ÂÂ¬Ã­ÂÂ­
 * - Ã¬Â ÂÃ¬ÂÂ¥ Ã¬ÂÂ Ã­ÂÂÃªÂ¸Â/Ã¬Â¹Â´Ã«ÂÂ Ã­ÂÂ©Ã¬ÂÂ°ÃªÂ°ÂÃ¬ÂÂ´ Ã«Â§Â¤Ã¬Â¶ÂÃªÂ¸Â°Ã«Â¡ÂÃ¬ÂÂ Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂÃ«ÂÂ¨
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, CheckCircle2, Users, Wine, Camera, Merge } from 'lucide-react';
import { MemoEditor } from '@/components/MemoEditor';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { MANAGER_LIQUOR_EDIT_IDS } from '@/lib/accountAccess';

// Google Sheets Ã¬Â ÂÃ¬ÂÂ¡Ã¬ÂÂ Ã¬ÂÂÃ­ÂÂ GAS URL
const GAS_URL = "https://script.google.com/macros/s/AKfycbxfa8sXtVXxilxrtLJ7KyZT-3qAgHdLvlfrLNzx5m99MdbtzM22Lq9QGJ4zEtkimcHfZQ/exec";

// Ã«ÂÂ Ã¬Â§Â Ã­ÂÂ¬Ã«Â§Â·
function getTodayString() {
  const d = new Date();
  // Ã¬ÂÂ¼Ã¬ÂÂÃ¬ÂÂ¼(0)Ã¬ÂÂ´Ã«Â©Â´ Ã¬Â ÂÃ«ÂÂ (Ã­ÂÂ Ã¬ÂÂÃ¬ÂÂ¼)Ã«Â¡Â
  if (d.getDay() === 0) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  const days = ['Ã¬ÂÂ¼', 'Ã¬ÂÂ', 'Ã­ÂÂ', 'Ã¬ÂÂ', 'Ã«ÂªÂ©', 'ÃªÂ¸Â', 'Ã­ÂÂ '];
  const dow = new Date(Number(y), Number(m) - 1, Number(d)).getDay();
  return `${Number(m)}Ã¬ÂÂ ${Number(d)}Ã¬ÂÂ¼ (${days[dow]})`;
}

function moveDateBy(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  // Ã¬ÂÂ´Ã«ÂÂÃ­ÂÂ Ã«ÂÂ Ã¬Â§ÂÃªÂ°Â Ã¬ÂÂ¼Ã¬ÂÂÃ¬ÂÂ¼Ã¬ÂÂ´Ã«Â©Â´ ÃªÂ°ÂÃ¬ÂÂ Ã«Â°Â©Ã­ÂÂ¥Ã¬ÂÂ¼Ã«Â¡Â Ã­ÂÂ Ã¬Â¹Â¸ Ã«ÂÂ Ã¬ÂÂ´Ã«ÂÂ
  if (d.getDay() === 0) d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ÃªÂ¸ÂÃ¬ÂÂ¡ Ã¬ÂÂÃ«Â Â¥ Ã¬Â»Â´Ã­ÂÂ¬Ã«ÂÂÃ­ÂÂ¸
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

// Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â Ã¬Â¹Â´Ã«ÂÂ Ã­ÂÂÃ¬ÂÂ
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

// Ã¬Â§ÂÃ¬ÂÂ Ã¬ÂÂ¸Ã¬ÂÂ¼Ã­ÂÂ°Ã«Â¸Â Ã­ÂÂÃ¬ÂÂ
type IncentiveLocal = {
  id?: number;
  localId: string;
  staffName: string;
  staffType: 'staff' | 'parttime'; // Ã¬Â§ÂÃ¬ÂÂ/Ã¬ÂÂÃ«Â¥Â´Ã«Â°ÂÃ¬ÂÂ´Ã­ÂÂ¸
  glassCount: number;
  bottleCount: number;
  beerBottleCount: number;
  salesIncentive: string;
  workStart: string;       // HH:mm 24Ã¬ÂÂÃªÂ°Â Ã­ÂÂÃ¬ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â ÂÃ¬ÂÂ¥
  workEnd: string;         // HH:mm 24Ã¬ÂÂÃªÂ°Â Ã­ÂÂÃ¬ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â ÂÃ¬ÂÂ¥
  workStartAmPm: 'AM' | 'PM';
  workEndAmPm: 'AM' | 'PM';
  workStartHour: string;   // Ã­ÂÂÃ¬ÂÂÃ¬ÂÂ© Ã¬ÂÂÃªÂ°Â (1~12)
  workEndHour: string;     // Ã­ÂÂÃ¬ÂÂÃ¬ÂÂ© Ã¬ÂÂÃªÂ°Â (1~12)
  workStartMin: string;    // Ã­ÂÂÃ¬ÂÂÃ¬ÂÂ© Ã«Â¶Â (00~59)
  workEndMin: string;      // Ã­ÂÂÃ¬ÂÂÃ¬ÂÂ© Ã«Â¶Â (00~59)
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

// HH:mm Ã¢ÂÂ Ã¬ÂÂ¤Ã¬Â Â/Ã¬ÂÂ¤Ã­ÂÂ, Ã¬ÂÂÃªÂ°Â(1~12), Ã«Â¶Â Ã¬ÂÂ­Ã«Â³ÂÃ­ÂÂ
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

// Ã¬ÂÂ¤Ã¬Â Â/Ã¬ÂÂ¤Ã­ÂÂ + Ã¬ÂÂÃªÂ°Â/Ã«Â¶Â Ã¢ÂÂ HH:mm 24Ã¬ÂÂÃªÂ°Â Ã«Â³ÂÃ­ÂÂ
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
  // Ã«ÂÂ Ã¬Â§ÂÃ«Â¥Â¼ localStorageÃ¬ÂÂ Ã¬Â ÂÃ¬ÂÂ¥/Ã«Â³ÂµÃ¬ÂÂ (Ã¬ÂÂÃ«Â¡ÂÃªÂ³Â Ã¬Â¹Â¨ Ã­ÂÂÃ¬ÂÂÃ«ÂÂ Ã¬ÂÂ Ã¬Â§Â)
  const [currentDate, setCurrentDateState] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedDate');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        // Ã¬ÂÂ¼Ã¬ÂÂÃ¬ÂÂ¼Ã¬ÂÂ´Ã«Â©Â´ Ã­ÂÂ Ã¬ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã«Â³Â´Ã¬Â Â
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
        // Ã«ÂÂ Ã¬Â§ÂÃªÂ°Â Ã«ÂÂ¬Ã«ÂÂ¼Ã¬Â§ÂÃ«Â©Â´ loadedDateRef Ã¬Â´ÂÃªÂ¸Â°Ã­ÂÂ Ã¢ÂÂ Ã¬ÂÂ Ã«ÂÂ Ã¬Â§Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ° Ã«Â¡ÂÃ«ÂÂ Ã­ÂÂÃ¬ÂÂ©
        loadedDateRef.current = null;
        setSaved(false);
        // Ã¬ÂÂÃ«ÂÂÃ¬Â ÂÃ¬ÂÂ¥ Ã­ÂÂÃ¬ÂÂ´Ã«Â¨Â¸ Ã¬Â·Â¨Ã¬ÂÂ: Ã«ÂÂ Ã¬Â§Â Ã¬ÂÂ´Ã«ÂÂ Ã¬ÂÂ Ã¬ÂÂ´Ã¬Â Â Ã«ÂÂ Ã¬Â§Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°ÃªÂ°Â Ã¬ÂÂ Ã«ÂÂ Ã¬Â§ÂÃ«Â¡Â Ã¬Â ÂÃ¬ÂÂ¥Ã«ÂÂÃ«ÂÂ ÃªÂ²Â Ã«Â°Â©Ã¬Â§Â
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
  // Ã¬ÂÂ´Ã«Â¯Â¸ Ã«Â¡ÂÃ«ÂÂÃ­ÂÂ Ã«ÂÂ Ã¬Â§Â Ã¬Â¶ÂÃ¬Â Â (items Ã«ÂÂ®Ã¬ÂÂ´Ã¬ÂÂ°ÃªÂ¸Â° Ã«Â°Â©Ã¬Â§Â)
  const loadedDateRef = useRef<string | null>(null);

  // URL Ã­ÂÂÃ«ÂÂ¼Ã«Â¯Â¸Ã­ÂÂ°Ã¬ÂÂÃ¬ÂÂ branchId Ã¬ÂÂ½ÃªÂ¸Â° (ÃªÂ´ÂÃ«Â¦Â¬Ã¬ÂÂÃªÂ°Â Ã¬Â§ÂÃ¬Â Â Ã¬ÂÂ Ã­ÂÂ Ã­ÂÂ Ã¬ÂÂ´Ã«ÂÂ Ã¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©)
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

  // Ã«ÂÂ Ã¬Â§ÂÃ«Â³Â ÃªÂ¸Â°Ã«Â¡Â Ã¬Â¡Â°Ã­ÂÂ - staleTimeÃ¬ÂÂ ÃªÂ¸Â¸ÃªÂ²Â Ã¬ÂÂ¤Ã¬Â ÂÃ­ÂÂ´ Ã¬ÂÂÃ«ÂÂ Ã«Â¦Â¬Ã­ÂÂÃ¬Â¹Â Ã«Â°Â©Ã¬Â§Â
  const { data: reportData, dataUpdatedAt } = trpc.tableReport.getByDate.useQuery(
    { date: currentDate, branchId: effectiveBranchId },
    { enabled: !!account && !!effectiveBranchId, staleTime: Infinity, refetchOnWindowFocus: false }
  );

  // Ã¬ÂÂÃ«Â²Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ° Ã¢ÂÂ Ã«Â¡ÂÃ¬Â»Â¬ Ã¬ÂÂÃ­ÂÂ Ã«ÂÂÃªÂ¸Â°Ã­ÂÂ
  // reportDataÃªÂ°Â Ã­ÂÂ´Ã«ÂÂ¹ Ã«ÂÂ Ã¬Â§Â(currentDate)Ã¬ÂÂ Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã¬ÂÂ¼ Ã«ÂÂÃ«Â§Â Ã«ÂÂ®Ã¬ÂÂ´Ã¬ÂÂ
  useEffect(() => {
    // reportDataÃªÂ°Â Ã¬ÂÂÃ¬Â§Â undefinedÃ«Â©Â´ Ã«Â¡ÂÃ«ÂÂ© Ã¬Â¤Â Ã¢ÂÂ ÃªÂ±Â´Ã«ÂÂÃ«ÂÂ
    if (reportData === undefined) return;
    // Ã¬ÂÂ´Ã«Â¯Â¸ Ã¬ÂÂ´ Ã«ÂÂ Ã¬Â§Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã«Â¥Â¼ Ã«Â¡ÂÃ«ÂÂÃ­ÂÂÃ¬ÂÂ¼Ã«Â©Â´ Ã«ÂÂ¤Ã¬ÂÂ Ã«ÂÂ®Ã¬ÂÂ´Ã¬ÂÂ°Ã¬Â§Â Ã¬ÂÂÃ¬ÂÂ
    if (loadedDateRef.current === currentDate) return;
    // Ã­ÂÂÃ¬ÂÂ¬ Ã«ÂÂ Ã¬Â§Â ÃªÂ¸Â°Ã«Â¡Â Ã¬ÂÂÃ«Â£Â
    loadedDateRef.current = currentDate;
    // Ã¬ÂÂÃ«ÂÂÃ¬Â ÂÃ¬ÂÂ¥ Ã­ÂÂÃ¬ÂÂ´Ã«Â¨Â¸ÃªÂ°Â Ã¬ÂÂÃ¬ÂÂ¼Ã«Â©Â´ Ã¬Â·Â¨Ã¬ÂÂ (Ã«ÂÂ Ã¬Â§Â Ã¬ÂÂ´Ã«ÂÂ Ã¬ÂÂ Ã¬ÂÂ´Ã¬Â Â Ã«ÂÂ Ã¬Â§Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã«Â¡Â Ã¬Â ÂÃ¬ÂÂ¥Ã«ÂÂÃ«ÂÂ ÃªÂ²Â Ã«Â°Â©Ã¬Â§Â)
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
    // Ã«ÂÂ Ã¬Â§ÂÃªÂ°Â Ã¬ÂÂ¤Ã¬Â ÂÃ«Â¡Â Ã«Â³ÂÃªÂ²Â½Ã«ÂÂÃ¬ÂÂÃ¬ÂÂ Ã«ÂÂÃ«Â§Â saved Ã«Â¦Â¬Ã¬ÂÂ (Ã¬Â ÂÃ¬ÂÂ¥ Ã¬ÂÂÃ«Â£Â Ã­ÂÂ Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ° Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂÃ¬ÂÂÃ«ÂÂ saved Ã¬ÂÂ Ã¬Â§Â)
    // setSaved(false)Ã«Â¥Â¼ Ã¬ÂÂ¬ÃªÂ¸Â°Ã¬ÂÂ Ã­ÂÂ¸Ã¬Â¶ÂÃ­ÂÂÃ«Â©Â´ Ã¬Â ÂÃ¬ÂÂ¥ Ã¬ÂÂÃ«Â£Â Ã­ÂÂ Ã¬ÂÂÃ«Â²Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°ÃªÂ°Â Ã«ÂÂ¤Ã¬ÂÂ Ã«ÂÂ¤Ã¬ÂÂ´Ã¬ÂÂ¬ Ã«ÂÂ saved Ã­ÂÂÃ¬ÂÂÃªÂ°Â Ã¬ÂÂ¬Ã«ÂÂ¼Ã¬Â§Â
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData, currentDate, dataUpdatedAt]); // currentDateÃ«ÂÂ loadedDateRefÃ«Â¡Â Ã¬Â²Â´Ã­ÂÂ¬Ã­ÂÂÃ¬Â§ÂÃ«Â§Â Ã¬ÂÂÃ¬Â¡Â´Ã¬ÂÂ±Ã¬ÂÂÃ«ÂÂ Ã­ÂÂ¬Ã­ÂÂ¨Ã­ÂÂÃ¬ÂÂ¬ Ã«ÂÂ Ã¬Â§Â Ã«Â³ÂÃªÂ²Â½ Ã¬ÂÂ Ã¬ÂÂ¤Ã­ÂÂ Ã«Â³Â´Ã¬ÂÂ¥

  // Ã­ÂÂÃªÂ´ÂÃ­ÂÂ Ã­ÂÂ¨Ã­ÂÂ´ Ã¬ÂÂÃ«ÂÂ Ã­ÂÂÃ¬ÂÂµ - Ã¬ÂÂ± Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂ Ã¬ÂÂ´Ã¬Â Â Ã«Â©ÂÃ«ÂªÂ¨Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂ¨Ã­ÂÂ´ Ã¬Â¶ÂÃ¬Â¶Â Ã­ÂÂ localStorage Ã¬ÂºÂÃ¬ÂÂ
  const highlightCacheKey = `highlight_patterns_${effectiveBranchId ?? 'unknown'}`;

  // [Ã¬ÂÂÃ¬Â Â] Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂ Ã­ÂÂÃ¬ÂÂµÃ­ÂÂ Ã­ÂÂÃªÂ´ÂÃ­ÂÂ Ã¬Â ÂÃ¬ÂÂ¸ Ã«ÂÂ¨Ã¬ÂÂ´ Ã¬Â ÂÃ¬ÂÂ¥ Ã­ÂÂ¤
  //   - Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂÃªÂ°Â Ã¬ÂÂÃ«ÂÂ Ã­ÂÂÃªÂ´ÂÃ­ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ´ Ã«ÂÂ¨Ã¬ÂÂ´Ã«Â¥Â¼ Ã«ÂÂÃ¬Â Â Ã¬Â¹Â´Ã¬ÂÂ´Ã­ÂÂ¸Ã­ÂÂÃ¬ÂÂ¬,
  //     Ã¬ÂÂ¼Ã¬Â Â Ã­ÂÂÃ¬ÂÂ(EXCLUDE_THRESHOLD Ã¬ÂÂ´Ã¬ÂÂ) Ã¬Â ÂÃªÂ±Â°Ã«ÂÂÃ«Â©Â´ Ã«ÂÂ¤Ã¬ÂÂ Ã«Â¶ÂÃ¬ÂÂÃ«Â¶ÂÃ­ÂÂ° Ã¬ÂÂÃ«ÂÂ Ã¬Â ÂÃ¬ÂÂ¸Ã­ÂÂÃ«ÂÂ Ã­ÂÂÃ¬ÂÂµÃ­ÂÂ Ã«Â¡ÂÃ¬Â§Â.
  const highlightExcludeKey = `excluded_highlight_patterns_${effectiveBranchId ?? 'unknown'}`;

  type HighlightExcludes = {
    yellow: Record<string, number>; // Ã«ÂÂ¨Ã¬ÂÂ´ -> Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂÃªÂ°Â markÃ«Â¥Â¼ Ã¬Â§ÂÃ¬ÂÂ´ Ã­ÂÂÃ¬ÂÂ
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

  // Ã­ÂÂÃ¬ÂÂµ Ã¬ÂÂÃªÂ³ÂÃªÂ°Â: 1Ã¬ÂÂ´Ã«Â©Â´ Ã­ÂÂ Ã«Â²Â Ã¬Â§ÂÃ¬ÂÂ°Ã«Â©Â´ Ã¬Â¦ÂÃ¬ÂÂ Ã¬Â ÂÃ¬ÂÂ¸, 2Ã¬ÂÂ´Ã«Â©Â´ Ã«ÂÂ Ã«Â²Â Ã¬ÂÂ´Ã¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ Ã¬ÂÂ Ã«ÂÂ Ã¬Â ÂÃ¬ÂÂ¸
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

  // Ã«Â©ÂÃ«ÂªÂ¨ HTMLÃ¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃªÂ¹ÂÃ«Â³Â mark Ã­ÂÂÃ¬ÂÂ¤Ã­ÂÂ¸ Ã¬Â¶ÂÃ¬Â¶Â (yellow / pink)
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

  // localStorageÃ¬ÂÂÃ¬ÂÂ Ã¬ÂºÂÃ¬ÂÂÃ«ÂÂ Ã­ÂÂ¨Ã­ÂÂ´ Ã¬Â´ÂÃªÂ¸Â° Ã«Â¡ÂÃ«ÂÂ
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

  // [Ã­ÂÂÃ¬ÂÂµ Ã­ÂÂ¨Ã¬ÂÂ] Ã«Â¶ÂÃ¬ÂÂÃ«ÂÂ keyword Ã¬Â¤Â, Ã«Â©ÂÃ«ÂªÂ¨ HTMLÃ¬ÂÂ "Ã«ÂÂ¨Ã¬ÂÂ´ ÃªÂ²Â½ÃªÂ³ÂÃªÂ°Â Ã«Â³Â´Ã¬Â¡Â´Ã«ÂÂ Ã­ÂÂÃ«Â¬Â¸"Ã¬ÂÂ¼Ã«Â¡ÂÃ«ÂÂ Ã¬Â¡Â´Ã¬ÂÂ¬Ã­ÂÂÃ«ÂÂ
  // mark Ã­ÂÂÃªÂ·Â¸Ã«Â¡ÂÃ«ÂÂ Ã¬Â ÂÃ¬ÂÂ©Ã«ÂÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬Â§Â Ã¬ÂÂÃ¬ÂÂ Ã«ÂÂ¨Ã¬ÂÂ´Ã«Â¥Â¼ "Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂÃªÂ°Â markÃ«Â¥Â¼ Ã¬Â§ÂÃ¬ÂÂ´ Ã«ÂÂ¨Ã¬ÂÂ´"Ã«Â¡Â Ã«Â³Â´ÃªÂ³Â  Ã¬Â¹Â´Ã¬ÂÂ´Ã­ÂÂ¸ +1.
  const learnHighlightExcludesFromMemo = (memoHtml: string) => {
    if (!memoHtml) return;
    const patterns = highlightPatterns;
    if (!patterns) return;
    const { yellow: markedYellow, pink: markedPink } = extractMarkedTexts(memoHtml);
    const cleanText = memoHtml.replace(/<[^>]+>/g, '');
    const next = loadHighlightExcludes();

    // Ã«ÂÂ¨Ã¬ÂÂ´ Ã¬ÂÂ¼Ã«Â¶ÂÃ«Â¡Â Ã«Â¶ÂÃ¬ÂÂ´Ã¬ÂÂÃ¬ÂÂ¼Ã«Â©Â´ Ã¬ÂÂ Ã«ÂÂÃ«ÂÂ Ã¬ÂÂ¸Ã¬Â Â Ã«Â¬Â¸Ã¬ÂÂ Ã­ÂÂ¨Ã­ÂÂ´
    const ADJACENT_BAD = /[\uAC00-\uD7A3A-Za-z0-9(]/;
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Ã«ÂÂ¨Ã¬ÂÂ´ ÃªÂ²Â½ÃªÂ³Â ÃªÂ¸Â°Ã«Â°Â Ã­ÂÂÃ«Â¬Â¸ Ã«Â°ÂÃ¬ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬
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

  // Ã¬ÂÂÃ«Â²ÂÃ¬ÂÂÃ¬ÂÂ Ã­ÂÂ¨Ã­ÂÂ´ Ã¬Â¡Â°Ã­ÂÂ
  const shouldFetchPatterns = !!account && !!effectiveBranchId && (
    !highlightPatterns || Date.now() - highlightPatterns.cachedAt > 60 * 60 * 1000
  );
  const { data: fetchedPatterns } = trpc.tableReport.getHighlightPatterns.useQuery(
    { branchId: effectiveBranchId },
    { enabled: shouldFetchPatterns, staleTime: Infinity, refetchOnWindowFocus: false }
  );

  // Ã¬ÂÂÃ«Â²ÂÃ¬ÂÂÃ¬ÂÂ Ã­ÂÂ¨Ã­ÂÂ´ Ã«Â°ÂÃ¬ÂÂ¼Ã«Â©Â´ localStorageÃ¬ÂÂ Ã¬ÂºÂÃ¬ÂÂ
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

  // ì£¼ë¥ ë¹ì¼ ì¶ê³  ì´ì¡ ì¡°í
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

  // Google Sheets Ã¬Â ÂÃ¬ÂÂ¡ Ã­ÂÂ¨Ã¬ÂÂ
  const syncToGoogleSheets = async (_rData: any) => {
    try {
      const branchName = account?.branch?.name || 'ì ì ìì';

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

      console.log('[SalesDash] Google Sheets ëê¸°í ìë£', payload);
    } catch (err) {
      console.error('[SalesDash] Google Sheets ëê¸°í ì¤í¨:', err);
    }
  };

  // Ã¬Â ÂÃ¬ÂÂ¥ Ã­ÂÂ¨Ã¬ÂÂ
  const handleSave = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isSaving) return;
    setIsSaving(true);

    try {
      for (const it of items) {
        if (it.memo) learnHighlightExcludesFromMemo(it.memo);
      }
    } catch (e) {
      console.warn('[highlight-excludes] Ã­ÂÂÃ¬ÂÂµ Ã¬ÂÂ¤Ã­ÂÂ¨:', e);
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

      // Google Sheets Ã«ÂÂÃªÂ¸Â°Ã­ÂÂ Ã¬ÂÂ¤Ã­ÂÂ
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
      toast.success(`Ã¬Â ÂÃ¬ÂÂ¥ Ã¬ÂÂÃ«Â£Â | ÃªÂµÂ¬ÃªÂ¸Â Ã¬ÂÂÃ­ÂÂ¸ Ã«ÂÂÃªÂ¸Â°Ã­ÂÂ Ã¬Â¤Â...`, { duration: 2500 });
    } catch (e: any) {
      toast.error('Ã¬Â ÂÃ¬ÂÂ¥ Ã¬ÂÂ¤Ã­ÂÂ¨: ' + (e?.message ?? 'Ã¬ÂÂ Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂ¤Ã«Â¥Â'));
    } finally {
      setIsSaving(false);
    }
  }, [currentDate, teamCount, notes, items, incentives, isSaving, effectiveBranchId, account]);

  // Ã¬ÂÂÃ«ÂÂ Ã¬Â ÂÃ¬ÂÂ¥ Ã­ÂÂ¸Ã«Â¦Â¬ÃªÂ±Â°
  const scheduleAutoSave = useCallback(() => {
    setSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => handleSave(), 5000);
  }, [handleSave]);

  // Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â Ã­ÂÂ­Ã«ÂªÂ© Ã¬ÂÂÃ«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ¸
  const updateItemField = (localId: string, field: keyof TableItemLocal, value: string) => {
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, [field]: value } : it));
    scheduleAutoSave();
  };

  // Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â Ã­ÂÂ­Ã«ÂªÂ© Ã¬ÂÂ­Ã¬Â Â
  const removeItem = async (item: TableItemLocal) => {
    if (item.id) {
      try { await deleteItem.mutateAsync({ id: item.id }); } catch {}
    }
    setItems(prev => {
      const next = prev.filter(it => it.localId !== item.localId);
      return next.length === 0 ? [emptyItem()] : next;
    });
  };

  // Ã¬ÂÂ¸Ã¬ÂÂ¼Ã­ÂÂ°Ã«Â¸Â Ã¬ÂÂÃ«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ¸
  const updateIncentiveField = (localId: string, field: keyof IncentiveLocal, value: string | number) => {
    setIncentives(prev => prev.map(inc => inc.localId === localId ? { ...inc, [field]: value } : inc));
    scheduleAutoSave();
  };

  // Ã¬ÂÂ¸Ã¬ÂÂ¼Ã­ÂÂ°Ã«Â¸Â Ã¬ÂÂ­Ã¬Â Â
  const removeIncentive = async (inc: IncentiveLocal) => {
    if (inc.id) {
      try { await deleteIncentive.mutateAsync({ id: inc.id }); } catch {}
    }
    setIncentives(prev => {
      const next = prev.filter(i => i.localId !== inc.localId);
      return next.length === 0 ? [emptyIncentive()] : next;
    });
  };

  // Ã¬ÂÂ¬Ã¬Â§Â Ã¬Â°ÂÃ¬ÂÂ´Ã¬ÂÂ Ã«Â©ÂÃ«ÂªÂ¨ Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂÃ«Â Â¥
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
        toast.success('Ã«Â¶ÂÃ¬ÂÂ Ã¬ÂÂÃ«Â£Â');
      }
    } catch (err: any) {
      toast.error('Ã«Â¶ÂÃ¬ÂÂ Ã¬ÂÂ¤Ã­ÂÂ¨');
    } finally {
      setAnalyzingLocalId(null);
    }
  }, [analyzeOrderMemo, updateItemField, effectiveBranchId, currentDate, highlightPatterns]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Ã«Â¡ÂÃ«ÂÂ© Ã¬Â¤Â...</div>;
  if (!account) return <div className="min-h-screen flex items-center justify-center">Ã«Â¡ÂÃªÂ·Â¸Ã¬ÂÂ¸Ã¬ÂÂ´ Ã­ÂÂÃ¬ÂÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤</div>;

  const cashTotal = items.filter(it => it.paymentMethod === 'cash').reduce((s, it) => s + Number(it.amount || 0), 0);
  const cardTotal = items.filter(it => it.paymentMethod === 'card').reduce((s, it) => s + Number(it.amount || 0), 0);
  const totalAll = cashTotal + cardTotal;

  return (
    <div className="min-h-screen pb-28" style={{ background: 'oklch(0.985 0.008 85)' }}>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageFileChange} />
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-2.5 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â ÃªÂ¸Â°Ã«Â¡Â</div>
          <div className="text-xs text-gray-500">{account.branch?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={13} />Ã¬Â ÂÃ¬ÂÂ¥Ã«ÂÂ¨</span>}
          <button onClick={handleSave} disabled={isSaving} className="bg-black text-white px-3 py-1.5 rounded text-xs">
            {isSaving ? 'Ã¬Â ÂÃ¬ÂÂ¥ Ã¬Â¤Â...' : 'Ã¬Â ÂÃ¬ÂÂ¥'}
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Ã¬ÂÂÃ¬ÂÂ½ */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold">Ã­ÂÂÃ¬ÂÂ</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setTeamCount(c => Math.max(0, c - 1))} className="w-8 h-8 rounded-full bg-gray-100">Ã¢ÂÂ</button>
              <span className="font-bold">{teamCount}</span>
              <button onClick={() => setTeamCount(c => c + 1)} className="w-8 h-8 rounded-full bg-black text-white">+</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div><div className="text-gray-500">Ã­ÂÂÃªÂ¸Â</div><div className="font-bold">Ã¢ÂÂ©{cashTotal.toLocaleString()}</div></div>
            <div><div className="text-gray-500">Ã¬Â¹Â´Ã«ÂÂ</div><div className="font-bold">Ã¢ÂÂ©{cardTotal.toLocaleString()}</div></div>
            <div><div className="text-gray-500">Ã­ÂÂ©ÃªÂ³Â</div><div className="font-bold">Ã¢ÂÂ©{totalAll.toLocaleString()}</div></div>
          </div>
        </div>

        {/* Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â Ã«ÂªÂ©Ã«Â¡Â */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold">Ã¢ÂÂ  Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â ÃªÂ¸Â°Ã«Â¡Â</span>
            <button onClick={() => setItems([...items, emptyItem()])} className="text-xs border px-2 py-1 rounded">+ Ã¬Â¶ÂÃªÂ°Â</button>
          </div>
          {items.map((item, idx) => (
            <div key={item.localId} className="bg-white rounded-lg border p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{idx + 1}</span>
                <input value={item.tableNumber} onChange={e => updateItemField(item.localId, 'tableNumber', e.target.value)} placeholder="Ã«Â²ÂÃ­ÂÂ¸" className="text-sm font-bold outline-none" />
                <button onClick={() => removeItem(item)}><Trash2 size={14} className="text-red-400" /></button>
              </div>
              <div className="flex gap-2">
                <AmountInput value={item.amount} onChange={v => updateItemField(item.localId, 'amount', v)} className="flex-1 text-right font-bold" />
                <button onClick={() => updateItemField(item.localId, 'paymentMethod', item.paymentMethod === 'card' ? 'cash' : 'card')} className="text-xs border px-2 py-1 rounded">
                  {item.paymentMethod === 'card' ? 'Ã¬Â¹Â´Ã«ÂÂ' : 'Ã­ÂÂÃªÂ¸Â'}
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
