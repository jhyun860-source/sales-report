import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { trpc } from '@/lib/trpc';
import { Plus, X, ChevronLeft } from 'lucide-react';

export default function StaffAdmin() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user: account, loading: authLoading } = useStoreAuth();

  const BG = 'oklch(0.97 0.01 85)';
  const CARD_BG = 'oklch(1 0 0)';
  const BORDER = 'oklch(0.88 0.01 85)';
  const HEADER_BG = 'oklch(0.93 0.015 85)';
  const PRIMARY = 'oklch(0.45 0.18 25)';
  const TEXT = 'oklch(0.12 0.01 50)';
  const MUTED = 'oklch(0.55 0.01 50)';
  const CHIP_BG = 'oklch(0.94 0.02 60)';

  const urlBranchId = (() => {
    const v = new URLSearchParams(search).get('branchId');
    return v ? Number(v) : undefined;
  })();
  const effectiveBranchId = account?.role === 'admin' ? urlBranchId : account?.branchId;

  const utils = trpc.useUtils();
  const { data: staffList, isLoading } = trpc.staffAdmin.list.useQuery(
    { branchId: effectiveBranchId },
    { enabled: !!account && !!effectiveBranchId }
  );
  const createMutation = trpc.staffAdmin.create.useMutation({
    onSuccess: () => utils.staffAdmin.list.invalidate(),
  });
  const removeMutation = trpc.staffAdmin.remove.useMutation({
    onSuccess: () => utils.staffAdmin.list.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [realName, setRealName] = useState('');
  const [alias, setAlias] = useState('');
  const [staffType, setStaffType] = useState<'staff' | 'parttime'>('staff');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!realName.trim() || !alias.trim()) {
      setError('실명과 가명을 모두 입력해주세요');
      return;
    }
    setError('');
    createMutation.mutate(
      { branchId: effectiveBranchId, realName: realName.trim(), alias: alias.trim(), staffType },
      {
        onSuccess: () => {
          setRealName('');
          setAlias('');
          setStaffType('staff');
          setShowForm(false);
        },
      }
    );
  };

  if (authLoading) return null;
  if (!account) {
    return <div className="p-6 text-sm" style={{ color: MUTED }}>로그인이 필요합니다</div>;
  }
  if (!effectiveBranchId) {
    return (
      <div className="min-h-screen" style={{ background: BG }}>
        <header style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="text-sm font-bold" style={{ color: TEXT }}>직원 관리</div>
            <button onClick={() => navigate('/')} className="px-2.5 py-1.5 rounded text-xs font-medium" style={{ background: HEADER_BG, color: TEXT, border: `1px solid ${BORDER}` }}>
              매출보고로
            </button>
          </div>
        </header>
        <div className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>
          지점을 먼저 선택해주세요
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      <header className="sticky top-0 z-10" style={{ background: BG, borderBottom: `1px solid ${BORDER}`, boxShadow: '0 1px 4px oklch(0 0 0 / 0.07)' }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate('/')} style={{ color: MUTED }}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="text-sm font-bold" style={{ color: TEXT }}>직원 관리</div>
              <div className="text-xs" style={{ color: MUTED }}>{account.branch?.name ?? ''}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {isLoading && <p className="text-sm" style={{ color: MUTED }}>불러오는 중...</p>}

        <div className="space-y-2 mb-4">
          {(staffList ?? []).map((s: any) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl px-3 py-3"
              style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: CHIP_BG, color: PRIMARY }}
                >
                  {s.alias?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: TEXT }}>
                    {s.alias}{' '}
                    <span className="text-xs font-normal" style={{ color: MUTED }}>
                      ({s.realName})
                    </span>
                  </p>
                  <span
                    className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-md"
                    style={{
                      background: s.staffType === 'staff' ? 'oklch(0.93 0.02 60)' : 'oklch(0.93 0.05 150)',
                      color: s.staffType === 'staff' ? PRIMARY : 'oklch(0.4 0.1 150)',
                    }}
                  >
                    {s.staffType === 'staff' ? '직원' : '알바'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`${s.alias}님을 목록에서 삭제할까요?`)) {
                    removeMutation.mutate({ id: s.id, branchId: effectiveBranchId });
                  }
                }}
                style={{ color: MUTED }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {!isLoading && (staffList ?? []).length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: MUTED }}>
              등록된 직원이 없습니다
            </p>
          )}
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-medium"
            style={{ background: CHIP_BG, color: PRIMARY }}
          >
            <Plus size={16} />
            직원 추가
          </button>
        ) : (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <div>
              <label className="text-xs font-medium" style={{ color: MUTED }}>실명</label>
              <input
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="예: 김아름"
                className="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: MUTED }}>가명 (테이블 기록에 표시될 이름)</label>
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="예: 아름"
                className="w-full mt-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: MUTED }}>구분</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStaffType('staff')}
                  className="px-4 py-2 rounded-full text-sm font-medium"
                  style={{ background: staffType === 'staff' ? PRIMARY : CHIP_BG, color: staffType === 'staff' ? '#fff' : TEXT }}
                >
                  직원
                </button>
                <button
                  onClick={() => setStaffType('parttime')}
                  className="px-4 py-2 rounded-full text-sm font-medium"
                  style={{ background: staffType === 'parttime' ? 'oklch(0.4 0.1 150)' : CHIP_BG, color: staffType === 'parttime' ? '#fff' : TEXT }}
                >
                  알바
                </button>
              </div>
            </div>
            {error && <p className="text-xs" style={{ color: 'oklch(0.5 0.2 25)' }}>{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium"
                style={{ background: CHIP_BG, color: MUTED }}
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={createMutation.isPending}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ background: PRIMARY }}
              >
                {createMutation.isPending ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
