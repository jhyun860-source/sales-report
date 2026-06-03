import { useState, useMemo, useEffect } from 'react';
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
  return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString();
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
function getDayOfWeek(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return DAYS[d.getDay()];
}

function formatWonFull(n: number) {
  return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString() + '원';
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
  });

  useEffect(() => {
    if (branches.length > 0 && selectedBranchId === null) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const { data: allBranchesToday = [] } = trpc.settlement.getAllBranchesTodayNetProfit.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date(selectedYear, selectedMonth, 0).getDate()}`;

  const { data: settlements = [], isLoading: settlementsLoading } = trpc.settlement.getSettlementsByDateRange.useQuery(
    { branchId: selectedBranchId!, startDate, endDate },
    { enabled: !!user && user.role === 'admin' && selectedBranchId !== null }
  );

  // 해당 월 전체 날짜 생성 (매출 0인 날도 포함)
  const allDaysSettlements = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const settlementMap = new Map((settlements as any[]).map((s: any) => [s.date, s]));
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
      if (dayOfWeek === 0) continue; // 일요일 제외
      if (settlementMap.has(dateStr)) {
        result.push(settlementMap.get(dateStr));
      } else {
        // DB에 없는 날 - 매출 없으면 전부 0으로 표시 (저장할 때만 정산 반영)
        const dailyRent = 0;
        const dailyMgmt = 0;
        const emptyTotalExpenses = 0;
        const emptyNetProfit = 0;
        result.push({
          date: dateStr,
          totalRevenue: '0',
          commissionExpense: '0',
          rentExpense: String(dailyRent),
          managementFeeExpense: String(dailyMgmt),
          staffWageExpense: '0',
          managerWageExpense: '0',
          partTimeWageExpense: '0',
          liquorCostExpense: '0',
          staffDrinkExpense: '0',
          otherExpense: '0',
          totalExpenses: String(emptyTotalExpenses),
          netProfit: String(emptyNetProfit),
          _empty: true,
        });
      }
    }
    return result.reverse(); // 최신 날짜 위로
  }, [settlements, selectedYear, selectedMonth]);

  const monthlyTotal = useMemo(() => {
    return (allDaysSettlements as any[]).reduce((acc: any, s: any) => ({
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
      totalExpenses: acc.totalExpenses + Number(s.totalExpenses || 0),
      netProfit: acc.netProfit + Number(s.netProfit || 0),
    }), {
      totalRevenue: 0, commissionExpense: 0, rentExpense: 0, managementFeeExpense: 0,
      staffWageExpense: 0, managerWageExpense: 0, partTimeWageExpense: 0,
      liquorCostExpense: 0, staffDrinkExpense: 0, otherExpense: 0, totalExpenses: 0, netProfit: 0,
    });
  }, [settlements]);

  const todayAllTotal = useMemo(() => {
    return (allBranchesToday as any[]).reduce((sum: number, b: any) => sum + Number(b.netProfit || 0), 0);
  }, [allBranchesToday]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen text-gray-500">로딩 중...</div>;
  if (!user || user.role !== 'admin') {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">관리자만 접근 가능합니다.</div>;
  }

  const selectedBranch = (branches as any[]).find((b: any) => b.id === selectedBranchId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">정산 관리</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/branch-settings')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            ⚙️ 설정
          </button>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <LogOut size={16} />로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-3">오늘 전 지점 순수익</p>
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
            <span className="text-xs text-gray-500">합계</span>
            <span className={`text-base font-bold ${todayAllTotal >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
              {formatWonFull(todayAllTotal)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">지점 선택</p>
          <div className="flex flex-wrap gap-2">
            {(branches as any[]).map((b: any) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedBranchId === b.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              {selectedYear}년 {selectedMonth}월 — {selectedBranch?.name || ''}
            </h2>
            <button
              onClick={() => { const {year: y, month: m} = moveMonth(selectedYear, selectedMonth, 1); setSelectedYear(y); setSelectedMonth(m); }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">월 총매출</p>
              <p className="text-sm font-bold text-gray-800">{formatWonFull(monthlyTotal.totalRevenue)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">월 총지출</p>
              <p className="text-sm font-bold text-gray-700">{formatWonFull(monthlyTotal.totalExpenses)}</p>
              {monthlyTotal.totalRevenue > 0 && <p className="text-xs text-gray-400">{(monthlyTotal.totalExpenses / monthlyTotal.totalRevenue * 100).toFixed(1)}%</p>}
            </div>
            <div className={`rounded-lg p-3 ${monthlyTotal.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-500">월 순수익</p>
              <p className={`text-sm font-bold ${monthlyTotal.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {formatWonFull(monthlyTotal.netProfit)}
              </p>
              {monthlyTotal.totalRevenue > 0 && <p className={`text-xs ${monthlyTotal.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{(monthlyTotal.netProfit / monthlyTotal.totalRevenue * 100).toFixed(1)}%</p>}
            </div>
          </div>

          <div className="space-y-1 text-sm border-t border-gray-100 pt-3">
            {[
              { label: '수수료/주방', value: monthlyTotal.commissionExpense },
              { label: '임대료', value: monthlyTotal.rentExpense + monthlyTotal.managementFeeExpense },
              { label: '여직원 인건비', value: monthlyTotal.staffWageExpense },
              { label: '관리자 인건비', value: monthlyTotal.managerWageExpense },
              { label: '알바 인건비', value: monthlyTotal.partTimeWageExpense },
              { label: '주류단가', value: monthlyTotal.liquorCostExpense },
              { label: '스탭음료', value: monthlyTotal.staffDrinkExpense },
              { label: '총지출(기타)', value: monthlyTotal.otherExpense },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-gray-600">
                <span>{item.label}</span>
                <span>
                  {formatWonFull(item.value)}
                  {monthlyTotal.totalRevenue > 0 && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({(item.value / monthlyTotal.totalRevenue * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            ))}
            {(
              <div className="flex justify-between text-gray-800 font-bold border-t border-gray-200 pt-2 mt-1">
                <span>총 지출</span>
                <span>
                  {formatWonFull(monthlyTotal.totalExpenses)}
                  {monthlyTotal.totalRevenue > 0 && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({(monthlyTotal.totalExpenses / monthlyTotal.totalRevenue * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">일별 정산</h3>
          </div>
          {settlementsLoading ? (
            <div className="p-6 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : (settlements as any[]).length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">데이터 없음</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: '700px' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-gray-500 font-medium whitespace-nowrap">날짜</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">총매출</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">세금17%</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">임대료</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">인건비+인센</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">주류</th>
                    <th className="px-2 py-2 text-right font-bold text-gray-700 whitespace-nowrap">순수익</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">수익률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(allDaysSettlements as any[]).map((s: any) => {
                    const net = Number(s.netProfit || 0);
                    const rev = Number(s.totalRevenue || 0);
                    const totalWage = Number(s.staffWageExpense || 0) + Number(s.managerWageExpense || 0) + Number(s.partTimeWageExpense || 0) + Number(s.staffDrinkExpense || 0);
                    const liquor = Number(s.liquorCostExpense || 0);
                    return (
                      <tr key={s.date} className={`hover:bg-gray-50 ${(s as any)._empty ? 'opacity-40' : ''}`}>
                        <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{s.date?.slice(5)} ({getDayOfWeek(s.date)})</td>
                        <td className="px-2 py-2 text-right text-gray-600 whitespace-nowrap">{formatWon(rev)}</td>
                        <td className="px-2 py-2 text-right text-gray-500 whitespace-nowrap">{formatWon(Number(s.commissionExpense || 0))}</td>
                        <td className="px-2 py-2 text-right text-gray-500 whitespace-nowrap">{formatWon(Number(s.rentExpense || 0))}</td>
                        <td className="px-2 py-2 text-right text-gray-500 whitespace-nowrap">
                          {formatWon(totalWage)}
                          {rev > 0 && totalWage > 0 && <span className="text-gray-400 ml-1">({(totalWage / rev * 100).toFixed(0)}%)</span>}
                        </td>
                        <td className="px-2 py-2 text-right text-gray-500 whitespace-nowrap">
                          {formatWon(liquor)}
                          {rev > 0 && liquor > 0 && <span className="text-gray-400 ml-1">({(liquor / rev * 100).toFixed(0)}%)</span>}
                        </td>
                        <td className={`px-2 py-2 text-right font-bold whitespace-nowrap ${net >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          {formatWon(net)}
                        </td>
                        <td className={`px-2 py-2 text-right whitespace-nowrap ${net >= 0 ? 'text-blue-500' : 'text-red-400'}`}>
                          {rev > 0 ? (net / rev * 100).toFixed(1) + '%' : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-3 py-2 font-bold text-gray-700">합계</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-700">{formatWon(monthlyTotal.totalRevenue)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.commissionExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.rentExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.staffWageExpense + monthlyTotal.managerWageExpense + monthlyTotal.partTimeWageExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.liquorCostExpense)}</td>
                    <td className={`px-2 py-2 text-right font-bold text-base ${monthlyTotal.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {formatWon(monthlyTotal.netProfit)}
                    </td>
                    <td className={`px-2 py-2 text-right font-bold text-sm ${monthlyTotal.netProfit >= 0 ? 'text-blue-500' : 'text-red-400'}`}>
                      {monthlyTotal.totalRevenue > 0 ? (monthlyTotal.netProfit / monthlyTotal.totalRevenue * 100).toFixed(1) + '%' : '-'}
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
