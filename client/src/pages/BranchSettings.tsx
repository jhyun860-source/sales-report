import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { useLocation } from 'wouter';

const PRIMARY = '#8B0000';

function formatNumber(n: number) {
  return n.toLocaleString();
}

function parseAmount(s: string) {
  return parseInt(s.replace(/,/g, '')) || 0;
}

// 숫자 입력 컴포넌트 - 콤마 포맷 지원
function NumberInput({ value, onChange, placeholder = '0' }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  const [display, setDisplay] = React.useState(value > 0 ? value.toLocaleString() : '');
  const prevValueRef = React.useRef(value);

  // 외부에서 value가 바뀌면 (지점 전환 등) display 강제 업데이트
  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setDisplay(value > 0 ? value.toLocaleString() : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d+$/.test(raw)) {
      const num = parseInt(raw) || 0;
      prevValueRef.current = num;
      setDisplay(num > 0 ? num.toLocaleString() : raw);
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right"
    />
  );
}

export default function BranchSettings() {
  const { user, loading } = useStoreAuth();
  const [, navigate] = useLocation();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: branches = [] } = trpc.storeSales.getBranches.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  const { data: allSettings = [], refetch } = trpc.branchSettings.getAll.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  const upsertMutation = trpc.branchSettings.upsert.useMutation({
    onSuccess: (data) => {
      setSaved(true);
      refetch();
      if (form.managerMonthlySalary > 0) {
        setForm(prev => ({ ...prev, managerDailyWage: data.managerDailyWage }));
      }
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const [form, setForm] = useState({
    monthlyRent: 0,
    managerMonthlySalary: 0,
    managerDailyWage: 0,
    deputyMonthlySalary: 0,
    deputyDailyWage: 0,
    staffDailyWage: 0,
    partTimeHourlyWage: 0,
    commissionRate: 0.17,
  });

  // 지점 선택 시 기존 설정값 로드
  // allSettings 로딩 완료 후에만 실행 (로딩 전 0 초기화 방지)
  useEffect(() => {
    if (selectedBranchId !== null && allSettings.length > 0) {
      const setting = (allSettings as any[]).find((s: any) => s.branchId === selectedBranchId);
      if (setting) {
        setForm({
          monthlyRent: Number(setting.monthlyRent || 0),
          managerMonthlySalary: Number(setting.managerMonthlySalary || 0),
          managerDailyWage: Number(setting.managerDailyWage || 0),
          deputyMonthlySalary: Number(setting.deputyMonthlySalary || 0),
          deputyDailyWage: Number(setting.deputyDailyWage || 0),
          staffDailyWage: Number(setting.staffDailyWage || 0),
          partTimeHourlyWage: Number(setting.partTimeHourlyWage || 0),
          commissionRate: Number(setting.commissionRate || 0.17),
        });
      } else {
        // DB에 해당 지점 설정이 아예 없을 때만 0으로 초기화
        setForm({
          monthlyRent: 0,
          managerMonthlySalary: 0,
          managerDailyWage: 0,
          deputyMonthlySalary: 0,
          deputyDailyWage: 0,
          staffDailyWage: 0,
          partTimeHourlyWage: 0,
          commissionRate: 0.17,
        });
      }
    }
  }, [selectedBranchId, allSettings]);

  // 첫 지점 자동 선택
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId((branches as any[])[0].id);
    }
  }, [branches]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">로딩 중...</div>;
  if (!user || user.role !== 'admin') return <div className="flex items-center justify-center min-h-screen text-gray-500">관리자만 접근 가능합니다.</div>;

  const selectedBranch = (branches as any[]).find((b: any) => b.id === selectedBranchId);

  // 월급 입력 시 일급 자동 계산
  const computedDailyWage = form.managerMonthlySalary > 0
    ? Math.round(form.managerMonthlySalary / 22)
    : form.managerDailyWage;
  const computedDeputyDailyWage = form.deputyMonthlySalary > 0
    ? Math.round(form.deputyMonthlySalary / 22)
    : form.deputyDailyWage;

  const handleSave = () => {
    if (!selectedBranchId) return;
    upsertMutation.mutate({
      branchId: selectedBranchId,
      ...form,
      managerDailyWage: computedDailyWage,
      deputyDailyWage: computedDeputyDailyWage,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settlement')} className="text-gray-500 hover:text-gray-700">
            ←
          </button>
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
                onClick={() => setSelectedBranchId(b.id)}
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
                  <NumberInput value={form.monthlyRent} onChange={v => setForm(prev => ({ ...prev, monthlyRent: v }))} />
                  <span className="text-xs text-gray-500">원</span>
                </div>
                <p className="text-xs text-blue-500 mt-1">
                  → 일 임대료: {form.monthlyRent > 0 ? `약 ${Math.round(form.monthlyRent / 26).toLocaleString()}원` : '-'} (해당 월 월~토 일수로 자동 계산)
                </p>
              </div>
            </div>

            {/* 인건비 설정 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2">👥 인건비 설정</h3>

              {/* 점장/매니저 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">점장</p>
                <div>
                  <label className="text-xs text-gray-500">월급 입력 (자동 계산)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <NumberInput value={form.managerMonthlySalary} onChange={v => setForm(prev => ({ ...prev, managerMonthlySalary: v, managerDailyWage: 0 }))} />
                    <span className="text-xs text-gray-500">원/월</span>
                  </div>
                  {form.managerMonthlySalary > 0 && (
                    <p className="text-xs text-blue-500 mt-1">
                      → 일급: {computedDailyWage.toLocaleString()}원 (÷22일)
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">일급 직접 입력 (월급 입력 시 자동 계산됨)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <NumberInput value={computedDailyWage} onChange={v => setForm(prev => ({ ...prev, managerDailyWage: v, managerMonthlySalary: 0 }))} />
                    <span className="text-xs text-gray-500">원/시간</span>
                  </div>
                </div>
              </div>

              {/* 매니저 */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600">매니저</p>
                <div>
                  <label className="text-xs text-gray-500">월급 입력 (자동 계산)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <NumberInput value={form.deputyMonthlySalary} onChange={v => setForm(prev => ({ ...prev, deputyMonthlySalary: v, deputyDailyWage: 0 }))} />
                    <span className="text-xs text-gray-500">원/월</span>
                  </div>
                  {form.deputyMonthlySalary > 0 && (
                    <p className="text-xs text-blue-500 mt-1">→ 일급: {computedDeputyDailyWage.toLocaleString()}원 (÷22일)</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">일급 직접 입력</label>
                  <div className="flex items-center gap-2 mt-1">
                    <NumberInput value={computedDeputyDailyWage} onChange={v => setForm(prev => ({ ...prev, deputyDailyWage: v, deputyMonthlySalary: 0 }))} />
                    <span className="text-xs text-gray-500">원/시간</span>
                  </div>
                </div>
              </div>

              {/* 여직원 */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600">여직원 일급</p>
                <div className="flex items-center gap-2">
                  <NumberInput value={form.staffDailyWage} onChange={v => setForm(prev => ({ ...prev, staffDailyWage: v }))} />
                  <span className="text-xs text-gray-500">원/시간</span>
                </div>
              </div>

              {/* 알바 */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600">알바 시급</p>
                <div className="flex items-center gap-2">
                  <NumberInput value={form.partTimeHourlyWage} onChange={v => setForm(prev => ({ ...prev, partTimeHourlyWage: v }))} />
                  <span className="text-xs text-gray-500">원/시간</span>
                </div>
              </div>
            </div>

            {/* 수수료율 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2">💳 수수료율</h3>
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={(form.commissionRate * 100).toFixed(0)}
                  onChange={e => setForm(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) / 100 }))}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right"
                />
                <span className="text-xs text-gray-500">%</span>
                <span className="text-xs text-gray-400">(기본 17%)</span>
              </div>
            </div>

            {/* 현재 설정 요약 */}
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
              <h3 className="text-xs font-bold text-blue-700 mb-2">📋 {selectedBranch.name} 현재 설정</h3>
              <div className="space-y-1 text-xs text-blue-600">
                <div className="flex justify-between"><span>월 임대료</span><span>{form.monthlyRent.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>점장 일급</span><span>{computedDailyWage.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>매니저 일급</span><span>{computedDeputyDailyWage.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>여직원 일급</span><span>{form.staffDailyWage.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>알바 시급</span><span>{form.partTimeHourlyWage.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>수수료율</span><span>{(form.commissionRate * 100).toFixed(0)}%</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
