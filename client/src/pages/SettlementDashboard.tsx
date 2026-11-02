import { useMemo } from 'react';
import { useLocation, useSearchParams as useWouterSearchParams } from 'wouter';
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
  const [location, navigate] = useLocation();
  const [searchParams, setSearchParams] = useWouterSearchParams();

  const { user, loading: authLoading, logout } = useStoreAuth();
  const today = getTodayString();
  const { year: todayYear, month: todayMonth } = getYearMonth(today);

  // 🌟 URL을 Single Source of Truth로 사용 (로컬 상태 제거)
  const selectedYear = searchParams.get('year') ? Number(searchParams.get('year')) : todayYear;
  const selectedMonth = searchParams.get('month') ? Number(searchParams.get('month')) : todayMonth;
  const urlBranchId = searchParams.get('branchId') ? Number(searchParams.get('branchId')) : null;

  const { data: branches = [] } = trpc.storeSales.getBranches.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  // URL에 유효한 branchId가 없으면 첫 번째 지점 사용
  const selectedBranchId = useMemo(() => {
    if (urlBranchId !== null) {
      const isValid = branches.some(b => Number(b.id) === Number(urlBranchId));
      if (isValid) return urlBranchId;
    }
    return branches && branches.length > 0 ? branches[0].id : null;
  }, [urlBranchId, branches]);

  // 상태 업데이트 헬퍼 함수
  const updateYear = (year: number) => {
    setSearchParams(prev => {
      prev.set('year', String(year));
      return prev;
    }, { replace: true });
  };

  const updateMonth = (month: number) => {
    setSearchParams(prev => {
      prev.set('month', String(month));
      return prev;
    }, { replace: true });
  };

  const updateBranchId = (branchId: number) => {
    setSearchParams(prev => {
      prev.set('branchId', String(branchId));
      return prev;
    }, { replace: true });
  };

  // 전 지점 이번 달 누적 순수익 (1일 ~ 오늘)
  const monthToDateStart = `${todayYear}-${String(todayMonth).padStart(2, '0')}-01`;
  const { data: allBranchesToday = [] } = trpc.settlement.getAllBranchesMonthToDate.useQuery(
    { startDate: monthToDateStart, endDate: today, yearMonth: `${todayYear}-${String(todayMonth).padStart(2, '0')}` },
    { enabled: !!user && user.role === 'admin' }
  );
  // 지난 달 전체 (말일까지) — 월별로 나눠서 보여주기 위함
  const prevYM = moveMonth(todayYear, todayMonth, -1);
  const prevYearMonth = `${prevYM.year}-${String(prevYM.month).padStart(2, '0')}`;
  const prevLastDay = new Date(prevYM.year, prevYM.month, 0).getDate();
  const { data: allBranchesPrev = [] } = trpc.settlement.getAllBranchesMonthToDate.useQuery(
    { startDate: `${prevYearMonth}-01`, endDate: `${prevYearMonth}-${String(prevLastDay).padStart(2, '0')}`, yearMonth: prevYearMonth },
    { enabled: !!user && user.role === 'admin' }
  );

  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date(selectedYear, selectedMonth, 0).getDate()}`;

  const { data: settlements = [], isLoading: settlementsLoading } = trpc.settlement.getSettlementsByDateRange.useQuery(
    { branchId: selectedBranchId!, startDate, endDate },
    { enabled: !!user && user.role === 'admin' && selectedBranchId !== null }
  );

  // 점장 월말 추가인센 (월 요약의 관리자 인건비에 합산)
  const yearMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const { data: bonusData, refetch: refetchBonus } = trpc.settlement.getManagerBonus.useQuery(
    { branchId: selectedBranchId!, yearMonth: yearMonthStr },
    { enabled: !!user && user.role === 'admin' && selectedBranchId !== null }
  );
  const managerBonus = Number(bonusData?.amount ?? 0);
  const setBonusMutation = trpc.settlement.setManagerBonus.useMutation({
    onSuccess: () => { refetchBonus(); },
    onError: () => { window.alert('저장에 실패했습니다. 다시 시도해주세요.'); },
  });
  const handleEditBonus = () => {
    if (selectedBranchId === null) return;
    const input = window.prompt(`${selectedMonth}월 점장 추가인센 금액(원)을 입력하세요. 0을 입력하면 삭제됩니다.`, String(managerBonus));
    if (input === null) return;
    const amount = Number(input.replace(/[^0-9]/g, ''));
    if (Number.isNaN(amount)) { window.alert('숫자만 입력해주세요.'); return; }
    setBonusMutation.mutate({ branchId: selectedBranchId, yearMonth: yearMonthStr, amount });
  };

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
          salesIncentiveExpense: '0',
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
      salesIncentiveExpense: acc.salesIncentiveExpense + Number(s.salesIncentiveExpense || 0),
      otherExpense: acc.otherExpense + Number(s.otherExpense || 0),
      totalExpenses: acc.totalExpenses + Number(s.totalExpenses || 0),
      netProfit: acc.netProfit + Number(s.netProfit || 0),
    }), {
      totalRevenue: 0, commissionExpense: 0, rentExpense: 0, managementFeeExpense: 0,
      staffWageExpense: 0, managerWageExpense: 0, partTimeWageExpense: 0,
      liquorCostExpense: 0, staffDrinkExpense: 0, salesIncentiveExpense: 0, otherExpense: 0, totalExpenses: 0, netProfit: 0,
    });
  }, [settlements]);

  // 월 요약 카드용: 점장 추가인센을 관리자 인건비·총지출·순수익에 반영 (일별 표는 그대로)
  const monthlyAdj = useMemo(() => ({
    ...monthlyTotal,
    managerWageExpense: monthlyTotal.managerWageExpense + managerBonus,
    totalExpenses: monthlyTotal.totalExpenses + managerBonus,
    netProfit: monthlyTotal.netProfit - managerBonus,
  }), [monthlyTotal, managerBonus]);

  const todayAllTotal = useMemo(() => {
    return (allBranchesToday as any[]).reduce((sum: number, b: any) => sum + Number(b.netProfit || 0), 0);
  }, [allBranchesToday]);
  const todayAllRevenue = useMemo(() => {
    return (allBranchesToday as any[]).reduce((sum: number, b: any) => sum + Number(b.totalRevenue || 0), 0);
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
        {[
          { title: `${todayMonth}월 1일 ~ ${Number(today.split('-')[2])}일 전 지점 누적 순수익`, rows: allBranchesToday as any[] },
          { title: `${prevYM.month}월 1일 ~ ${prevLastDay}일 전 지점 누적 순수익`, rows: allBranchesPrev as any[] },
        ].map(block => {
          const total = block.rows.reduce((sum: number, b: any) => sum + Number(b.netProfit || 0), 0);
          const revenue = block.rows.reduce((sum: number, b: any) => sum + Number(b.totalRevenue || 0), 0);
          return (
            <div key={block.title} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-3">{block.title}</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {block.rows.map((b: any) => (
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
                <span className={`text-base font-bold ${total >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                  {formatWonFull(total)}
                  {revenue > 0 && (
                    <span className="text-xs font-normal text-gray-500 ml-1">({(total / revenue * 100).toFixed(1)}%)</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">지점 선택</p>
          <div className="flex flex-wrap gap-2">
            {(branches as any[]).map((b: any) => (
              <button
                key={b.id}
                onClick={() => updateBranchId(b.id)}
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
              onClick={() => { const {year: y, month: m} = moveMonth(selectedYear, selectedMonth, -1); updateYear(y); updateMonth(m); }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-sm font-bold text-gray-800">
              {selectedYear}년 {selectedMonth}월 — {selectedBranch?.name || ''}
            </h2>
            <button
              onClick={() => { const {year: y, month: m} = moveMonth(selectedYear, selectedMonth, 1); updateYear(y); updateMonth(m); }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">월 총매출</p>
              <p className="text-sm font-bold text-gray-800">{formatWonFull(monthlyAdj.totalRevenue)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">월 총지출</p>
              <p className="text-sm font-bold text-gray-700">{formatWonFull(monthlyAdj.totalExpenses)}</p>
              {monthlyAdj.totalRevenue > 0 && <p className="text-xs text-gray-400">{(monthlyAdj.totalExpenses / monthlyAdj.totalRevenue * 100).toFixed(1)}%</p>}
            </div>
            <div className={`rounded-lg p-3 ${monthlyAdj.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-500">월 순수익</p>
              <p className={`text-sm font-bold ${monthlyAdj.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {formatWonFull(monthlyAdj.netProfit)}
              </p>
              {monthlyAdj.totalRevenue > 0 && <p className={`text-xs ${monthlyAdj.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{(monthlyAdj.netProfit / monthlyAdj.totalRevenue * 100).toFixed(1)}%</p>}
            </div>
          </div>

          <div className="space-y-1 text-sm border-t border-gray-100 pt-3">
            {[
              { label: '수수료/주방', value: monthlyAdj.commissionExpense },
              { label: '임대료', value: monthlyAdj.rentExpense + monthlyAdj.managementFeeExpense },
              { label: '관리자 인건비', value: monthlyAdj.managerWageExpense, bonus: true },
              { label: '여직원 인건비', value: monthlyAdj.staffWageExpense },
              { label: '알바 인건비', value: monthlyAdj.partTimeWageExpense },
              { label: '주류단가', value: monthlyAdj.liquorCostExpense },
              { label: '추가인센', value: monthlyAdj.staffDrinkExpense },
              { label: '영업인센', value: monthlyAdj.salesIncentiveExpense },
              { label: '총지출(기타)', value: monthlyAdj.otherExpense },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-gray-600">
                <span>
                  {item.label}
                  {(item as any).bonus && (
                    <button
                      type="button"
                      onClick={handleEditBonus}
                      className="ml-2 px-1.5 py-0.5 rounded border border-gray-300 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      {managerBonus > 0 ? `점장인센 ${managerBonus.toLocaleString()}원 포함 · 수정` : '점장인센 입력'}
                    </button>
                  )}
                </span>
                <span>
                  {formatWonFull(item.value)}
                  {monthlyAdj.totalRevenue > 0 && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({(item.value / monthlyAdj.totalRevenue * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            ))}
            {(
              <div className="flex justify-between text-gray-800 font-bold border-t border-gray-200 pt-2 mt-1">
                <span>총 지출</span>
                <span>
                  {formatWonFull(monthlyAdj.totalExpenses)}
                  {monthlyAdj.totalRevenue > 0 && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({(monthlyAdj.totalExpenses / monthlyAdj.totalRevenue * 100).toFixed(1)}%)
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
                    <th className="px-2 py-2 text-left text-gray-500 font-medium whitespace-nowrap sticky left-0 z-10 bg-gray-50">날짜</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">총매출</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">세금17%</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">임대료</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">인건비+인센</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">주류</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">당일지출</th>
                    <th className="px-2 py-2 text-right font-bold text-gray-700 whitespace-nowrap">순수익</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap">수익률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(allDaysSettlements as any[]).map((s: any) => {
                    const net = Number(s.netProfit || 0);
                    const rev = Number(s.totalRevenue || 0);
                    const totalWage = Number(s.staffWageExpense || 0) + Number(s.managerWageExpense || 0) + Number(s.partTimeWageExpense || 0) + Number(s.staffDrinkExpense || 0) + Number(s.salesIncentiveExpense || 0);
                    const liquor = Number(s.liquorCostExpense || 0);
                    return (
                      <tr key={s.date} className={`group hover:bg-gray-50 ${(s as any)._empty ? 'opacity-40' : ''}` }>
                        <td className="px-2 py-2 text-gray-700 whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-gray-50">{s.date?.slice(5)} ({getDayOfWeek(s.date)})</td>
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
                        <td className="px-2 py-2 text-right text-gray-500 whitespace-nowrap">{formatWon(Number(s.otherExpense || 0))}</td>
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
                    <td className="px-3 py-2 font-bold text-gray-700 whitespace-nowrap sticky left-0 z-10 bg-gray-50">합계</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-700">{formatWon(monthlyTotal.totalRevenue)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.commissionExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.rentExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.staffWageExpense + monthlyTotal.managerWageExpense + monthlyTotal.partTimeWageExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.liquorCostExpense)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-600">{formatWon(monthlyTotal.otherExpense)}</td>
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
