import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { useSearchParams } from 'wouter';
import { Button } from '@/components/ui/button';

const inputClass = "flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right";

// MoneyInput을 컴포넌트 밖에 선언 - 안에 있으면 매 렌더마다 재생성되어 커서 튐
function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = React.useState(value === 0 ? '' : value.toLocaleString());
  React.useEffect(() => {
    setDisplay(value === 0 ? '' : value.toLocaleString());
  }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      className={inputClass}
      value={display}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setDisplay(raw === '' ? '' : parseInt(raw).toLocaleString());
        onChange(parseInt(raw) || 0);
      }}
      placeholder="0"
    />
  );
}

// Toast 컴포넌트
function Toast({ message, type, visible }: { message: string; type: 'success' | 'error'; visible: boolean }) {
  if (!visible) return null;
  
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? '✅' : '❌';
  
  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300`}>
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
}

export default function BranchSettings() {
  const { user, loading: authLoading } = useStoreAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBranchId = searchParams.get('branchId') ? Number(searchParams.get('branchId')) : null;
  const selectedBranchId = urlBranchId;

  // 지점 목록 조회 (인증 완료 후에만 실행)
  const { data: branches = [] } = trpc.branch.list.useQuery(undefined, {
    enabled: !authLoading && !!user,
  });

  // 지점 설정 조회 (인증 완료 후에만 실행)
  const { data: allSettings = [] } = trpc.branchSettings.getAll.useQuery(undefined, {
    enabled: !authLoading && !!user,
  });

  // 상태 선언
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [managerMonthlySalary, setManagerMonthlySalary] = useState(0);
  const [managerDailyWage, setManagerDailyWage] = useState(0);
  const [deputyMonthlySalary, setDeputyMonthlySalary] = useState(0);
  const [deputyDailyWage, setDeputyDailyWage] = useState(0);
  const [staffMonthlySalary, setStaffMonthlySalary] = useState(0);
  const [staffDailyWage, setStaffDailyWage] = useState(0);
  const [partTimeHourlyWage, setPartTimeHourlyWage] = useState(0);
  const [monthlyFixedExpense, setMonthlyFixedExpense] = useState(0);
  const [commissionRate, setCommissionRate] = useState(17);
  const [workType, setWorkType] = useState<'MON_FRI' | 'MON_SAT'>('MON_FRI');
  
  // Toast 상태
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);

  // 설정값 초기화 헬퍼 함수
  const resetSettings = () => {
    setMonthlyRent(0);
    setManagerMonthlySalary(0);
    setManagerDailyWage(0);
    setDeputyMonthlySalary(0);
    setDeputyDailyWage(0);
    setStaffMonthlySalary(0);
    setStaffDailyWage(0);
    setPartTimeHourlyWage(0);
    setMonthlyFixedExpense(0);
    setCommissionRate(17);
    setWorkType('MON_FRI');
  };

  // 지점 설정 로드 함수
  const loadBranchSettings = (branchId: number, settings: any[]) => {
    // 🛡️ 방어 가드: settings가 배열이 아니면 모든 값 초기화
    if (!Array.isArray(settings)) {
      resetSettings();
      return;
    }

    const s = settings.find((x: any) => Number(x.branchId) === Number(branchId));
    
    if (s) {
      // 설정이 있으면 로드
      setMonthlyRent(Number(s?.monthlyRent ?? 0));
      setManagerMonthlySalary(Number(s?.managerMonthlySalary ?? 0));
      setManagerDailyWage(Number(s?.managerDailyWage ?? 0));
      setDeputyMonthlySalary(Number(s?.deputyMonthlySalary ?? 0));
      setDeputyDailyWage(Number(s?.deputyDailyWage ?? 0));
      setStaffMonthlySalary(Number(s?.staffMonthlySalary ?? 0));
      setStaffDailyWage(Number(s?.staffDailyWage ?? 0));
      setPartTimeHourlyWage(Number(s?.partTimeHourlyWage ?? 0));
      setMonthlyFixedExpense(Number(s?.monthlyFixedExpense ?? 0));
      setCommissionRate(Math.round(Number(s?.commissionRate ?? 0.17) * 100));
      setWorkType((s?.workType ?? 'MON_FRI') as 'MON_FRI' | 'MON_SAT');
    } else {
      // 설정이 없으면 모든 값을 0으로 초기화
      resetSettings();
    }
  };

  // URL 파라미터가 없으면 첫 지점으로 자동 설정
  useEffect(() => {
    const safeBranches = Array.isArray(branches) ? branches : [];
    if (safeBranches.length > 0 && urlBranchId === null) {
      const firstId = safeBranches[0].id;
      // 🛡️ 불변성 유지: searchParams 상태에서 새로운 인스턴스 생성
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('branchId', String(firstId));
      setSearchParams(nextParams, { replace: true });
    }
  }, [branches, urlBranchId, searchParams, setSearchParams]);

  // selectedBranchId가 변경되면 설정값 로드
  useEffect(() => {
    // 🛡️ 방어 가드: selectedBranchId가 null이거나 allSettings가 없으면 무시
    if (selectedBranchId && Array.isArray(allSettings)) {
      loadBranchSettings(selectedBranchId, allSettings);
    }
  }, [selectedBranchId, allSettings]);

  // Mutation
  const utils = trpc.useUtils();
  const upsertMutation = trpc.branchSettings.upsert.useMutation({
    onSuccess: async () => {
      // 저장 성공 시, 모든 설정 데이터를 다시 불러옴
      await utils.branchSettings.getAll.invalidate();
      
      // Toast 표시
      setToastMessage('✅ 저장됨');
      setToastType('success');
      setShowToast(true);
      
      // 2초 후 자동 닫기
      setTimeout(() => {
        setShowToast(false);
      }, 2000);
    },
    onError: (error) => {
      // Toast 표시
      setToastMessage(`❌ 저장 실패: ${error.message}`);
      setToastType('error');
      setShowToast(true);
      
      // 3초 후 자동 닫기
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    },
  });

  const handleSave = () => {
    // 🛡️ 방어 가드: selectedBranchId가 null이면 조기 반환
    if (!selectedBranchId) return;
    upsertMutation.mutate({
      branchId: selectedBranchId,
      monthlyRent,
      managerMonthlySalary,
      managerDailyWage: managerMonthlySalary > 0 ? Math.round(managerMonthlySalary / (workType === 'MON_SAT' ? 26 : 22)) : managerDailyWage,
      deputyMonthlySalary,
      deputyDailyWage: deputyMonthlySalary > 0 ? Math.round(deputyMonthlySalary / (workType === 'MON_SAT' ? 26 : 22)) : deputyDailyWage,
      staffMonthlySalary,
      staffDailyWage: staffMonthlySalary > 0 ? Math.round(staffMonthlySalary / 22) : staffDailyWage,
      partTimeHourlyWage,
      monthlyFixedExpense,
      commissionRate: commissionRate / 100,
      workType,
    });
  };

  const computedManagerDaily = managerMonthlySalary > 0 ? Math.round(managerMonthlySalary / (workType === 'MON_SAT' ? 26 : 22)) : managerDailyWage;
  const computedDeputyDaily = deputyMonthlySalary > 0 ? Math.round(deputyMonthlySalary / (workType === 'MON_SAT' ? 26 : 22)) : deputyDailyWage;
  const computedStaffDaily = staffMonthlySalary > 0 ? Math.round(staffMonthlySalary / 22) : staffDailyWage;

  if (authLoading) return <div className="flex items-center justify-center min-h-screen text-gray-500">로딩 중...</div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen text-gray-500">로그인이 필요합니다.</div>;
  if (user.role !== 'admin') return <div className="flex items-center justify-center min-h-screen text-gray-500">관리자만 접근 가능합니다. (현재 역할: {user.role})</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toast message={toastMessage} type={toastType} visible={showToast} />
      
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">지점 설정</h1>

          {/* 지점 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">지점 선택</label>
            <select
              value={selectedBranchId ?? ''}
              onChange={(e) => {
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set('branchId', e.target.value);
                setSearchParams(nextParams);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            >
              {Array.isArray(branches) && branches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* 월 임대료 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">월 임대료</label>
            <div className="flex items-center gap-2">
              <MoneyInput value={monthlyRent} onChange={setMonthlyRent} />
              <span className="text-sm text-gray-500">원/월</span>
            </div>
          </div>

          {/* 근무형태 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">근무형태</label>
            <div className="flex gap-2">
              <button
                onClick={() => setWorkType('MON_FRI')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  workType === 'MON_FRI'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                월~금 (22일)
              </button>
              <button
                onClick={() => setWorkType('MON_SAT')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  workType === 'MON_SAT'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                월~토 (26일)
              </button>
            </div>
          </div>

          {/* 인건비 설정 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">인건비 설정</h2>

            {/* 점장 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">점장</label>
              <div className="mb-2">
                <label className="text-xs text-gray-600">월급 (÷{workType === 'MON_SAT' ? 26 : 22}일 자동계산)</label>
                <div className="flex items-center gap-2 mt-1">
                  <MoneyInput value={managerMonthlySalary} onChange={setManagerMonthlySalary} />
                  <span className="text-sm text-gray-500">원/월</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">→ 일급: {computedManagerDaily.toLocaleString()}원 ({workType === 'MON_SAT' ? '월~토' : '월~금'})</div>
              </div>
              <div>
                <label className="text-xs text-gray-600">일급 직접 입력</label>
                <div className="flex items-center gap-2 mt-1">
                  <MoneyInput value={managerDailyWage} onChange={setManagerDailyWage} />
                  <span className="text-sm text-gray-500">원/일</span>
                </div>
              </div>
            </div>

            {/* 매니저 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">매니저</label>
              <div className="mb-2">
                <label className="text-xs text-gray-600">월급 (÷{workType === 'MON_SAT' ? 26 : 22}일 자동계산)</label>
                <div className="flex items-center gap-2 mt-1">
                  <MoneyInput value={deputyMonthlySalary} onChange={setDeputyMonthlySalary} />
                  <span className="text-sm text-gray-500">원/월</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">→ 일급: {computedDeputyDaily.toLocaleString()}원 ({workType === 'MON_SAT' ? '월~토' : '월~금'})</div>
              </div>
              <div>
                <label className="text-xs text-gray-600">일급 직접 입력</label>
                <div className="flex items-center gap-2 mt-1">
                  <MoneyInput value={deputyDailyWage} onChange={setDeputyDailyWage} />
                  <span className="text-sm text-gray-500">원/일</span>
                </div>
              </div>
            </div>

            {/* 여직원 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">여직원</label>
              <div className="mb-2">
                <label className="text-xs text-gray-600">월급 (÷22일 자동계산)</label>
                <div className="flex items-center gap-2 mt-1">
                  <MoneyInput value={staffMonthlySalary} onChange={setStaffMonthlySalary} />
                  <span className="text-sm text-gray-500">원/월</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">→ 일급: {computedStaffDaily.toLocaleString()}원</div>
              </div>
              <div>
                <label className="text-xs text-gray-600">일급 직접 입력</label>
                <div className="flex items-center gap-2 mt-1">
                  <MoneyInput value={staffDailyWage} onChange={setStaffDailyWage} />
                  <span className="text-sm text-gray-500">원/일</span>
                </div>
              </div>
            </div>

            {/* 알바 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">알바</label>
              <label className="text-xs text-gray-600">시급</label>
              <div className="flex items-center gap-2 mt-1">
                <MoneyInput value={partTimeHourlyWage} onChange={setPartTimeHourlyWage} />
                <span className="text-sm text-gray-500">원/시간</span>
              </div>
            </div>

            {/* 기타 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">기타</label>
              <div className="mb-2">
                <label className="text-xs text-gray-600">월 고정비</label>
                <div className="flex items-center gap-2 mt-1">
                  <MoneyInput value={monthlyFixedExpense} onChange={setMonthlyFixedExpense} />
                  <span className="text-sm text-gray-500">원/월</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">수수료율</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className={inputClass}
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              {upsertMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
