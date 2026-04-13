/**
 * storeAccount 기반 인증 훅
 * Manus OAuth 대신 자체 아이디/비밀번호 로그인 사용
 */

import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

export function useStoreAuth() {
  const { data: storeUser, isLoading, error } = trpc.auth.storeMe.useQuery(undefined, {
    retry: false,
    // staleTime 제거: 항상 최신 인증 상태 반영 (캐시로 인한 지점명 미표시 방지)
  });
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      // localStorage 토큰 삭제 (모바일 Chrome 쿠키 차단 문제 해결)
      localStorage.removeItem('store_token');
      await utils.auth.storeMe.invalidate();
      navigate('/login');
    },
  });

  const logout = () => logoutMutation.mutate();

  return {
    user: storeUser ?? null,
    loading: isLoading,
    error: error ?? null,
    isAuthenticated: !!storeUser,
    isAdmin: storeUser?.role === 'admin',
    logout,
  };
}
