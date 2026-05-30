/**
 * 정산 관리 대시보드
 * 지점별 손익 관리 및 순수익 분석
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { ChevronLeft, ChevronRight, Settings, LogOut, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatCurrency(value: number): string {
  if (value === 0) return '—';
  return `₩${value.toLocaleString('ko-KR')}`;
}

export default function SettlementDashboard() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useStoreAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(getTodayString());
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  // 모든 지점 조회
  const { data: branches = [], isLoading: branchesLoading } = trpc.storeAccount.branchList.useQuery(
    {},
    { enabled: !!user }
  );

  // 기본값: 첫 번째 지점 선택
  const effectiveBranchId = selectedBranchId || (branches.length > 0 ? branches[0].id : null);

  // 오늘 순수익 조회
  const { data: todayProfit } = trpc.settlement.getTodayNetProfit.useQuery(
    { branchId: effectiveBranchId! },
    { enabled: !!effectiveBranchId }
  );

  // 이번 달 누적 순수익 조회
  const { data: monthlyProfit } = trpc.settlement.getMonthlyNetProfit.useQuery(
    { branchId: effectiveBranchId! },
    { enabled: !!effectiveBranchId }
  );

  // 일별 정산 조회
  const { data: dailySettlement } = trpc.settlement.getDailySettlement.useQuery(
    { branchId: effectiveBranchId!, date: currentDate },
    { enabled: !!effectiveBranchId }
  );

  // 월 누적 현황 조회
  const today = new Date();
  const { data: monthlySummary } = trpc.settlement.getMonthlySummary.useQuery(
    { branchId: effectiveBranchId!, year: today.getFullYear(), month: today.getMonth() + 1 },
    { enabled: !!effectiveBranchId }
  );

  // 기간별 정산 조회
  const getDateRange = () => {
    const end = new Date(currentDate);
    let start = new Date(end);

    if (filterType === 'today') {
      start = new Date(end);
    } else if (filterType === 'week') {
      start.setDate(end.getDate() - 6);
    } else if (filterType === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    }

    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = currentDate;

    return { startStr, endStr };
  };

  const dateRange = getDateRange();
  const { data: settlementsByRange = [] } = trpc.settlement.getSettlementsByDateRange.useQuery(
    { branchId: effectiveBranchId!, startDate: dateRange.startStr, endDate: dateRange.endStr },
    { enabled: !!effectiveBranchId }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <div className="text-sm" style={{ color: 'oklch(0.45 0.01 50)' }}>불러오는 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <p className="text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>로그인이 필요합니다</p>
        <Button onClick={() => navigate('/login')}>로그인</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.985 0.008 85)' }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'oklch(0.98 0.01 85)', borderColor: 'oklch(0.7 0.015 85)', boxShadow: '0 1px 4px oklch(0 0 0 / 0.08)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
            정산 관리 대시보드
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.45 0.18 25)', border: '1px solid oklch(0.75 0.015 85)' }}
          >
            <LogOut size={15} />
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        {/* 지점 선택 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'oklch(0.25 0.01 50)' }}>
            지점 선택
          </label>
          <Select
            value={effectiveBranchId?.toString() || ''}
            onValueChange={(value) => setSelectedBranchId(Number(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="지점을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 오늘/이번달 순수익 카드 */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Card className="p-4" style={{ background: 'oklch(0.45 0.18 25)', color: 'white' }}>
            <div className="text-xs font-semibold mb-2 opacity-80">오늘 순수익</div>
            <div className="text-2xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(todayProfit?.netProfit || 0)}
            </div>
          </Card>
          <Card className="p-4" style={{ background: 'oklch(0.45 0.18 25)', color: 'white' }}>
            <div className="text-xs font-semibold mb-2 opacity-80">{today.getMonth() + 1}월 누적순수익</div>
            <div className="text-2xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(monthlyProfit?.netProfit || 0)}
            </div>
          </Card>
        </div>

        {/* 날짜 필터 및 네비게이터 */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() - 1);
                if (d.getDay() === 0) d.setDate(d.getDate() - 1);
                setCurrentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
              }}
              className="p-2 rounded-full hover:bg-black/8 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center min-w-[120px]">
              <div className="text-sm font-semibold" style={{ color: 'oklch(0.25 0.01 50)' }}>
                {new Date(currentDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </div>
            </div>
            <button
              onClick={() => {
                const d = new Date(currentDate);
                d.setDate(d.getDate() + 1);
                if (d.getDay() === 0) d.setDate(d.getDate() + 1);
                setCurrentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
              }}
              className="p-2 rounded-full hover:bg-black/8 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {['today', 'week', 'month'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filterType === type
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={
                  filterType === type
                    ? { background: 'oklch(0.45 0.18 25)' }
                    : { background: 'oklch(0.92 0.015 85)' }
                }
              >
                {type === 'today' ? '오늘' : type === 'week' ? '이번주' : '이번달'}
              </button>
            ))}
          </div>
        </div>

        {/* 일별 정산표 */}
        {dailySettlement && (
          <Card className="mb-5 p-4">
            <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
              ■ 일별 정산 ({currentDate})
            </h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span style={{ color: 'oklch(0.45 0.01 50)' }}>총매출</span>
                  <div className="font-bold text-lg" style={{ color: 'oklch(0.12 0.01 50)' }}>
                    {formatCurrency(Number(dailySettlement.totalRevenue || 0))}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'oklch(0.45 0.01 50)' }}>순수익</span>
                  <div className="font-bold text-lg" style={{ color: 'oklch(0.45 0.18 25)' }}>
                    {formatCurrency(Number(dailySettlement.netProfit || 0))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 mt-3" style={{ borderColor: 'oklch(0.82 0.01 85)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'oklch(0.35 0.01 50)' }}>
                  비용 내역
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>수수료/주방</span>
                    <span>{formatCurrency(Number(dailySettlement.commissionExpense || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>임대료</span>
                    <span>{formatCurrency(Number(dailySettlement.rentExpense || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>관리비</span>
                    <span>{formatCurrency(Number(dailySettlement.managementFeeExpense || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>여직원 ({dailySettlement.staffCount}명)</span>
                    <span>{formatCurrency(Number(dailySettlement.staffWageExpense || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>여알바 ({dailySettlement.partTimeCount}명)</span>
                    <span>{formatCurrency(Number(dailySettlement.partTimeWageExpense || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>주류/단가</span>
                    <span>{formatCurrency(Number(dailySettlement.liquorCostExpense || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>스탭음료</span>
                    <span>{formatCurrency(Number(dailySettlement.staffDrinkExpense || 0))}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1" style={{ borderColor: 'oklch(0.82 0.01 85)' }}>
                    <span className="font-semibold">총 지출</span>
                    <span className="font-semibold">{formatCurrency(Number(dailySettlement.totalExpenses || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 월 누적 현황 */}
        {monthlySummary && (
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
              ■ {today.getMonth() + 1}월 누적 현황
            </h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span style={{ color: 'oklch(0.45 0.01 50)' }}>누적 총매출</span>
                  <div className="font-bold" style={{ color: 'oklch(0.12 0.01 50)' }}>
                    {formatCurrency(monthlySummary.totalRevenue)}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'oklch(0.45 0.01 50)' }}>누적 순수익</span>
                  <div className="font-bold" style={{ color: 'oklch(0.45 0.18 25)' }}>
                    {formatCurrency(monthlySummary.netProfit)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3" style={{ borderColor: 'oklch(0.82 0.01 85)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'oklch(0.35 0.01 50)' }}>
                  비용 비율
                </div>
                <div className="space-y-1 text-xs">
                  {[
                    { label: '수수료/주방', value: monthlySummary.commissionExpense, ratio: monthlySummary.ratios.commission },
                    { label: '임대료', value: monthlySummary.rentExpense, ratio: monthlySummary.ratios.rent },
                    { label: '관리비', value: monthlySummary.managementFeeExpense, ratio: monthlySummary.ratios.managementFee },
                    { label: '여직원', value: monthlySummary.staffWageExpense, ratio: monthlySummary.ratios.staffWage },
                    { label: '여알바', value: monthlySummary.partTimeWageExpense, ratio: monthlySummary.ratios.partTimeWage },
                    { label: '주류/단가', value: monthlySummary.liquorCostExpense, ratio: monthlySummary.ratios.liquorCost },
                    { label: '스탭음료', value: monthlySummary.staffDrinkExpense, ratio: monthlySummary.ratios.staffDrink },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span>{item.label}</span>
                      <span>
                        {formatCurrency(item.value)} ({item.ratio}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
