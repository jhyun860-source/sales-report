import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { useLocation } from 'wouter';

const PRIMARY = '#8B0000';

export default function BranchSettings() {
  const { user, loading } = useStoreAuth();
  const [, navigate] = useLocation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  // 입력 폼 state
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [managerMonthlySalary, setManagerMonthlySalary] = useState(0);
  const [managerDailyWage, setManagerDailyWage] = useState(0);
  const [deputyMonthlySalary, setDeputyMonthlySalary] = useState(0);
  const [deputyDailyWage, setDeputyDailyWage] = useState(0);
  const [staffDailyWage, setStaffDailyWage] = useState(0);
  const [partTimeHourlyWage, setPartTimeHourlyWage] = useState(0);
  const [commissionRate, setCommissionRate] = useState(17);

  const { data: branches = [] } = trpc.storeSales.getBranches.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  const { data: allSettings = [], refetch } = trpc.branchSettings.getAll.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  const upsertMutation = trpc.branchSettings.upsert.useMutation({
    onSuccess: () => {
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // 지점 선택 시 해당 설정값 폼에 로드
  const loadBranchSettings = (branchId: number, settings: any[]) => {
    const s = settings.find((x: any) => Number(x.branchId) === Number(branchId));
    setMonthlyRent(Number(s?.monthlyRent ?? 0));
    setManagerMonthlySalary(Number(s?.managerMonthlySalary ?? 0));
    setManagerDailyWage(Number(s?.managerDailyWage ?? 0));
    setDeputyMonthlySalary(Number(s?.deputyMonthlySalary ?? 0));
    setDeputyDailyWage(Number(s?.deputyDailyWage ?? 0));
    setStaffDailyWage(Number(s?.staffDailyWage ?? 0));
    setPartTimeHourlyWage(Number(s?.partTimeHourlyWage ?? 0));
    setCommissionRate(Math.round(Number(s?.commissionRate ?? 0.17) * 100));
  };

  // 첫 지점 자동 선택
  useEffect(() => {
    if ((branches as any[]).length > 0 && !selectedBranchId) {
      const firstId = (branches as any[])[0].id;
      setSelectedBranchId(firstId);
    }
  }, [branches]);

  // allSettings 로드되거나 selectedBranchId 바뀌면 폼 업데이트
  useEffect(() => {
    if (selectedBranchId !== null && (allSettings as any[]).length > 0) {
      loadBranchSettings(selectedBranchId, allSettings as any[]);
    }
  }, [selectedBranchId, allSettings]);

  const handleBranchClick = (branchId: number) => {
    setSelectedBranchId(branchId);
    loadBranchSettings(branchId, allSettings as any[]);
  };

  const handleSave = () => {
    if (!selectedBranchId) return;
    upsertMutation.mutate({
      branchId: selectedBranchId,
      monthlyRent,
      managerMonthlySalary,
      managerDailyWage: managerMonthlySalary > 0 ? Math.round(managerMonthlySalary / 22) : managerDailyWage,
      deputyMonthlySalary,
      deputyDailyWage: deputyMonthlySalary > 0 ? Math.round(deputyMonthlySalary / 22) : deputyDailyWage,
      staffDailyWage,
      partTimeHourlyWage,
      commissionRate: commissionRate / 100,
    });
  };

  const computedManagerDaily = managerMonthlySalary > 0 ? Math.round(managerMonthlySalary / 22) : managerDailyWage;
  const computedDeputyDaily = deputyMonthlySalary > 0 ? Math.round(deputyMonthlySalary / 22) : deputyDailyWage;

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">로딩 중...</div>;
  if (!user || user.role !== 'admin') return <div className="flex items-center justify-center min-h-screen text-gray-500">관리자만 접근 가능합니다.</div>;

  const selectedBranch = (branches as any[]).find((b: any) => b.id === selectedBranchId);

  const inputClass = "flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right";

  // 콤마 포맷 입력 컴포넌트
  const MoneyInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const [focused, setFocused] = React.useState(false);
    return (
      <input
        type="text"
        inputMode="numeric"
        className={inputClass}
        value={focused ? (value === 0 ? '' : String(value)) : (value === 0 ? '' : value.toLocaleString())}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9]/g, '');
          onChange(parseInt(raw) || 0);
        }}
        placeholder="0"
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settlement')} className="text-gray-500 hover:text-gray-700">←</button>
          <h1 className="text-base font-bold text-gray-800">지점 설정</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={upsertMutation.isPending}
          className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg"
          style={{ background: saved ? '#22c55e' : PRIMARY }}
        >
          {saved ? '저장됨 ✓' : upsertMutation.isPending ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 지점 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">지점 선택</p>
          <div className="flex flex-wrap gap-2">
            {(branches as any[]).map((b: any) => (
              <button
                key={b.id}
                onClick={() => handleBranchClick(b.id)}
                className="px-3 py-1.5 text-sm rounded-lg font-medium border transition-all"
                style={{
                  background: selectedBranchId === b.id ? PRIMARY : 'white',
                  color: selectedBranchId === b.id ? 'white' : '#374151',
                  borderColor: selectedBranchId === b.id ? PRIMARY : '#e5e7eb',
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {selectedBranch && (
          <>
            {/* 임대료 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2">📌 임대료</h3>
              <div>
                <label className="text-xs text-gray-500">월 임대료</label>
                <div className="flex items-center gap-2 mt-1">
                  <MoneyInput value={monthlyRent} onChange={setMonthlyRent} />
                  <span className="text-xs text-gray-500">원</span>
                </div>
                <p className="text-xs text-blue-500 mt-1">→ 일 임대료: {monthlyRent > 0 ? `약 ${Math.round(monthlyRent / 26).toLocaleString()}원` : '-'} (해당 월 월~토 일수로 자동 계산)</p>
              </div>
            </div>

            {/* 인건비 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2">👥 인건비 설정</h3>

              {/* 점장 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">점장</p>
                <div>
                  <label className="text-xs text-gray-500">월급 (÷22일 자동계산)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <MoneyInput value={managerMonthlySalary} onChange={v => { setManagerMonthlySalary(v); setManagerDailyWage(0); }} />
                    <span className="text-xs text-gray-500">원/월</span>
                  </div>
                  {managerMonthlySalary > 0 && <p className="text-xs text-blue-500 mt-1">→ 일급: {computedManagerDaily.toLocaleString()}원</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500">일급 직접 입력</label>
                  <div className="flex items-center gap-2 mt-1">
                    <MoneyInput value={computedManagerDaily} onChange={v => { setManagerDailyWage(v); setManagerMonthlySalary(0); }} />
                    <span className="text-xs text-gray-500">원/일</span>
                  </div>
                </div>
              </div>

              {/* 매니저 */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600">매니저</p>
                <div>
                  <label className="text-xs text-gray-500">월급 (÷22일 자동계산)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <MoneyInput value={deputyMonthlySalary} onChange={v => { setDeputyMonthlySalary(v); setDeputyDailyWage(0); }} />
                    <span className="text-xs text-gray-500">원/월</span>
                  </div>
                  {deputyMonthlySalary > 0 && <p className="text-xs text-blue-500 mt-1">→ 일급: {computedDeputyDaily.toLocaleString()}원</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500">일급 직접 입력</label>
                  <div className="flex items-center gap-2 mt-1">
                    <MoneyInput value={computedDeputyDaily} onChange={v => { setDeputyDailyWage(v); setDeputyMonthlySalary(0); }} />
                    <span className="text-xs text-gray-500">원/일</span>
                  </div>
                </div>
              </div>

              {/* 여직원 */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600">여직원 일급</p>
                <div className="flex items-center gap-2">
                  <MoneyInput value={staffDailyWage} onChange={setStaffDailyWage} />
                  <span className="text-xs text-gray-500">원/일</span>
                </div>
              </div>

              {/* 알바 */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600">알바 시급</p>
                <div className="flex items-center gap-2">
                  <MoneyInput value={partTimeHourlyWage} onChange={setPartTimeHourlyWage} />
                  <span className="text-xs text-gray-500">원/시간</span>
                </div>
              </div>
            </div>

            {/* 수수료율 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2">💳 수수료율</h3>
              <div className="flex items-center gap-2 mt-3">
                <input type="number" step="1" min="0" max="100" value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value) || 0)} className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right" />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>

            {/* 요약 */}
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
              <h3 className="text-xs font-bold text-blue-700 mb-2">📋 {selectedBranch.name} 현재 설정</h3>
              <div className="space-y-1 text-xs text-blue-600">
                <div className="flex justify-between"><span>월 임대료</span><span>{monthlyRent.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>점장 일급</span><span>{computedManagerDaily.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>매니저 일급</span><span>{computedDeputyDaily.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>여직원 일급</span><span>{staffDailyWage.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>알바 시급</span><span>{partTimeHourlyWage.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>수수료율</span><span>{commissionRate}%</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
