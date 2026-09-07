/**
 * 직원(주류 전용) 계정 접근 차단 가드
 *
 * 직원 계정(s3/s4/d2/m3/m4)은 주류 출고 현황 화면만 사용할 수 있습니다.
 * 주소창에 다른 페이지 주소를 직접 입력해도 주류 화면으로 되돌립니다.
 * App.tsx에서 주류/로그인 페이지를 제외한 모든 라우트를 이 컴포넌트로 감쌉니다.
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { isStaffLiquorOnly } from '@/lib/accountAccess';

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function StaffLiquorGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStoreAuth();
  const [, navigate] = useLocation();
  const blocked = !loading && !!user && isStaffLiquorOnly(user.loginId);

  useEffect(() => {
    if (!blocked) return;
    const branchId = user?.branchId ?? undefined;
    navigate(
      `/liquor-stock?date=${getTodayString()}${branchId ? `&branchId=${branchId}` : ''}`,
      { replace: true }
    );
  }, [blocked, user, navigate]);

  // 인증 확인 중에는 아무것도 그리지 않습니다.
  // (직원 계정인지 판단되기 전에 화면이 잠깐 노출되는 것을 막습니다)
  if (loading) return null;
  if (blocked) return null;

  return <>{children}</>;
}
