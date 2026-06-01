/**
 * 정산 대시보드
 * - 관리자 전용
 * - 지점별 일별 순수익 및 월 누적 현황
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { getTodayString } from '@/lib/salesUtils';

function getYearMonth(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y, month: m };
}

function moveMonth(year: number, month: number, delta: number) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  return { year: y, month: m };
}

function formatWon(n: number) {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  const formatted = abs >= 10000
    ? Math.round(abs / 1000) + '\ucc9c'
    : abs.toLocaleString();
  return (n < 0 ? '-' : '') + formatted;
}

function formatWonFull(n: number) {
  return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString() + '\uc6d0';
}

export default function SettlementDashboard() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useStoreAuth();
  const today = getTodayString();
  const { year: todayYear, month: todayMonth } = getYearMonth(today);

  const [selectedYear, setSelectedYear] = useState(todayYear);
  const [selectedMonth, setSelectedMonth] = useState(todayMonth);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const { data: branches = [] } = trpc.storeSales.getBranches.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
    onSuccess: (data: { id: number; name: string }[]) => {
      if (data.length > 0 && selectedBranchId === null) {
        setSelectedBranchId(data[0].id);
      }
    },
  });

  const { data: allBranchesToday = [] } = trpc.settlement.getAllBranchesTodayNetProfit.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date(selectedYear, selectedMonth, 0).getDate()}`;

  const { data: settlements = [], isLoading: settlementsLoading } = trpc.settlement.getSettlementsByDateRange.useQuery(
    { branchId: selectedBranchId!, startDate, endDate },
    { enabled: !!user && user.role === 'admin' && selectedBranchId !== null }
  );

  const monthlyTotal = useMemo(() => {
    return (settlements as any[]).reduce((acc: any, s: any) => ({
      totalRevenue: acc.totalRevenue + Number(s.totalRevenue || 0),
      commissionExpense: acc.commissionExpense + Number(s.commissionExpense || 0),
      rentExpense: acc.rentExpense + Number(s.rentExpense || 0),
      managementFeeExpense: acc.managementFeeExpense + Number(s.managementFeeExpense || 0),
      staffWageExpense: acc.staffWageExpense + Number(s.staffWageExpense || 0),
      managerWageExpense: acc.managerWageExpense + Number(s.managerWageExpense || 0),
      partTimeWageExpense: acc.partTimeWageExpense + Number(s.partTimeWageExpense || 0),
      liquorCostExpense: acc.liquorCostExpense + Number(s.liquorCostExpense || 0),
      staffDrinkExpense: acc.staffDrinkExpense + Number(s.staffDrinkExpense || 0),
      otherExpense: acc.otherExpense + Number(s.otherExpense || 0),
      netProfit: acc.netProfit + Number(s.netProfit || 0),
    }), {
      totalRevenue: 0, commissionExpense: 0, rentExpense: 0, managementFeeExpense: 0,
      staffWageExpense: 0, managerWageExpense: 0, partTimeWageExpense: 0,
      liquorCostExpense: 0, staffDrinkExpense: 0, otherExpense: 0, netProfit: 0,
    });
  }, [settlements]);

  const todayAllTotal = useMemo(() => {
    return (allBranchesToday as any[]).reduce((sum: number, b: any) => sum + Number(b.netProfit || 0), 0);
  }, [allBranchesToday]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen text-gray-500">\ub85c\ub529 \uc911...</div>;
  if (!user || user.role !== 'admin') {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">\uad00\ub9ac\uc790\ub9cc \uc811\uadfc \uac00\ub2a5\ud569\ub2c8\ub2e4.</div>;
  }

  const selectedBranch = (branches as any[]).find((b: any) => b.id === selectedBranchId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">\uc815\uc0b0 \uad00\ub9ac</h1>
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <LogOut size={16} />
          \ub85c\uadf8\uc544\uc6c3
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-3">\uc624\ub298 \uc804 \uc9c0\uc810 \uc21c\uc218\uc775</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(allBranchesToday as any[]).map((b: any) => (
              <div key={b.branchId} className="text-center">
                <p className="text-xs text-gray-500">{b.branchName}</p>
                <p className={`text-sm font-bold ${Number(b.netProfit) >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                  {formatWon(Number(b.netProfit))}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">\ud569\uacc4</span>
            <span className={`text-base font-bold ${todayAllTotal >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {formatWonFull(todayAllTotal)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">\uc9c0\uc810 \uc120\ud0dd</p>
          <div className="flex flex-wrap gap-2">
            {(branches as any[]).map((b: any) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedBranchId === b.id
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => { const {year: y, month: m} = moveMonth(selectedYear, selectedMonth, -1); setSelectedYear(y); setSelectedMonth(m); }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-sm font-bold text-gray-800">
              {selectedYear}\ub144 {selectedMonth}\uc6d4 \u2014 {selectedBranch?.name || ''}
            </h2>
            <button
              onClick={() => { const {year: y, month: m} = moveMonth(selectedYear, selectedMonth, 1); setSelectedYear(y); setSelectedMonth(m); }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">\uc6d4 \uc2d9\ub9e4\uc635</p>
              <p className="text-base font-bold text-gray-800">{formatWonFull(monthlyTotal.totalRevenue)}</p>
            </div>
            <div className={`rounded-lg p-3 ${monthlyTotal.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-500">\uc6d4 \uc21c\uc218\uc775</p>
              <p className={`text-base font-bold ${monthlyTotal.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {formatWonFull(monthlyTotal.netProfit)}
              </p>
            </div>
          </div>

          <div className="space-y-1 text-sm border-t border-gray-100 pt-3">
            {[
              { label: '\uc218\uc218\ub8cc/\uc8fc\ubc29', value: monthlyTotal.commissionExpense },
              { label: '\uc784\ub300\ub8cc', value: monthlyTotal.rentExpense },
              { label: '\uad00\ub9ac\ube44', value: monthlyTotal.managementFeeExpense },
              { label: '\uc5ec\uc9c1\uc6d0 \uc778\uac74\ube44', value: monthlyTotal.staffWageExpense },
              { label: '\uc810\uc7a5 \uc778\uac74\ube44', value: monthlyTotal.managerWageExpense },
              { label: '\uc54c\ubc14 \uc778\uac74\ube44', value: monthlyTotal.partTimeWageExpense },
              { label: '\uc8fc\ub958\ub2e8\uac00', value: monthlyTotal.liquorCostExpense },
              { label: '\uc2a4\ud0ed\uc74c\ub8cc', value: monthlyTotal.staffDrinkExpense },
              { label: '\uae30\ud0c0', value: monthlyTotal.otherExpense },
            ].filter(item => item.value > 0).map(item => (
              <div key={item.label} className="flex justify-between text-gray-600">
                <span>{item.label}</span>
                <span>{formatWonFull(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">\uc77c\ubcc4 \uc815\uc0b0</h3>
          </div>
          {settlementsLoading ? (
            <div className="p-6 text-center text-gray-400 text-sm">\ubd88\ub7ec\uc624\ub294 \uc911...</div>
          ) : (settlements as any[]).length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">\ub370\uc774\ud130 \uc5c6\uc74c</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">\ub0a0\uc9dc</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">\uc2d9\ub9e4\uc635</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">\uc218\uc218\ub8cc</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">\uc784\ub300\ub8cc</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">\uc778\uac74\ube44</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium">\uc8fc\ub958</th>
                    <th className="px-2 py-2 text-right font-bold text-gray-700">\uc21c\uc218\uc775</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(settlements as any[]).map((s: any) => {
                    const net = Number(s.netProfit || 0);
                    const totalWage = Number(s.staffWageExpense || 0) + Number(s.managerWageExpense || 0) + Number(s.partTimeWageExpense || 0);
                    return (
                      <tr key={s.date} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{s.date?.slice(5)}</td>
                        <td className="px-2 py-2 text-right text-gray-600">{formatWon(Number(s.totalRevenue || 0))}</td>
                        <td className="px-2 py-2 text-right text-gray-500">{formatWon(Number(s.commissionExpense || 0))}</td>
                        <td className="px-2 py-2 text-right text-gray-500">{formatWon(Number(s.rentExpense || 0))}</td>
                        <td className="px-2 py-2 text-right text-gray-500">{formatWon(totalWage)}</td>
                        <td className="px-2 py-2 text-right text-gray-500">{formatWon(Number(s.liquorCostExpense || 0))}</td>
                        <td className={`px-2 py-2 text-right font-bold ${net >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          {formatWon(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-3 py-2 font-bold text-gray-700">\ud569\uacc4</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-700">{formatWon(monthlyTotal.totalRevenue)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.commissionExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.rentExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.staffWageExpense + monthlyTotal.managerWageExpense + monthlyTotal.partTimeWageExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.liquorCostExpense)}</td>
                    <td className={`px-2 py-2 text-right font-bold text-base ${monthlyTotal.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {formatWon(monthlyTotal.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
