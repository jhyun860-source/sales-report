/**
 * 월간 출근부
 * - 날짜(세로) × 직원(가로) 표. 직원마다 근무시간 / 연장(부족)시간 / 급여유무 체크
 * - 근무시간·연장시간은 테이블 기록의 출근자 시간에서 자동 계산 (직원은 7시간 기준)
 * - 급여유무 체크는 표시용이며 정산(인건비 계산)에는 영향이 없다
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, Check, Save } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';

const BG = 'oklch(0.985 0.008 85)';
const TEXT = 'oklch(0.12 0.01 50)';
const MUTED = 'oklch(0.5 0.01 50)';
const BORDER = 'oklch(0.75 0.015 85)';
const HEADER_BG = 'oklch(0.93 0.015 85)';
const PRIMARY = 'oklch(0.45 0.18 25)';
const PLUS = 'oklch(0.45 0.15 150)';
const MINUS = 'oklch(0.5 0.2 25)';
const SUNDAY_BG = 'oklch(0.96 0.07 110)';
// 직원별 형광펜 색 (직원마다 다르게)
const MARK_COLORS = ['#fff176', '#ffab91', '#a5d6a7', '#81d4fa', '#ce93d8', '#f48fb1', '#ffcc80', '#b0bec5', '#c5e1a5', '#80cbc4', '#bcaaa4', '#9fa8da'];
const BRANCH_OPTIONS = [
  { id: 1, name: '선릉점' }, { id: 2, name: '대치점' }, { id: 3, name: '삼성점' },
  { id: 4, name: '문정1호점' }, { id: 5, name: '문정2호점' }, { id: 6, name: '방이점' },
];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function moveMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 분 → "4:30"
function hm(mins: number): string {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function signedHm(mins: number): string {
  if (mins === 0) return '±0';
  return `${mins > 0 ? '+' : '-'}${hm(mins)}`;
}

// 분 → "+150분 (2시간 30분)" (60분 미만이면 괄호 없이 "+35분")
function signedMin(mins: number): string {
  const sign = mins > 0 ? '+' : '-';
  const a = Math.abs(mins);
  if (a < 60) return `${sign}${a}분`;
  const h = Math.floor(a / 60), r = a % 60;
  return `${sign}${a}분 (${h}시간${r > 0 ? ` ${r}분` : ''})`;
}

const TYPE_LABEL: Record<string, string> = { manager: '점장', deputy: '매니저', staff: '직원', parttime: '알바' };

export default function AttendanceSheet() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user: account, loading: authLoading } = useStoreAuth();
  const [yearMonth, setYearMonth] = useState(getCurrentMonth);
  const currentYearMonth = useMemo(() => getCurrentMonth(), []);

  const branchIdFromUrl = useMemo(() => {
    const val = new URLSearchParams(search).get('branchId');
    if (val) return Number(val);
    // 주소에 지점이 없으면 홈에서 마지막으로 선택한 지점 사용 (관리자용)
    try {
      const saved = localStorage.getItem('selectedBranchId');
      return saved ? Number(saved) : undefined;
    } catch { return undefined; }
  }, [search]);

  const { data, isLoading, error } = trpc.attendance.monthly.useQuery(
    { yearMonth, branchId: branchIdFromUrl },
    { enabled: !authLoading && !!account, retry: false }
  );
  const utils = trpc.useUtils();
  const saveChanges = trpc.attendance.saveChanges.useMutation();

  // 급여 체크 / 형광펜은 화면에서 먼저 바꾸고, 위쪽 [저장] 버튼을 눌러야 저장됩니다
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [marks, setMarks] = useState<Set<string>>(new Set());
  const [edited, setEdited] = useState(false); // 사용자가 직접 바꾼 적이 있는지
  useEffect(() => {
    if (edited) return; // 직접 바꾼 내용이 있으면 서버값으로 덮어쓰지 않음
    setChecked(new Set(data?.checked ?? []));
    setMarks(new Set(data?.marks ?? []));
  }, [data, edited]);

  const diffSets = (now: Set<string>, base: string[]) => {
    const b = new Set(base);
    return {
      add: Array.from(now).filter(k => !b.has(k)),
      remove: base.filter(k => !now.has(k)),
    };
  };
  const paidDiff = diffSets(checked, data?.checked ?? []);
  const markDiff = diffSets(marks, data?.marks ?? []);
  const dirtyCount = paidDiff.add.length + paidDiff.remove.length + markDiff.add.length + markDiff.remove.length;
  const dirty = edited && dirtyCount > 0;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const toKey = (k: string) => { const i = k.lastIndexOf('__'); return { staffName: k.slice(0, i), date: k.slice(i + 2) }; };

  const handleSave = async () => {
    if (!dirty || saveChanges.isPending) return;
    try {
      await saveChanges.mutateAsync({
        branchId: branchIdFromUrl,
        paidAdd: paidDiff.add.map(toKey),
        paidRemove: paidDiff.remove.map(toKey),
        markAdd: markDiff.add.map(toKey),
        markRemove: markDiff.remove.map(toKey),
      });
      await utils.attendance.monthly.invalidate();
      setEdited(false);
      toast.success('저장되었습니다');
    } catch {
      toast.error('저장에 실패했습니다. 다시 눌러주세요.');
    }
  };

  const toggle = (name: string, date: string) => {
    const key = `${name}__${date}`;
    setEdited(true);
    setChecked(prev => { const s = new Set(prev); if (s.has(key)) s.delete(key); else s.add(key); return s; });
  };
  const toggleMark = (name: string, date: string) => {
    const key = `${name}__${date}`;
    setMarks(prev => { const s = new Set(prev); if (s.has(key)) s.delete(key); else s.add(key); return s; });
  };

  const changeMonth = (fn: (v: string) => string) => {
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 저장하지 않고 이동할까요?')) return;
    setEdited(false);
    setChecked(new Set());
    setMarks(new Set());
    setYearMonth(fn);
  };

  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dayList = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dateStr = (d: number) => `${yearMonth}-${String(d).padStart(2, '0')}`;

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: MUTED }}>불러오는 중...</div>;
  }
  if (!account) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
        <div className="text-base font-semibold" style={{ color: TEXT }}>로그인이 필요합니다</div>
        <button onClick={() => navigate('/login')} className="px-4 py-2 rounded text-sm text-white font-medium" style={{ background: PRIMARY }}>로그인</button>
      </div>
    );
  }

  const staff = data?.staff ?? [];
  const cells = data?.cells ?? {};
  const totals = data?.totals ?? {};

  const th: React.CSSProperties = { border: `1px solid ${BORDER}`, background: HEADER_BG, padding: '4px 2px', fontSize: 11, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { border: `1px solid ${BORDER}`, padding: '3px 2px', fontSize: 12, textAlign: 'center', color: TEXT, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <header className="sticky top-0 z-20 px-4 py-3" style={{ background: HEADER_BG, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-full" style={{ color: TEXT }} aria-label="뒤로"><ArrowLeft size={18} /></button>
          <CalendarCheck size={16} style={{ color: PRIMARY }} />
          <span className="text-base font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>출근부</span>
          {account.role === 'admin' && (
            <select
              value={branchIdFromUrl ?? ''}
              onChange={e => {
                if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 저장하지 않고 이동할까요?')) return;
                setEdited(false);
                setChecked(new Set());
                setMarks(new Set());
                navigate(`/attendance?branchId=${e.target.value}`);
              }}
              className="ml-1 h-8 rounded-lg px-2 text-xs font-medium"
              style={{ border: `1px solid ${BORDER}`, background: BG, color: TEXT }}
              aria-label="지점 선택"
            >
              {branchIdFromUrl === undefined && <option value="">지점 선택</option>}
              {BRANCH_OPTIONS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <div className="ml-auto flex items-center gap-2">
            {dirty && <span className="text-xs font-medium" style={{ color: MINUS }}>저장 안 됨</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saveChanges.isPending}
              className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
              style={{ background: PRIMARY }}
            >
              <Save size={14} />
              {saveChanges.isPending ? '저장 중' : '저장'}
            </button>
          </div>
        </div>
      </header>

      <main className="px-2 py-4 pb-10">
        <div className="flex items-center justify-center gap-4 mb-3">
          <button onClick={() => changeMonth(v => moveMonth(v, -1))} className="p-2 rounded-full" style={{ color: TEXT }} aria-label="이전 달"><ChevronLeft size={22} strokeWidth={2.5} /></button>
          <div className="text-lg font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>{y}년 {m}월</div>
          <button onClick={() => changeMonth(v => moveMonth(v, 1))} disabled={yearMonth >= currentYearMonth} className="p-2 rounded-full disabled:opacity-30" style={{ color: TEXT }} aria-label="다음 달"><ChevronRight size={22} strokeWidth={2.5} /></button>
        </div>

        <div className="text-xs text-center mb-3" style={{ color: MUTED }}>
          근무시간 · 연장(+)/부족(-)시간은 테이블 기록 출근자에서 자동 계산됩니다 (직원 기준 7시간). 테이블 기록에 출근이 입력되면 근무·연장 칸에 직원 색으로 형광펜이 자동으로 칠해집니다. 급여 체크는 위쪽 [저장]을 눌러야 저장됩니다.
        </div>

        {isLoading && <div className="text-center py-10 text-sm" style={{ color: MUTED }}>불러오는 중...</div>}

        {error && (
          <div className="rounded-lg p-6 text-center text-sm" style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
            {error.message || '출근부를 불러오지 못했습니다.'}
            {!branchIdFromUrl && <div className="mt-1">관리자는 홈에서 지점을 선택한 뒤 출근부 버튼을 눌러주세요.</div>}
          </div>
        )}

        {!isLoading && !error && staff.length === 0 && (
          <div className="rounded-lg p-8 text-center text-sm" style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
            {y}년 {m}월에 출근 기록이 있는 직원이 없습니다.
          </div>
        )}

        {!isLoading && !error && staff.length > 0 && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ ...th, position: 'sticky', left: 0, zIndex: 3, minWidth: 44 }}>일</th>
                  {staff.map((s, si) => (
                    <th key={s.name} colSpan={3} style={{ ...th, minWidth: 150 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: MARK_COLORS[si % MARK_COLORS.length], marginRight: 4, verticalAlign: 'middle' }} />
                      {s.alias} <span style={{ fontWeight: 500, color: MUTED }}>({TYPE_LABEL[s.staffType] ?? s.staffType})</span>
                    </th>
                  ))}
                </tr>
                <tr>
                  {staff.map(s => (
                    <FragmentHeads key={s.name} th={th} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {dayList.map(d => {
                  const ds = dateStr(d);
                  const dow = new Date(y, m - 1, d).getDay();
                  const rowBg = dow === 0 ? SUNDAY_BG : undefined;
                  return (
                    <tr key={d} style={{ background: rowBg }}>
                      <td style={{ ...td, position: 'sticky', left: 0, zIndex: 2, background: rowBg ?? BG, fontWeight: 700, color: dow === 0 ? MINUS : TEXT }}>
                        {d}<span style={{ fontSize: 10, fontWeight: 500, marginLeft: 2 }}>{WEEKDAYS[dow]}</span>
                      </td>
                      {staff.map((s, si) => {
                        const c = cells[`${s.name}__${ds}`];
                        const key = `${s.name}__${ds}`;
                        const on = checked.has(key);
                        const hl = c ? MARK_COLORS[si % MARK_COLORS.length] : undefined; // 테이블 기록에 출근이 있으면 자동 형광펜
                        const hlStyle: React.CSSProperties = c ? { ...(hl ? { background: hl } : {}) } : {};
                        return (
                          <FragmentCells key={s.name} td={td}>
                            <td style={{ ...td, ...hlStyle }}>
                              {c ? (c.type !== 'parttime' ? (
                                <span style={{ color: c.exempt ? MUTED : TEXT }}>◯</span>
                              ) : c.minutes === null ? <span style={{ color: MUTED }}>-</span> : (
                                <span style={{ color: c.exempt ? MUTED : TEXT }}>
                                  {`${Math.floor(c.minutes / 60)}시간`}{c.exempt ? '*' : ''}
                                </span>
                              )) : ''}
                            </td>
                            <td style={{ ...td, ...hlStyle, color: c && c.type === 'parttime' ? PLUS : (c && c.diff !== null ? (c.diff > 0 ? PLUS : c.diff < 0 ? MINUS : MUTED) : MUTED) }}>
                              {c && !c.exempt && c.minutes !== null
                                ? (c.type === 'parttime'
                                    ? (c.minutes % 60 > 0 ? `+${c.minutes % 60}분` : '')
                                    : (c.diff !== null && c.diff !== 0 ? signedMin(c.diff) : ''))
                                : ''}
                            </td>
                            <td style={td}>
                              {c ? (
                                <button
                                  type="button"
                                  onClick={() => toggle(s.name, ds)}
                                  aria-label={`${s.alias} ${d}일 급여 체크`}
                                  style={{
                                    width: 22, height: 22, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    border: `1px solid ${on ? PRIMARY : BORDER}`, background: on ? PRIMARY : 'transparent', color: 'white',
                                  }}
                                >
                                  {on && <Check size={14} strokeWidth={3} />}
                                </button>
                              ) : ''}
                            </td>
                          </FragmentCells>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...td, position: 'sticky', left: 0, zIndex: 2, background: HEADER_BG, fontWeight: 700 }}>합계</td>
                  {staff.map(s => {
                    const t = totals[s.name];
                    const paidCount = dayList.filter(d => checked.has(`${s.name}__${dateStr(d)}`)).length;
                    // 알바: 시간(정각) 합계 + 남는 분 합계 (시급 미대상 제외)
                    let pH = 0, pR = 0;
                    if (s.staffType === 'parttime') {
                      for (const d of dayList) {
                        const cc = cells[`${s.name}__${dateStr(d)}`];
                        if (!cc || cc.exempt || cc.minutes === null) continue;
                        pH += Math.floor(cc.minutes / 60);
                        pR += cc.minutes % 60;
                      }
                    }
                    return (
                      <FragmentCells key={s.name} td={td}>
                        <td style={{ ...td, background: HEADER_BG, fontWeight: 700 }}>
                          {t ? (s.staffType === 'parttime' ? `${pH}시간` : `${t.days}일`) : ''}
                        </td>
                        <td style={{ ...td, background: HEADER_BG, fontWeight: 700, color: s.staffType === 'parttime' ? PLUS : (t ? (t.diff > 0 ? PLUS : t.diff < 0 ? MINUS : MUTED) : MUTED) }}>
                          {t && s.staffType === 'parttime' ? (pR > 0 ? signedMin(pR) : '') : (t && s.staffType === 'staff' && t.diff !== 0 ? signedMin(t.diff) : '')}
                        </td>
                        <td style={{ ...td, background: HEADER_BG, fontWeight: 700 }}>{paidCount > 0 ? `${paidCount}일` : ''}</td>
                      </FragmentCells>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ ...td, position: 'sticky', left: 0, zIndex: 2, background: HEADER_BG, fontWeight: 700 }}>총계</td>
                  {staff.map(s => {
                    const t = totals[s.name];
                    const tm = t?.minutes ?? 0;
                    return (
                      <td key={s.name} colSpan={3} style={{ ...td, background: HEADER_BG, fontWeight: 700 }}>
                        {s.staffType === 'parttime' && t ? `${Math.floor(tm / 60)}시간${tm % 60 > 0 ? ` ${tm % 60}분` : ''}` : ''}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="text-xs mt-3" style={{ color: MUTED }}>
          점장·매니저·직원은 출근하면 근무 칸에 ◯로 표시됩니다. 직원은 하루 7시간 기준으로 초과하면 +분, 모자라면 -분이 연장 칸에 표시됩니다. 알바는 근무 칸에 시간(정각)만, 남는 분은 연장 칸에 +분으로 표시됩니다 (예: 4시간 35분 → 4시간 / +35분). 시급 미대상(연한 표시)은 합계에서 제외됩니다.
        </div>
      </main>
    </div>
  );
}

function FragmentHeads({ th }: { th: React.CSSProperties }) {
  return (
    <>
      <th style={th}>근무</th>
      <th style={th}>연장</th>
      <th style={th}>급여</th>
    </>
  );
}

function FragmentCells({ children }: { children: React.ReactNode; td: React.CSSProperties }) {
  return <>{children}</>;
}
