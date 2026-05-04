export const STAFF_LIQUOR_ONLY_IDS = ['s3', 's4', 'd2', 'm3', 'm4'] as const;
export const MANAGER_LIQUOR_EDIT_IDS = ['s1', 's2', 'd1', 'm1', 'm2'] as const;
export const LIQUOR_EDIT_IDS = [...MANAGER_LIQUOR_EDIT_IDS, ...STAFF_LIQUOR_ONLY_IDS] as const;

export const ACCOUNT_BRANCH_LABEL: Record<string, string> = {
  s1: '선릉점',
  s3: '선릉점',
  s2: '삼성점',
  s4: '삼성점',
  d1: '대치점',
  d2: '대치점',
  m1: '문정1호점',
  m3: '문정1호점',
  m2: '문정2호점',
  m4: '문정2호점',
};

export function isStaffLiquorOnly(loginId?: string | null) {
  return !!loginId && STAFF_LIQUOR_ONLY_IDS.includes(loginId as any);
}

export function canEditLiquor(loginId?: string | null, role?: string | null) {
  return role === 'admin' || (!!loginId && LIQUOR_EDIT_IDS.includes(loginId as any));
}

export function getAccountBranchLabel(loginId?: string | null) {
  return loginId ? ACCOUNT_BRANCH_LABEL[loginId] : undefined;
}
