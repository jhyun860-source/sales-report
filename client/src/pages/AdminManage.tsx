/**
 * 관리자 사용자/지점 관리 페이지
 * - 지점 추가/수정/삭제
 * - 사용자 목록 조회 및 지점 배정
 * - 역할 변경 (점장 ↔ 관리자)
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, Building2, Users, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

export default function AdminManage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  // 지점 관련 상태
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [addingBranch, setAddingBranch] = useState(false);

  // 사용자 배정 패널 상태
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  // 데이터 조회
  const { data: branches = [], isLoading: branchLoading } = trpc.branch.list.useQuery(
    undefined,
    { enabled: !!user && user.role === 'admin' }
  );

  const { data: userList = [], isLoading: userLoading } = trpc.user.list.useQuery(
    undefined,
    { enabled: !!user && user.role === 'admin' }
  );

  // 지점 생성
  const createBranch = trpc.branch.create.useMutation({
    onSuccess: () => {
      utils.branch.list.invalidate();
      utils.user.list.invalidate();
      setNewBranchName('');
      setNewBranchCode('');
      setAddingBranch(false);
      toast.success('지점이 추가되었습니다');
    },
    onError: (e) => toast.error(e.message),
  });

  // 지점 삭제
  const deleteBranch = trpc.branch.delete.useMutation({
    onSuccess: () => {
      utils.branch.list.invalidate();
      toast.success('지점이 삭제되었습니다');
    },
    onError: (e) => toast.error(e.message),
  });

  // 역할 변경
  const updateRole = trpc.user.updateRole.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      toast.success('역할이 변경되었습니다');
    },
    onError: (e) => toast.error(e.message),
  });

  // 지점 배정
  const assignBranch = trpc.user.assignBranch.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      toast.success('지점이 배정되었습니다');
    },
    onError: (e) => toast.error(e.message),
  });

  // 지점 배정 해제
  const unassignBranch = trpc.user.unassignBranch.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      toast.success('배정이 해제되었습니다');
    },
    onError: (e) => toast.error(e.message),
  });

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
        <button onClick={() => { window.location.href = getLoginUrl(); }} className="px-4 py-2 rounded text-sm font-bold text-white" style={{ background: 'oklch(0.45 0.18 25)' }}>
          로그인
        </button>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'oklch(0.985 0.008 85)' }}>
        <p className="text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>관리자만 접근할 수 있습니다</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 rounded text-sm font-bold text-white" style={{ background: 'oklch(0.45 0.18 25)' }}>
          홈으로
        </button>
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
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="p-1.5 rounded hover:bg-black/8 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-bold" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
            관리자 설정
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* 지점 관리 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 size={16} style={{ color: 'oklch(0.45 0.18 25)' }} />
              <span className="font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
                지점 관리
              </span>
            </div>
            <button
              onClick={() => setAddingBranch(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={{ background: 'oklch(0.45 0.18 25)', color: 'white' }}
            >
              <Plus size={13} />
              지점 추가
            </button>
          </div>

          {/* 지점 추가 폼 */}
          {addingBranch && (
            <div
              className="mb-3 p-3 rounded-lg"
              style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}
            >
              <div className="text-xs font-semibold mb-2" style={{ color: 'oklch(0.45 0.01 50)' }}>새 지점 추가</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  placeholder="지점명 (예: 대치점)"
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{ borderColor: 'oklch(0.75 0.015 85)', background: 'white', color: 'oklch(0.12 0.01 50)' }}
                />
                <input
                  type="text"
                  value={newBranchCode}
                  onChange={e => setNewBranchCode(e.target.value)}
                  placeholder="지점 코드 (예: daechi)"
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{ borderColor: 'oklch(0.75 0.015 85)', background: 'white', color: 'oklch(0.12 0.01 50)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!newBranchName.trim() || !newBranchCode.trim()) {
                        toast.error('지점명과 코드를 입력해주세요');
                        return;
                      }
                      createBranch.mutate({ name: newBranchName.trim(), code: newBranchCode.trim() });
                    }}
                    disabled={createBranch.isPending}
                    className="flex-1 py-2 rounded text-sm font-bold text-white transition-colors disabled:opacity-60"
                    style={{ background: 'oklch(0.45 0.18 25)' }}
                  >
                    {createBranch.isPending ? '추가 중...' : '추가'}
                  </button>
                  <button
                    onClick={() => { setAddingBranch(false); setNewBranchName(''); setNewBranchCode(''); }}
                    className="px-4 py-2 rounded text-sm font-medium transition-colors"
                    style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.25 0.01 50)', border: '1px solid oklch(0.75 0.015 85)' }}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 지점 목록 */}
          {branchLoading ? (
            <div className="text-center py-4 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>불러오는 중...</div>
          ) : branches.length === 0 ? (
            <div className="text-center py-4 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>등록된 지점이 없습니다</div>
          ) : (
            <div className="space-y-2">
              {branches.map(branch => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{ background: 'oklch(0.995 0.005 85)', border: '1px solid oklch(0.75 0.015 85)' }}
                >
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'oklch(0.25 0.01 50)' }}>{branch.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.01 50)' }}>코드: {branch.code}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`"${branch.name}"을 삭제하시겠습니까?`)) {
                        deleteBranch.mutate({ id: branch.id });
                      }
                    }}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors"
                    style={{ color: 'oklch(0.55 0.18 25)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 사용자 관리 섹션 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} style={{ color: 'oklch(0.45 0.18 25)' }} />
            <span className="font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
              사용자 관리
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'oklch(0.55 0.01 50)' }}>
            앱에 로그인한 사용자 목록입니다. 지점을 배정하면 해당 지점의 매출만 입력/조회할 수 있습니다.
          </p>

          {userLoading ? (
            <div className="text-center py-4 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>불러오는 중...</div>
          ) : userList.length === 0 ? (
            <div className="text-center py-4 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>
              아직 로그인한 사용자가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {(userList as Array<{
                id: number;
                name: string;
                openId: string;
                role: string;
                assignedBranches: Array<{ id: number; name: string }>;
              }>).map(u => (
                <div
                  key={u.id}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid oklch(0.75 0.015 85)' }}
                >
                  {/* 사용자 헤더 */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    style={{ background: 'oklch(0.995 0.005 85)' }}
                    onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: u.role === 'admin' ? 'oklch(0.45 0.18 25)' : 'oklch(0.55 0.1 220)' }}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'oklch(0.25 0.01 50)' }}>{u.name}</div>
                        <div className="text-xs" style={{ color: 'oklch(0.55 0.01 50)' }}>
                          {u.role === 'admin' ? '관리자' : '점장'} · 배정 지점: {u.assignedBranches.length > 0 ? u.assignedBranches.map(b => b.name).join(', ') : '없음'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedUser === u.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* 확장 패널 */}
                  {expandedUser === u.id && (
                    <div className="px-4 py-3 border-t space-y-3" style={{ background: 'oklch(0.99 0.003 85)', borderColor: 'oklch(0.82 0.01 85)' }}>
                      {/* 역할 변경 */}
                      <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: 'oklch(0.45 0.01 50)' }}>역할</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateRole.mutate({ userId: u.id, role: 'user' })}
                            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                            style={{
                              background: u.role === 'user' ? 'oklch(0.55 0.1 220)' : 'oklch(0.92 0.015 85)',
                              color: u.role === 'user' ? 'white' : 'oklch(0.35 0.01 50)',
                              border: '1px solid oklch(0.75 0.015 85)',
                            }}
                          >
                            {u.role === 'user' && <Check size={11} />}
                            점장
                          </button>
                          <button
                            onClick={() => updateRole.mutate({ userId: u.id, role: 'admin' })}
                            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                            style={{
                              background: u.role === 'admin' ? 'oklch(0.45 0.18 25)' : 'oklch(0.92 0.015 85)',
                              color: u.role === 'admin' ? 'white' : 'oklch(0.35 0.01 50)',
                              border: '1px solid oklch(0.75 0.015 85)',
                            }}
                          >
                            {u.role === 'admin' && <Check size={11} />}
                            관리자
                          </button>
                        </div>
                      </div>

                      {/* 지점 배정 */}
                      <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: 'oklch(0.45 0.01 50)' }}>지점 배정</div>
                        {branches.length === 0 ? (
                          <div className="text-xs" style={{ color: 'oklch(0.55 0.01 50)' }}>등록된 지점이 없습니다</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {branches.map(branch => {
                              const isAssigned = u.assignedBranches.some(b => b.id === branch.id);
                              return (
                                <button
                                  key={branch.id}
                                  onClick={() => {
                                    if (isAssigned) {
                                      unassignBranch.mutate({ userId: u.id, branchId: branch.id });
                                    } else {
                                      assignBranch.mutate({ userId: u.id, branchId: branch.id });
                                    }
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                                  style={{
                                    background: isAssigned ? 'oklch(0.9 0.08 150)' : 'oklch(0.92 0.015 85)',
                                    color: isAssigned ? 'oklch(0.3 0.12 150)' : 'oklch(0.35 0.01 50)',
                                    border: `1px solid ${isAssigned ? 'oklch(0.75 0.1 150)' : 'oklch(0.75 0.015 85)'}`,
                                  }}
                                >
                                  {isAssigned ? <Check size={11} /> : <Plus size={11} />}
                                  {branch.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="text-xs text-center pb-8" style={{ color: 'oklch(0.65 0.01 50)' }}>
          새 점장이 앱에 처음 로그인하면 이 목록에 자동으로 나타납니다
        </div>
      </main>
    </div>
  );
}
