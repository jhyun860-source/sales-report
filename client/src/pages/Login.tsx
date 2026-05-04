/**
 * 로그인 페이지 - 아이디/비밀번호 직접 입력
 * 자체 storeAccount 기반 로그인
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { isStaffLiquorOnly } from '@/lib/accountAccess';

export default function Login() {
  const [, navigate] = useLocation();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.loginWithPassword.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      toast.error('아이디와 비밀번호를 입력해 주세요');
      return;
    }

    setIsLoading(true);
    try {
      // 이전 계정의 토큰/지점 선택값이 남아 있으면 다른 지점으로 들어가는 혼선이 생길 수 있어 로그인 직전에 정리합니다.
      localStorage.removeItem('store_token');
      localStorage.removeItem('selectedBranchId');
      await utils.auth.storeMe.invalidate();

      const cleanLoginId = loginId.trim();
      const result = await loginMutation.mutateAsync({ loginId: cleanLoginId, password });
      // localStorage에 토큰 저장 (모바일 Chrome 쿠키 차단 문제 해결)
      if (result.token) {
        localStorage.setItem('store_token', result.token);
      }
      // storeMe 캐시 무효화
      await utils.auth.storeMe.invalidate();
      const branchId = result.account?.branchId;
      if (branchId) localStorage.setItem('selectedBranchId', String(branchId));

      if (isStaffLiquorOnly(result.account?.loginId)) {
        navigate(`/liquor-stock${branchId ? `?branchId=${branchId}` : ''}`);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      const msg = error?.message || '로그인에 실패했습니다';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'oklch(0.985 0.008 85)' }}
    >
      {/* 로고 / 타이틀 */}
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.25 0.01 50)' }}
        >
          매출 일일 보고
        </h1>
        <p className="text-sm" style={{ color: 'oklch(0.55 0.01 50)' }}>
          아이디와 비밀번호로 로그인하세요
        </p>
      </div>

      {/* 로그인 폼 */}
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-sm"
        style={{
          background: 'oklch(0.998 0.003 85)',
          border: '1px solid oklch(0.78 0.015 85)',
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 아이디 */}
          <div>
            <label
              htmlFor="loginId"
              className="block text-sm font-semibold mb-1.5"
              style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.3 0.01 50)' }}
            >
              아이디
            </label>
            <input
              id="loginId"
              type="text"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              placeholder="아이디 입력"
              autoComplete="username"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: 'oklch(0.97 0.008 85)',
                border: '1px solid oklch(0.75 0.015 85)',
                color: 'oklch(0.15 0.01 50)',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'oklch(0.45 0.18 25)';
                e.target.style.boxShadow = '0 0 0 2px oklch(0.45 0.18 25 / 0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'oklch(0.75 0.015 85)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold mb-1.5"
              style={{ fontFamily: "'Noto Serif KR', serif", color: 'oklch(0.3 0.01 50)' }}
            >
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: 'oklch(0.97 0.008 85)',
                  border: '1px solid oklch(0.75 0.015 85)',
                  color: 'oklch(0.15 0.01 50)',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'oklch(0.45 0.18 25)';
                  e.target.style.boxShadow = '0 0 0 2px oklch(0.45 0.18 25 / 0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'oklch(0.75 0.015 85)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-50 hover:opacity-80 transition-opacity"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            style={{ background: 'oklch(0.45 0.18 25)' }}
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>

      {/* 하단 안내 */}
      <p className="mt-6 text-xs text-center" style={{ color: 'oklch(0.65 0.01 50)' }}>
        로그인 정보를 모르시면 관리자에게 문의하세요
      </p>
    </div>
  );
}
