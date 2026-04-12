/**
 * 관리자 계정/지점 관리 페이지
 * - 지점 추가/수정/삭제
 * - 지점 계정(storeAccount) 목록 조회 및 지점 배정
 * - 역할 변경 (점장 ↔ 관리자)
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, Building2, Users, ChevronDown, ChevronUp, Check, Key } from 'lucide-react';

export default function AdminManage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useStoreAuth();
  const utils = trpc.useUtils();

  // 지점 관련 상태
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [addingBranch, setAddingBranch] = useState(false);

  // 계정 패널 상태
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);
  const [changingPw, setChangingPw] = useState<number | null>(null);
  const [newPw, setNewPw] = useState('');

  // 데이터 조회
  const { data: branches = [], isLoading: branchLoading } = trpc.storeAccount.branchList.useQuery(
    undefined,
    { enabled: !!user && user.role === 'admin' }
  );

  const { data: accountList = [], isLoading: accountLoading } = trpc.storeAccount.list.useQuery(
    undefined,
    { enabled: !!user && user.role === 'admin' }
  );

  // 지점 생성
  const createBranch = trpc.branch.create.useMutation({
    onSuccess: () => {
      utils.storeAccount.branchList.invalidate();
      utils.storeAccount.list.invalidate();
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
      utils.storeAccount.branchList.invalidate();
      toast.success('지점이 삭제되었습니다');
    },
    onError: (e) => toast.error(e.message),
  });

  // 지점 배정
  const assignBranch = trpc.storeAccount.assignBranch.useMutation({
    onSuccess: () => {
      utils.storeAccount.list.invalidate();
      toast.success('지점이 배정되었습니다');
    },
    onError: (e) => toast.error(e.message),
  });

  // 비밀번호 변경
  const changePw = trpc.storeAccount.changePassword.useMutation({
    onSuccess: () => {
      utils.storeAccount.list.invalidate();
      setChangingPw(null);
      setNewPw('');
      toast.success('비밀번호가 변경되었습니다');
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
        <button onClick={() => navigate('/login')} className="px-4 py-2 rounded text-sm font-bold text-white" style={{ background: 'oklch(0.45 0.18 25)' }}>
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
              <div className="space-y-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={e => setNewBranchName(e.target.value)}
                  placeholder="지점명 (예: 강남점)"
                  className="w-full px-3 py-2 rounded text-sm outline-none border"
                  style={{ borderColor: 'oklch(0.75 0.015 85)', color: 'oklch(0.15 0.01 50)' }}
                />
                <input
                  type="text"
                  value={newBranchCode}
                  onChange={e => setNewBranchCode(e.target.value)}
                  placeholder="지점 코드 (예: gangnam)"
                  className="w-full px-3 py-2 rounded text-sm outline-none border"
                  style={{ borderColor: 'oklch(0.75 0.015 85)', color: 'oklch(0.15 0.01 50)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!newBranchName.trim() || !newBranchCode.trim()) {
                        toast.error('지점명과 코드를 입력해 주세요');
                        return;
                      }
                      createBranch.mutate({ name: newBranchName.trim(), code: newBranchCode.trim() });
                    }}
                    disabled={createBranch.isPending}
                    className="flex-1 py-2 rounded text-xs font-bold text-white disabled:opacity-60"
                    style={{ background: 'oklch(0.45 0.18 25)' }}
                  >
                    추가
                  </button>
                  <button
                    onClick={() => { setAddingBranch(false); setNewBranchName(''); setNewBranchCode(''); }}
                    className="flex-1 py-2 rounded text-xs font-medium"
                    style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.35 0.01 50)', border: '1px solid oklch(0.75 0.015 85)' }}
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
              {branches.map((branch: { id: number; name: string; code: string }) => (
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

        {/* 계정 관리 섹션 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} style={{ color: 'oklch(0.45 0.18 25)' }} />
            <span className="font-bold text-sm" style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}>
              계정 관리
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'oklch(0.55 0.01 50)' }}>
            아이디/비밀번호로 로그인하는 지점 계정 목록입니다. 지점을 배정하면 해당 지점의 매출만 입력/조회할 수 있습니다.
          </p>

          {accountLoading ? (
            <div className="text-center py-4 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>불러오는 중...</div>
          ) : accountList.length === 0 ? (
            <div className="text-center py-4 text-sm" style={{ color: 'oklch(0.5 0.01 50)' }}>
              등록된 계정이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {(accountList as Array<{
                id: number;
                loginId: string;
                displayName: string | null;
                role: string;
                branchId: number | null;
                branch: { id: number; name: string; code: string } | null;
              }>).map(acc => (
                <div
                  key={acc.id}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid oklch(0.75 0.015 85)' }}
                >
                  {/* 계정 헤더 */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    style={{ background: 'oklch(0.995 0.005 85)' }}
                    onClick={() => setExpandedAccount(expandedAccount === acc.id ? null : acc.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: acc.role === 'admin' ? 'oklch(0.45 0.18 25)' : 'oklch(0.55 0.1 220)' }}>
                        {(acc.displayName || acc.loginId).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'oklch(0.25 0.01 50)' }}>
                          {acc.displayName || acc.loginId}
                          <span className="ml-1.5 text-xs font-normal" style={{ color: 'oklch(0.55 0.01 50)' }}>({acc.loginId})</span>
                        </div>
                        <div className="text-xs" style={{ color: 'oklch(0.55 0.01 50)' }}>
                          {acc.role === 'admin' ? '관리자' : '점장'} · {acc.branch ? acc.branch.name : '지점 미배정'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedAccount === acc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* 확장 패널 */}
                  {expandedAccount === acc.id && (
                    <div className="px-4 py-3 border-t space-y-3" style={{ background: 'oklch(0.99 0.003 85)', borderColor: 'oklch(0.82 0.01 85)' }}>
                      {/* 지점 배정 */}
                      <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: 'oklch(0.45 0.01 50)' }}>지점 배정</div>
                        {branches.length === 0 ? (
                          <div className="text-xs" style={{ color: 'oklch(0.55 0.01 50)' }}>등록된 지점이 없습니다</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => assignBranch.mutate({ accountId: acc.id, branchId: null })}
                              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                              style={{
                                background: !acc.branchId ? 'oklch(0.55 0.1 220)' : 'oklch(0.92 0.015 85)',
                                color: !acc.branchId ? 'white' : 'oklch(0.35 0.01 50)',
                                border: '1px solid oklch(0.75 0.015 85)',
                              }}
                            >
                              {!acc.branchId && <Check size={11} />}
                              미배정
                            </button>
                            {branches.map((branch: { id: number; name: string; code: string }) => {
                              const isAssigned = acc.branchId === branch.id;
                              return (
                                <button
                                  key={branch.id}
                                  onClick={() => assignBranch.mutate({ accountId: acc.id, branchId: branch.id })}
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

                      {/* 비밀번호 변경 */}
                      <div>
                        <div className="text-xs font-semibold mb-2" style={{ color: 'oklch(0.45 0.01 50)' }}>비밀번호 변경</div>
                        {changingPw === acc.id ? (
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={newPw}
                              onChange={e => setNewPw(e.target.value)}
                              placeholder="새 비밀번호"
                              className="flex-1 px-3 py-1.5 rounded text-xs outline-none border"
                              style={{ borderColor: 'oklch(0.75 0.015 85)', color: 'oklch(0.15 0.01 50)' }}
                            />
                            <button
                              onClick={() => {
                                if (!newPw.trim()) { toast.error('비밀번호를 입력해 주세요'); return; }
                                changePw.mutate({ accountId: acc.id, newPassword: newPw });
                              }}
                              disabled={changePw.isPending}
                              className="px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-60"
                              style={{ background: 'oklch(0.45 0.18 25)' }}
                            >
                              저장
                            </button>
                            <button
                              onClick={() => { setChangingPw(null); setNewPw(''); }}
                              className="px-3 py-1.5 rounded text-xs font-medium"
                              style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.35 0.01 50)', border: '1px solid oklch(0.75 0.015 85)' }}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setChangingPw(acc.id); setNewPw(''); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                            style={{ background: 'oklch(0.92 0.015 85)', color: 'oklch(0.35 0.01 50)', border: '1px solid oklch(0.75 0.015 85)' }}
                          >
                            <Key size={11} />
                            비밀번호 변경
                          </button>
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
          계정 추가는 DB에서 직접 관리하거나 관리자에게 문의하세요
        </div>
      </main>
    </div>
  );
}
