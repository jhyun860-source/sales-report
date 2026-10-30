/**
 * 월간 출근부
 * - 날짜(세로) × 직원(가로) 표. 직원마다 근무시간 / 연장(부족)시간 / 급여유무 체크
 * - 근무시간·연장시간은 테이블 기록의 출근자 시간에서 자동 계산 (직원은 7시간 기준)
 * - 급여유무 체크는 표시용이며 정산(인건비 계산)에는 영향이 없다
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, Check } from 'lucide-react';
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

const TYPE_LABEL: Record<string, string> = { manager: '점장', deputy: '매니저', staff: '직원', parttime: '알바' };

export default function AttendanceSheet() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user: account, loading: authLoading } = useStoreAuth();
  const [yearMonth, setYearMonth] = useState(getCurrentMonth);
  const currentYearMonth = useMemo(() => getCurrentMonth(), []);

  const branchIdFromUrl = useMemo(() => {
    const val = new URLSearchParams(search).get('branchId');
    return val ? Number(val) : undefined;
  }, [search]);

  const { data, isLoading, error } = trpc.attendance.monthly.useQuery(
    { yearMonth, branchId: branchIdFromUrl },
    { enabled: !authLoading && !!account, retry: false }
  );
  const setPaid = trpc.attendance.setPaid.useMutation();

  // 급여유무 체크 (화면 즉시 반영 후 서버 저장, 실패하면 되돌림)
  const [checked, setChecked] = useState<Set<string>>(new Set());
  useEffect(() => {
    setChecked(new Set(data?.checked ?? []));
  }, [data]);

  const toggle = (name: string, date: string) => {
    const key = `${name}__${date}`;
    const next = !checked.has(key);
    setChecked(prev => {
      const s = new Set(prev);
      if (next) s.add(key); else s.delete(key);
      return s;
    });
    setPaid.mutate(
      { branchId: branchIdFromUrl, date, staffName: name, checked: next },
      {
        onError: () => {
          toast.error('체크 저장에 실패했습니다. 다시 눌러주세요.');
          setChecked(prev => {
            const s = new Set(prev);
            if (next) s.delete(key); else s.add(key);
            return s;
          });
        },
      }
    );
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
        </div>
      </header>

      <main className="px-2 py-4 pb-10">
        <div className="flex items-center justify-center gap-4 mb-3">
          <button onClick={() => setYearMonth(v => moveMonth(v, -1))} className="p-2 rounded-full" style={{ color: TEXT }} aria-label="이전 달"><ChevronLeft size={22} strokeWidth={2.5} /></button>
          <div className="text-lg font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: TEXT }}>{y}년 {m}월</div>
          <button onClick={() => setYearMonth(v => moveMonth(v, 1))} disabled={yearMonth >= currentYearMonth} className="p-2 rounded-full disabled:opacity-30" style={{ color: TEXT }} aria-label="다음 달"><ChevronRight size={22} strokeWidth={2.5} /></button>
        </div>

        <div className="text-xs text-center mb-3" style={{ color: MUTED }}>
          근무시간 · 연장(+)/부족(-)시간은 테이블 기록 출근자에서 자동 계산됩니다 (직원 기준 7시간). 급여 칸 체크는 표시용입니다.
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
                  {staff.map(s => (
                    <th key={s.name} colSpan={3} style={{ ...th, minWidth: 150 }}>
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
                      {staff.map(s => {
                        const c = cells[`${s.name}__${ds}`];
                        const key = `${s.name}__${ds}`;
                        const on = checked.has(key);
                        return (
                          <FragmentCells key={s.name} td={td}>
                            <td style={td}>
                              {c ? (c.minutes === null ? <span style={{ color: MUTED }}>-</span> : (
                                <span style={{ color: c.exempt ? MUTED : TEXT }}>{hm(c.minutes)}{c.exempt ? '*' : ''}</span>
                              )) : ''}
                            </td>
                            <td style={{ ...td, color: c && c.diff !== null ? (c.diff > 0 ? PLUS : c.diff < 0 ? MINUS : MUTED) : MUTED }}>
                              {c && c.diff !== null && !c.exempt ? signedHm(c.diff) : ''}
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
                    return (
                      <FragmentCells key={s.name} td={td}>
                        <td style={{ ...td, background: HEADER_BG, fontWeight: 700 }}>{t ? hm(t.minutes) : ''}</td>
                        <td style={{ ...td, background: HEADER_BG, fontWeight: 700, color: t ? (t.diff > 0 ? PLUS : t.diff < 0 ? MINUS : MUTED) : MUTED }}>
                          {t && s.staffType === 'staff' ? signedHm(t.diff) : ''}
                        </td>
                        <td style={{ ...td, background: HEADER_BG, fontWeight: 700 }}>{paidCount > 0 ? `${paidCount}일` : ''}</td>
                      </FragmentCells>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="text-xs mt-3" style={{ color: MUTED }}>
          * 표시는 시급 미대상 근무입니다(합계에서 제외). 합계의 연장/부족시간은 직원만 계산하며 알바는 근무시간만 표시합니다.
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
