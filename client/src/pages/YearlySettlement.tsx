/**
 * 총 정산 (연간)
 * - 월별 총매출 / 순수익 / 순수익률을 한 줄씩 보여주고, 아래에 연간 합계를 보여준다.
 * - 순수익에는 점장 월말 추가인센이 반영된다. 관리자 전용.
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { getTodayString } from '@/lib/salesUtils';

const won = (n: number) => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString();

export default function YearlySettlement() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useStoreAuth();
  const thisYear = Number(getTodayString().split('-')[0]);
  const [year, setYear] = useState(thisYear);
  const [branchId, setBranchId] = useState<number | undefined>(undefined);

  const isAdmin = !!user && user.role === 'admin';
  const { data: branches = [] } = trpc.storeSales.getBranches.useQuery(undefined, { enabled: isAdmin });
  const { data, isLoading } = trpc.settlement.getYearlySummary.useQuery(
    { year, branchId },
    { enabled: isAdmin }
  );

  const months = (data?.months ?? []) as { month: number; revenue: number; netProfit: number; hasData: boolean }[];
  // 기록이 처음 나온 달부터 12월까지만 보여준다
  const firstIdx = months.findIndex(m => m.hasData);
  const shown = firstIdx === -1 ? [] : months.slice(firstIdx);
  const totalRevenue = useMemo(() => months.reduce((s, m) => s + m.revenue, 0), [months]);
  const totalNet = useMemo(() => months.reduce((s, m) => s + m.netProfit, 0), [months]);
  const pct = (net: number, rev: number) => (rev > 0 ? (net / rev * 100).toFixed(1) + '%' : '-');

  if (authLoading) return <div className="flex items-center justify-center min-h-screen text-gray-500">로딩 중...</div>;
  if (!isAdmin) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">관리자만 볼 수 있습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate('/settlement')} className="text-gray-500 hover:text-gray-700" aria-label="뒤로">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">총 정산</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => year > 2026 && setYear(year - 1)}
              disabled={year <= 2026}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              aria-label="이전 해"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold text-gray-800">{year}년</p>
            <button
              type="button"
              onClick={() => year < thisYear && setYear(year + 1)}
              disabled={year >= thisYear}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              aria-label="다음 해"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ id: undefined as number | undefined, name: '전 지점' }, ...(branches as any[]).map((b: any) => ({ id: b.id as number | undefined, name: b.name as string }))].map(b => (
              <button
                key={String(b.id)}
                type="button"
                onClick={() => setBranchId(b.id)}
                className={`px-3 py-1.5 rounded-full text-xs border ${branchId === b.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-3 py-2 text-left font-medium">월</th>
                <th className="px-3 py-2 text-right font-medium">총매출</th>
                <th className="px-3 py-2 text-right font-medium">순수익</th>
                <th className="px-3 py-2 text-right font-medium">순수익률</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">불러오는 중...</td></tr>
              )}
              {!isLoading && shown.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">{year}년 기록이 없습니다.</td></tr>
              )}
              {shown.map(m => (
                <tr key={m.month} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">{m.month}월</td>
                  <td className="px-3 py-2 text-right text-gray-700">{m.hasData ? won(m.revenue) : '-'}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${!m.hasData ? 'text-gray-300' : m.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {m.hasData ? won(m.netProfit) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{m.hasData ? pct(m.netProfit, m.revenue) : '-'}</td>
                </tr>
              ))}
            </tbody>
            {shown.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td className="px-3 py-3 text-gray-800 whitespace-nowrap">{year}년 합계</td>
                  <td className="px-3 py-3 text-right text-gray-800">{won(totalRevenue)}</td>
                  <td className={`px-3 py-3 text-right ${totalNet >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{won(totalNet)}</td>
                  <td className="px-3 py-3 text-right text-xs text-gray-600">{pct(totalNet, totalRevenue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="text-xs text-gray-400">순수익은 점장 월말 추가인센이 입력된 달은 그 금액을 뺀 값입니다. 단위: 원</p>
      </div>
    </div>
  );
}
