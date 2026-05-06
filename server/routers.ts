import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import webpush from "web-push";
import { ENV } from "./_core/env";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import {
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptionsByOpenId,
  createBranch,
  getBranchById,
  getDailySalesRecord,
  getPrevDailySalesRecord,
  getPrevDailySalesRecordWithPosEnd,
  getDailySalesRecordsByDateRange,
  upsertDailySalesRecord,
  getDb,
  getStoreAccountByLoginId,
  getStoreAccountById,
  createStoreAccount,
  updateStoreAccount,
  getAllStoreAccounts,
  deleteStoreAccount,
  cascadeUpdatePosAmounts,
  cascadeUpdateCumulativeAmounts,
  computeCumulativesForDate,
} from "./db";
import { branches, branchManagers, users, dailySalesRecords, storeAccounts, tableReports, tableItems, staffIncentives, liquorItems, liquorInventories, liquorStockMovements } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { eq, and, desc, like, sql, inArray, gte, lte, not } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// VAPID 설정
if (ENV.vapidPublicKey && ENV.vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@salesdash.app",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
}

// JWT 세션 토큰 생성 (storeAccount용)
async function createStoreSessionToken(accountId: number, loginId: string, role: string): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ accountId, loginId, role, type: 'store' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(secret);
}

const CANONICAL_STORE_ACCOUNTS = [
  { loginId: 's1', password: '1234', displayName: '선릉점 매니저', branchCode: 'seolleung', branchNames: ['선릉점'], role: 'user' },
  { loginId: 's3', password: '1234', displayName: '선릉점 직원', branchCode: 'seolleung', branchNames: ['선릉점'], role: 'user' },
  { loginId: 's2', password: '1234', displayName: '삼성점 매니저', branchCode: 'samsung', branchNames: ['삼성점'], role: 'user' },
  { loginId: 's4', password: '1234', displayName: '삼성점 직원', branchCode: 'samsung', branchNames: ['삼성점'], role: 'user' },
  { loginId: 'd1', password: '1234', displayName: '대치점 매니저', branchCode: 'daechi', branchNames: ['대치점'], role: 'user' },
  { loginId: 'd2', password: '1234', displayName: '대치점 직원', branchCode: 'daechi', branchNames: ['대치점'], role: 'user' },
  { loginId: 'm1', password: '1234', displayName: '문정1호점 매니저', branchCode: 'munjeong1', branchNames: ['문정1호점', '문정 1호점'], role: 'user' },
  { loginId: 'm3', password: '1234', displayName: '문정1호점 직원', branchCode: 'munjeong1', branchNames: ['문정1호점', '문정 1호점'], role: 'user' },
  { loginId: 'm2', password: '1234', displayName: '문정2호점 매니저', branchCode: 'munjeong2', branchNames: ['문정2호점'], role: 'user' },
  { loginId: 'm4', password: '1234', displayName: '문정2호점 직원', branchCode: 'munjeong2', branchNames: ['문정2호점'], role: 'user' },
] as const;

let canonicalAccountsSynced = false;
async function ensureCanonicalStoreAccounts() {
  if (canonicalAccountsSynced) return;
  const db = await getDb();
  if (!db) return;
  const allBranches = await db.select().from(branches);
  const normalize = (value: string) => value.replace(/\s+/g, '').trim();
  const branchByCode = new Map(allBranches.map((branch: any) => [branch.code, branch]));

  for (const spec of CANONICAL_STORE_ACCOUNTS) {
    let branch = branchByCode.get(spec.branchCode) as any;
    if (!branch) {
      branch = allBranches.find((row: any) => spec.branchNames.some(name => normalize(row.name) === normalize(name)));
    }
    if (!branch) continue;

    const existing = await getStoreAccountByLoginId(spec.loginId);
    const passwordHash = await bcrypt.hash(spec.password, 10);
    if (existing) {
      await updateStoreAccount(existing.id, {
        passwordHash,
        displayName: spec.displayName,
        branchId: branch.id,
        role: spec.role,
      });
    } else {
      await createStoreAccount({
        loginId: spec.loginId,
        passwordHash,
        displayName: spec.displayName,
        branchId: branch.id,
        role: spec.role,
      });
    }
  }
  canonicalAccountsSynced = true;
}

// 쿠키 또는 Authorization 헤더에서 storeAccount 페이로드 파싱 헬퍼
const DEFAULT_LIQUOR_ITEMS: Array<{ name: string; unitCost: number; category: string }> = [
  { name: '발렌타인 17y (500ml)', unitCost: 114000, category: '위스키' },
  { name: '발렌타인 21y (500ml)', unitCost: 180000, category: '위스키' },
  { name: '발렌타인 마스터즈', unitCost: 50000, category: '위스키' },
  { name: '발렌타인 30y', unitCost: 934800, category: '위스키' },
  { name: '글렌버기 12y (700ml)', unitCost: 92400, category: '위스키' },
  { name: '글렌버기 15y (700ml)', unitCost: 130000, category: '위스키' },
  { name: '글렌리벳 12y (700ml)', unitCost: 97000, category: '위스키' },
  { name: '글렌리벳 15y (700ml)', unitCost: 140000, category: '위스키' },
  { name: '글랜피딕 12y (500ml)', unitCost: 70000, category: '위스키' },
  { name: '글랜피딕 15y (500ml)', unitCost: 98000, category: '위스키' },
  { name: '글랜피딕 12y (700ml)', unitCost: 90000, category: '위스키' },
  { name: '글랜피딕 15y (700ml)', unitCost: 125000, category: '위스키' },
  { name: '글랜모렌지 오리지널', unitCost: 85000, category: '위스키' },
  { name: '글랜모렌지 라산타 12y', unitCost: 106000, category: '위스키' },
  { name: '글랜모렌지 시그넷', unitCost: 340000, category: '위스키' },
  { name: '발베니 12y (700ml)', unitCost: 110000, category: '위스키' },
  { name: '발베니 14y (700ml)', unitCost: 180000, category: '위스키' },
  { name: '로얄살루트 21y (500ml)', unitCost: 180000, category: '위스키' },
  { name: '로얄살루트 21y (700ml)', unitCost: 296000, category: '위스키' },
  { name: '조니워커 블랙 (500ml)', unitCost: 40000, category: '위스키' },
  { name: '조니워커 블루 (500ml)', unitCost: 210000, category: '위스키' },
  { name: '조니워커 블루 (700ml)', unitCost: 300000, category: '위스키' },
  { name: '맥켈란 12y (700ml)', unitCost: 110000, category: '위스키' },
  { name: '맥켈란 15y (700ml)', unitCost: 220000, category: '위스키' },
  { name: '맥켈란 18y (700ml)', unitCost: 800000, category: '위스키' },
  { name: '올드캐슬', unitCost: 20000, category: '위스키' },
  { name: '칼라일 (700ml)', unitCost: 20000, category: '위스키' },
  { name: '캔터키 (700ml)', unitCost: 20000, category: '위스키' },
  { name: '스틸브룩 디럭스', unitCost: 20000, category: '위스키' },
  { name: '존바 파이니스트', unitCost: 20000, category: '위스키' },
  { name: '탈리스만', unitCost: 20000, category: '위스키' },
  { name: '글렌라씨', unitCost: 20000, category: '위스키' },
  { name: '엠페라도르', unitCost: 20000, category: '위스키' },
  { name: '코쿤위스키 (2.7L)', unitCost: 40000, category: '위스키' },
  { name: '미스터보스턴 버번 1L', unitCost: 20000, category: '위스키' },
  { name: '멈 그랑꼬르동', unitCost: 71000, category: '샴페인' },
  { name: '멈 그랑꼬르동 로제', unitCost: 92000, category: '샴페인' },
  { name: '모엣샹동', unitCost: 74000, category: '샴페인' },
  { name: '모엣샹동 로제', unitCost: 92000, category: '샴페인' },
  { name: '돔페리뇽', unitCost: 360000, category: '샴페인' },
  { name: '돔페리뇽 빈티지', unitCost: 450000, category: '샴페인' },
  { name: '아르망디', unitCost: 1000000, category: '샴페인' },
  { name: '헤네시 x.o', unitCost: 360000, category: '꼬냑' },
  { name: '헤네시 v.s.o.p (500ml)', unitCost: 90000, category: '꼬냑' },
  { name: '레미마틴 v.s.o.p', unitCost: 110000, category: '꼬냑' },
  { name: '시바스리갈 12y', unitCost: 53000, category: '위스키' },
  { name: '골든블루', unitCost: 30000, category: '위스키' },
  { name: '1800 아네호', unitCost: 90000, category: '데킬라' },
  { name: '아드백 10y', unitCost: 120000, category: '위스키' },
  { name: '탈리스커 10y', unitCost: 90000, category: '위스키' },
  { name: '달모어 12y', unitCost: 120000, category: '위스키' },
  { name: '달모어 킹', unitCost: 500000, category: '위스키' },
  { name: '카발란', unitCost: 99000, category: '위스키' },
  { name: '맥코넬스', unitCost: 85000, category: '위스키' },
  { name: '얼리타임즈', unitCost: 30000, category: '위스키' },
  { name: '히비키 하모니', unitCost: 300000, category: '위스키' },
  { name: '바톤 보드카', unitCost: 7000, category: '보드카/진/럼' },
  { name: '바톤 진', unitCost: 7000, category: '보드카/진/럼' },
  { name: '럼', unitCost: 8000, category: '보드카/진/럼' },
  { name: '메론 리큐르', unitCost: 21000, category: '리큐르/시럽' },
  { name: '피치 리큐르', unitCost: 20000, category: '리큐르/시럽' },
  { name: '아마레토', unitCost: 24800, category: '리큐르/시럽' },
  { name: '얼그레이 시럽', unitCost: 20000, category: '리큐르/시럽' },
  { name: '그레나딘', unitCost: 20000, category: '리큐르/시럽' },
  { name: '모히토 시럽', unitCost: 20000, category: '리큐르/시럽' },
  { name: '자몽시럽', unitCost: 20000, category: '리큐르/시럽' },
  { name: '청포도시럽', unitCost: 20000, category: '리큐르/시럽' },
  { name: '수박시럽', unitCost: 20000, category: '리큐르/시럽' },
  { name: '앙고스투라', unitCost: 60000, category: '리큐르/시럽' },
  { name: '마티니 드라이', unitCost: 19000, category: '리큐르/시럽' },
  { name: '드럼부이', unitCost: 42800, category: '리큐르/시럽' },
  { name: '말리부', unitCost: 28000, category: '리큐르/시럽' },
  { name: '몬테주마 (데킬라)', unitCost: 18000, category: '데킬라' },
  { name: '깔루아', unitCost: 30000, category: '리큐르/시럽' },
  { name: '베일리스', unitCost: 40000, category: '리큐르/시럽' },
  { name: '트리플섹', unitCost: 22000, category: '리큐르/시럽' },
  { name: '바나나 리큐르', unitCost: 22000, category: '리큐르/시럽' },
  { name: '블루큐라소', unitCost: 22000, category: '리큐르/시럽' },
  { name: '라임주스', unitCost: 20000, category: '리큐르/시럽' },
  { name: '피나믹스', unitCost: 20000, category: '리큐르/시럽' },
  { name: '카프리', unitCost: 1700, category: '맥주' },
  { name: '호가든', unitCost: 2200, category: '맥주' },
  { name: '하이네켄', unitCost: 3300, category: '맥주' },
  { name: '코로나', unitCost: 2450, category: '맥주' },
  { name: '기네스', unitCost: 4300, category: '맥주' },
  { name: '생맥주 1통', unitCost: 100000, category: '맥주' },
];

const BOXHERO_STOCK_SEED_VERSION = 'boxhero-stock-2026-05-03-v2';

// BoxHero 엑셀(2026-05-03) 기준 지점별 현재 재고 수량.
// 지점별 파일에서 제품명/수량을 추출했고, 동일 지점 내 동일 제품명은 합산 처리했다.
const BOXHERO_BRANCH_STOCKS: Record<string, Array<{ name: string; quantity: number; category: string }>> = {
  "대치점": [
    {
      "name": "1800 아네호",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "골든블루",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "그레나딘",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "글랜라씨",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "글랜리벳 12y (700ml)",
      "quantity": 8,
      "category": "위스키"
    },
    {
      "name": "글랜리벳 15y (700ml)",
      "quantity": 7,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 라산타 12y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 시그넷",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 오리지널",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글랜버기 12y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글랜버기 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 12y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 15y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "기네스",
      "quantity": 48,
      "category": "맥주"
    },
    {
      "name": "달모어",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "달모어킹 알렉산더 3세",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "돔페리뇽",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "드럼부이",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "라임주스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "럼",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "레미마틴 v.s.o.p",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "로얄살루트 21y (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "로얄살루트 21y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "론 디아즈151",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "마티니 드라이",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "말리부",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "맥켈란 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "맥켈란 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "맥켈란 18y (700ml)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "맥코넬스",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "멈 그랑꼬르동",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "멈 그랑꼬르동 로제",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "메론 리큐르",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "모엣샹동",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "모엣샹동 로제",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "모히토 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "몬테주마 (데킬라)",
      "quantity": 4,
      "category": "리큐르/시럽"
    },
    {
      "name": "미스터보스턴 버번",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "바나나 리큐르",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "바닐라 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "발렌타인 17y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "발렌타인 21y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "발렌타인 30y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "발렌타인 마스터즈",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "발베니 12y (700ml)",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "발베니 14y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "버드와이저 생맥",
      "quantity": 2,
      "category": "맥주"
    },
    {
      "name": "베일리스",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "벨즈 (무제한)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "보드카",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "블루큐라소",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "수박시럽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "스텔라 병맥",
      "quantity": 0,
      "category": "맥주"
    },
    {
      "name": "스틸브룩디럭스",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "아드백",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아르망디",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아마레토",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "앙고스투라",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "야마자키",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "얼그레이 시럽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "얼리타임즈",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "엠페라도르디럭스스페셜리저브",
      "quantity": 5,
      "category": "위스키"
    },
    {
      "name": "올드캐슬",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "자몽 시럽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "조니워커 블랙",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "조니워커 블루 (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "조니워커 블루 (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "존바 파이니스트",
      "quantity": 5,
      "category": "위스키"
    },
    {
      "name": "진",
      "quantity": 5,
      "category": "리큐르/시럽"
    },
    {
      "name": "청포도 시럽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "카발란",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "카스 논알콜맥주",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "카프리",
      "quantity": 34,
      "category": "맥주"
    },
    {
      "name": "칼라일",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "칼루아",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "캔터키",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "코쿤 (무제한)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "크렘 드 민트",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "크렘 드 카카오",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "클라세 아줄 레포사도",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "탈리스만 (무제한)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "탈리스커",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "트리플섹",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "피나믹스",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "피치 리큐르",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "하이네켄",
      "quantity": 25,
      "category": "맥주"
    },
    {
      "name": "한맥 생맥",
      "quantity": 2,
      "category": "맥주"
    },
    {
      "name": "헤네시 v.s.o.p",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "헤네시 x.o",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "호가든",
      "quantity": 28,
      "category": "맥주"
    },
    {
      "name": "히비키",
      "quantity": 1,
      "category": "위스키"
    }
  ],
  "문정1호점": [
    {
      "name": "1800 아네호",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "골든블랑",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "골든블랑 로제",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "골든블루",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "그레나딘",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "글랜모렌지 라산타 12y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 시그넷",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 오리지널",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 12y (500ml)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 15y (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌라씨",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글렌리벳 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌리벳 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌버기 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌버기 15y (700ml)",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "기네스",
      "quantity": 27,
      "category": "맥주"
    },
    {
      "name": "깔루아",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "달모어 12y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "달모어 킹",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "돔페리뇽",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "드럼부이",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "라임주스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "럼",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "레미마틴 v.s.o.p",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "로얄살루트 21y (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "로얄살루트 21y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "로크로몬드 오리지널",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "마티니 드라이",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "말리부",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "맥켈란 12y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "맥켈란 15y (700ml)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "맥켈란 18y (700ml)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "맥코넬스",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "멈 그랑꼬르동",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "멈 그랑꼬르동 로제",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "메론 리큐르",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "모엣샹동",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "모엣샹동 로제",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "모히토 시럽",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "몬테주마 (데킬라)",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "미스터 보스턴 버번",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "바나나 리큐르",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "바닐라 시럽",
      "quantity": 0,
      "category": "리큐르/시럽"
    },
    {
      "name": "바톤 보드카",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "바톤 진",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "발렌타인 17y (500ml)",
      "quantity": 5,
      "category": "위스키"
    },
    {
      "name": "발렌타인 21y (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "발렌타인 30y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "발렌타인 마스터즈 (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "발베니 12y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "발베니 14y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "버드와이저 생",
      "quantity": 2,
      "category": "맥주"
    },
    {
      "name": "베일리스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "벨즈 (무제한)",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "블루큐라소",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "수박시럽",
      "quantity": 4,
      "category": "리큐르/시럽"
    },
    {
      "name": "스틸브룩 디럭스",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "시바스리갈 12y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "싱글톤 12y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아드백 10y",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "아르망디",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아마레토",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "앙고스투라",
      "quantity": 4,
      "category": "리큐르/시럽"
    },
    {
      "name": "얼그레이 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "얼리타임즈",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "엠페라도르",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "올드캐슬",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "자몽 시럽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "조니워커 블랙 (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "조니워커 블루 (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "조니워커 블루 (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "존바 파이니스트",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "청포도 시럽",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "카발란",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "카프리",
      "quantity": 32,
      "category": "맥주"
    },
    {
      "name": "칼라일",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "캔터키",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "코로나",
      "quantity": 0,
      "category": "맥주"
    },
    {
      "name": "코쿤 (무제한)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "탈리스만 (무제한)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "탈리스커 10y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "트리플섹",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "피나믹스",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "피치 리큐르",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "하이네켄",
      "quantity": 28,
      "category": "맥주"
    },
    {
      "name": "한맥",
      "quantity": 1,
      "category": "맥주"
    },
    {
      "name": "헤네시 v.s.o.p",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "헤네시 x.o",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "호가든",
      "quantity": 25,
      "category": "맥주"
    }
  ],
  "문정2호점": [
    {
      "name": "골든블랑",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "골든블랑 로제",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "골든블루",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "그레나딘",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "글랜모렌지 라산타 12y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 시그넷",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 오리지널",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 12y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 15y (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌라씨",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌리벳 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌리벳 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌버기 12y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글렌버기 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "기네스",
      "quantity": 0,
      "category": "맥주"
    },
    {
      "name": "깔루아",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "달모어",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "돔페리뇽",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "드럼부이",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "라임주스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "럼",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "레미마틴 v.s.o.p",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "로얄살루트 21y (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "로얄살루트 21y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "로크로몬드 오리지널",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "론디아즈",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "마티니 드라이",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "말리부",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "맥켈란 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "맥켈란 15y (700ml)",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "맥켈란 18y (700ml)",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "멈 그랑꼬르동",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "멈 그랑꼬르동 로제",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "메론 리큐르",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "모엣샹동",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "모엣샹동 로제",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "모히토 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "몬테주마 (데킬라)",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "미스터보스턴",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "바나나 리큐르",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "바닐라 시럽",
      "quantity": 0,
      "category": "리큐르/시럽"
    },
    {
      "name": "바톤 보드카",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "바톤 진",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "발렌타인 17y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "발렌타인 21y (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "발렌타인 30y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "발베니 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "발베니 14y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "버드와이저",
      "quantity": 61,
      "category": "맥주"
    },
    {
      "name": "베일리스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "벨즈",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "벨즈 (무제한)",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "블랑 1664",
      "quantity": 16,
      "category": "맥주"
    },
    {
      "name": "블루큐라소",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "수박시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "스틸브룩",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "시바스리갈 12y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "싱글톤 12y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아네호 1800",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "아드백",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "아르망디",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아마레토",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "앙고스투라",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "얼그레이 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "얼리타임즈",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "엠페라도르",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "올드캐슬",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "자몽 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "조니워커 블루 (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "조니워커 블루 (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "존바 파이니스트",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "청포도 시럽",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "카발란",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "칼라일",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "캔터키",
      "quantity": 5,
      "category": "위스키"
    },
    {
      "name": "켈리",
      "quantity": 2,
      "category": "맥주"
    },
    {
      "name": "코로나",
      "quantity": 20,
      "category": "맥주"
    },
    {
      "name": "코쿤",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "타이거",
      "quantity": 14,
      "category": "맥주"
    },
    {
      "name": "탈리스만",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "탈리스커",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "트리플섹",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "피나믹스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "피치 리큐르",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "하이네켄",
      "quantity": 29,
      "category": "맥주"
    },
    {
      "name": "헤네시 v.s.o.p",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "헤네시 x.o",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "호가든",
      "quantity": 0,
      "category": "맥주"
    }
  ],
  "삼성점": [
    {
      "name": "골든블루",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "그레나딘 시럽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "글렌라씨",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글렌리벳 12y",
      "quantity": 6,
      "category": "위스키"
    },
    {
      "name": "글렌리벳 15y",
      "quantity": 9,
      "category": "위스키"
    },
    {
      "name": "글렌모렌지 시그넷",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "글렌모렌지 오리지널1L",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "글렌모렌지12y 라산타",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌모렌지12y 오리지널",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌버기 15y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌버기12y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌피딕 12y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글렌피딕 12y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글렌피딕 15y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글렌피딕 15y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "기네스",
      "quantity": 17,
      "category": "맥주"
    },
    {
      "name": "달모어 12y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "달모어킹",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "데킬라",
      "quantity": 5,
      "category": "리큐르/시럽"
    },
    {
      "name": "돔페리뇽",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "돔페리뇽 빈티지",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "드라이 마티니",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "드럼부이",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "라임주스",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "럼",
      "quantity": 5,
      "category": "리큐르/시럽"
    },
    {
      "name": "레미마틴 vsop",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "로얄 21y (500ml)",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "로얄 21y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "론디아즈",
      "quantity": 0,
      "category": "리큐르/시럽"
    },
    {
      "name": "말리부",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "맥켈란 12y 더블캐스크",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "맥켈란 15y",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "맥켈란 18y",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "맥켈란12y트리플캐스크",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "맥코넬스",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "멈",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "멈로제",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "메론",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "모엣샹동",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "모엣샹동 로제",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "모히토 시럽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "미스터보스턴 버번",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "바나나 리큐르",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "바닐라",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "발렌타인 17y",
      "quantity": 9,
      "category": "위스키"
    },
    {
      "name": "발렌타인 21y",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "발렌타인 30y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "발렌타인 마스터즈",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "발베니 12y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "발베니 14y",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "발베니 21y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "버드와이저 생맥주",
      "quantity": 1,
      "category": "맥주"
    },
    {
      "name": "베일리스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "벨즈 위스키",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "보드카",
      "quantity": 5,
      "category": "리큐르/시럽"
    },
    {
      "name": "블랑",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "블랑 로제",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "블루 큐라소",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "수박시럽",
      "quantity": 4,
      "category": "리큐르/시럽"
    },
    {
      "name": "스텔라",
      "quantity": 0,
      "category": "맥주"
    },
    {
      "name": "스틸브룩 디럭스",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "시바스리갈 12y (700ml)",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "싱글톤",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아드백 10y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "아르망디",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아마레토 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "앙고스투라 비터스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "야마자키",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "얼그레이",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "엠페라도르 디럭스 스페셜 리저브",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "올드캐슬",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "자몽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "조니블루 (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "조니블루 (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "조니워커 블랙",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "존바 파이니스트",
      "quantity": 6,
      "category": "위스키"
    },
    {
      "name": "진",
      "quantity": 5,
      "category": "리큐르/시럽"
    },
    {
      "name": "청포도",
      "quantity": 0,
      "category": "리큐르/시럽"
    },
    {
      "name": "카발란",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "카프리",
      "quantity": 33,
      "category": "맥주"
    },
    {
      "name": "칼라일",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "칼루아",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "캔터키",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "코쿤 위스키",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "클라세 아줄 레포사도",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "탈리스만",
      "quantity": 4,
      "category": "위스키"
    },
    {
      "name": "탈리스커 10y",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "트리플섹",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "페리에쥬에",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "피나믹스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "피치",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "하이네캔",
      "quantity": 19,
      "category": "맥주"
    },
    {
      "name": "한맥 생맥주",
      "quantity": 2,
      "category": "맥주"
    },
    {
      "name": "헤네시 vsop",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "헤네시 xo",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "호가든",
      "quantity": 12,
      "category": "맥주"
    },
    {
      "name": "호세꾸엘보 1800 아네호",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "히비키 하모니",
      "quantity": 0,
      "category": "위스키"
    }
  ],
  "선릉점": [
    {
      "name": "1800아네호데킬라",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "골든블루",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "그레나딘",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "글랜모렌지 라산타 12y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 시그넷",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 오리지널",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "글랜모렌지 오리지널 1L",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 12y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 15y (500ml)",
      "quantity": 5,
      "category": "위스키"
    },
    {
      "name": "글랜피딕 15y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "글렌리벳 12y (700ml)",
      "quantity": 6,
      "category": "위스키"
    },
    {
      "name": "글렌리벳 15y (700ml)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "글렌버기 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "글렌버기 15y (700ml)",
      "quantity": 10,
      "category": "위스키"
    },
    {
      "name": "기네스",
      "quantity": 45,
      "category": "맥주"
    },
    {
      "name": "깔루아",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "달모어 12y",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "돔페리뇽",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "드럼부이",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "라임주스",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "럼",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "레미마틴 v.s.o.p",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "레미마틴 xo",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "로얄살루트 21y (500ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "로얄살루트 21y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "론디아즈 럼",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "마티니 드라이",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "말리부",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "맥켈란 12y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "맥켈란 15y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "맥켈란 18y (700ml)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "맥켈란 트리플캐스크12년700ml",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "맥코넬스",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "멈 그랑꼬르동",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "멈 그랑꼬르동 로제",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "메론 리큐르",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "모엣샹동",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "모엣샹동 로제",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "모히토 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "몬테주마 (데킬라)",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "바나나 리큐르",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "바톤 보드카",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "바톤 진",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "발렌타인 17y (500ml)",
      "quantity": 6,
      "category": "위스키"
    },
    {
      "name": "발렌타인 21y (500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "발렌타인 30y",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "발렌타인마스터즈(500ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "발베니 12y (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "발베니 14y (700ml)",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "베일리스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "블루큐라소",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "수박시럽",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "아드백10년",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아르망디",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "아마레토",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "아줄 데킬라",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "앙고스투라",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "야마자키",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "야마자키 DR",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "얼그레이 시럽",
      "quantity": 3,
      "category": "리큐르/시럽"
    },
    {
      "name": "자몽 시럽",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "조니워커 블랙",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "조니워커 블루 (500ml)",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "조니워커 블루 (700ml)",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "존바 파이니스트",
      "quantity": 10,
      "category": "위스키"
    },
    {
      "name": "짐빔",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "청포도 시럽",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "카발란",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "카프리",
      "quantity": 33,
      "category": "맥주"
    },
    {
      "name": "캔터키",
      "quantity": 3,
      "category": "위스키"
    },
    {
      "name": "탈리스커10년",
      "quantity": 1,
      "category": "위스키"
    },
    {
      "name": "트리플섹",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "피나믹스",
      "quantity": 2,
      "category": "리큐르/시럽"
    },
    {
      "name": "피치 리큐르",
      "quantity": 1,
      "category": "리큐르/시럽"
    },
    {
      "name": "하이네켄",
      "quantity": 14,
      "category": "맥주"
    },
    {
      "name": "헤네시 v.s.o.p",
      "quantity": 2,
      "category": "위스키"
    },
    {
      "name": "헤네시 x.o",
      "quantity": 0,
      "category": "위스키"
    },
    {
      "name": "호가든",
      "quantity": 21,
      "category": "맥주"
    },
    {
      "name": "히비키",
      "quantity": 1,
      "category": "위스키"
    }
  ]
};

const BOXHERO_CATEGORY_FALLBACK: Record<string, string> = {
  '샴페인': '위스키',
  '꼬냑': '위스키',
  '데킬라': '위스키',
  '보드카/진/럼': '리큐르/시럽',
};

// 엑셀 지점별 표현 차이/오타를 기존 웹앱 품목명으로 최대한 묶어 중복 품목 생성을 줄인다.
// 여기에 없는 제품은 엑셀 제품명 그대로 신규 등록한다.
const BOXHERO_ITEM_ALIASES: Record<string, string> = {
  '1800아네호데킬라': '1800 아네호',
  '아네호1800': '1800 아네호',
  '호세꾸엘보1800아네호': '1800 아네호',
  '글렌리벳12y': '글렌리벳 12y (700ml)',
  '글랜리벳12y700ml': '글렌리벳 12y (700ml)',
  '글렌리벳12y700ml': '글렌리벳 12y (700ml)',
  '글렌리벳15y': '글렌리벳 15y (700ml)',
  '글랜리벳15y700ml': '글렌리벳 15y (700ml)',
  '글렌리벳15y700ml': '글렌리벳 15y (700ml)',
  '글렌버기12y': '글렌버기 12y (700ml)',
  '글렌버기12y700ml': '글렌버기 12y (700ml)',
  '글랜버기12y700ml': '글렌버기 12y (700ml)',
  '글렌버기15y': '글렌버기 15y (700ml)',
  '글렌버기15y700ml': '글렌버기 15y (700ml)',
  '글랜버기15y700ml': '글렌버기 15y (700ml)',
  '글렌피딕12y500ml': '글랜피딕 12y (500ml)',
  '글랜피딕12y500ml': '글랜피딕 12y (500ml)',
  '글렌피딕12y700ml': '글랜피딕 12y (700ml)',
  '글랜피딕12y700ml': '글랜피딕 12y (700ml)',
  '글렌피딕15y500ml': '글랜피딕 15y (500ml)',
  '글랜피딕15y500ml': '글랜피딕 15y (500ml)',
  '글렌피딕15y700ml': '글랜피딕 15y (700ml)',
  '글랜피딕15y700ml': '글랜피딕 15y (700ml)',
  '글렌모렌지시그넷': '글랜모렌지 시그넷',
  '글랜모렌지시그넷': '글랜모렌지 시그넷',
  '글렌모렌지12y라산타': '글랜모렌지 라산타 12y',
  '글랜모렌지라산타12y': '글랜모렌지 라산타 12y',
  '글렌모렌지12y오리지널': '글랜모렌지 오리지널',
  '글랜모렌지오리지널': '글랜모렌지 오리지널',
  '글랜모렌지오리지널1l': '글랜모렌지 오리지널 1L',
  '글렌모렌지오리지널1l': '글랜모렌지 오리지널 1L',
  '글랜라씨': '글렌라씨',
  '로얄21y500ml': '로얄살루트 21y (500ml)',
  '로얄살루트21y500ml': '로얄살루트 21y (500ml)',
  '로얄21y700ml': '로얄살루트 21y (700ml)',
  '로얄살루트21y700ml': '로얄살루트 21y (700ml)',
  '맥켈란12y더블캐스크': '맥켈란 12y (700ml)',
  '맥켈란12y700ml': '맥켈란 12y (700ml)',
  '맥켈란15y': '맥켈란 15y (700ml)',
  '맥켈란15y700ml': '맥켈란 15y (700ml)',
  '맥켈란18y': '맥켈란 18y (700ml)',
  '맥켈란18y700ml': '맥켈란 18y (700ml)',
  '맥켈란12y트리플캐스크': '맥켈란 트리플캐스크12년700ml',
  '달모어': '달모어 12y',
  '달모어킹': '달모어 킹',
  '달모어킹알렉산더3세': '달모어 킹',
  '레미마틴vsop': '레미마틴 v.s.o.p',
  '레미마틴xo': '레미마틴 xo',
  '헤네시vsop': '헤네시 v.s.o.p',
  '헤네시xo': '헤네시 x.o',
  '멈': '멈 그랑꼬르동',
  '멈로제': '멈 그랑꼬르동 로제',
  '발렌타인17y': '발렌타인 17y (500ml)',
  '발렌타인21y': '발렌타인 21y (500ml)',
  '발렌타인마스터즈500ml': '발렌타인 마스터즈',
  '발베니12y': '발베니 12y (700ml)',
  '발베니14y': '발베니 14y (700ml)',
  '조니워커블랙': '조니워커 블랙 (500ml)',
  '조니블루500ml': '조니워커 블루 (500ml)',
  '조니워커블루500ml': '조니워커 블루 (500ml)',
  '조니블루700ml': '조니워커 블루 (700ml)',
  '조니워커블루700ml': '조니워커 블루 (700ml)',
  '미스터보스턴': '미스터보스턴 버번 1L',
  '미스터보스턴버번': '미스터보스턴 버번 1L',
  '미스터보스턴버번1l': '미스터보스턴 버번 1L',
  '스틸브룩': '스틸브룩 디럭스',
  '스틸브룩디럭스': '스틸브룩 디럭스',
  '시바스리갈12y700ml': '시바스리갈 12y',
  '아드백': '아드백 10y',
  '아드백10년': '아드백 10y',
  '탈리스커': '탈리스커 10y',
  '탈리스커10년': '탈리스커 10y',
  '히비키': '히비키 하모니',
  '코쿤': '코쿤위스키 (2.7L)',
  '코쿤위스키': '코쿤위스키 (2.7L)',
  '코쿤무제한': '코쿤위스키 (2.7L)',
  '탈리스만무제한': '탈리스만',
  '벨즈무제한': '벨즈',
  '그레나딘시럽': '그레나딘',
  '메론': '메론 리큐르',
  '드라이마티니': '마티니 드라이',
  '바닐라': '바닐라 시럽',
  '보드카': '바톤 보드카',
  '진': '바톤 진',
  '블루큐라소': '블루큐라소',
  '앙고스투라비터스': '앙고스투라',
  '아마레토시럽': '아마레토',
  '얼그레이': '얼그레이 시럽',
  '자몽': '자몽 시럽',
  '청포도': '청포도 시럽',
  '피치': '피치 리큐르',
  '칼루아': '깔루아',
  '하이네캔': '하이네켄',
  '버드와이저생': '버드와이저 생맥주',
  '버드와이저생맥': '버드와이저 생맥주',
  '버드와이저생맥주': '버드와이저 생맥주',
  '한맥생맥': '한맥 생맥주',
};


async function requireStoreAccount(ctx: any) {
  const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
  if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
  await ensureCanonicalStoreAccounts();
  const account = await getStoreAccountById(payload.accountId);
  if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
  return account;
}

async function ensureLiquorTables(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorItems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT '기타',
    unitCost DECIMAL(15,0) NOT NULL DEFAULT 0,
    isActive INT NOT NULL DEFAULT 1,
    sortOrder INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorInventories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branchId INT NOT NULL,
    liquorItemId INT NOT NULL,
    currentStock DECIMAL(12,2) NOT NULL DEFAULT 0,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_liquor_inventory_branch_item (branchId, liquorItemId)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorStockMovements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branchId INT NOT NULL,
    liquorItemId INT NOT NULL,
    date VARCHAR(10) NOT NULL,
    type ENUM('IN','OUT','ADJUST') NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    unitCost DECIMAL(15,0) NOT NULL DEFAULT 0,
    totalCost DECIMAL(15,0) NOT NULL DEFAULT 0,
    memo TEXT NULL,
    createdBy INT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_liquor_movement_branch_date (branchId, date),
    INDEX idx_liquor_movement_item (liquorItemId)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorSeedMeta (
    seedKey VARCHAR(120) PRIMARY KEY,
    appliedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorHiddenItems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branchId INT NOT NULL,
    liquorItemId INT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_liquor_hidden_branch_item (branchId, liquorItemId)
  )`);
}


function normalizeLiquorSeedKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s()\[\]{}._\-\/\\]/g, '')
    .replace(/년/g, 'y')
    .replace(/㎖|ml/gi, 'ml')
    .replace(/리큐르시럽/g, '리큐르')
    .trim();
}

function normalizeBranchSeedKey(value: string): string {
  return String(value || '').replace(/\s/g, '').trim();
}

function getCanonicalLiquorName(rawName: string): string {
  const clean = String(rawName || '').replace(/\s+/g, ' ').trim();
  const key = normalizeLiquorSeedKey(clean);
  return BOXHERO_ITEM_ALIASES[key] || clean;
}

function getSeedCategory(rawCategory: string): string {
  const mapped = BOXHERO_CATEGORY_FALLBACK[rawCategory] || rawCategory || '위스키';
  if (mapped === '맥주') return '맥주';
  if (mapped.includes('리큐르') || mapped.includes('시럽')) return '리큐르/시럽';
  return '위스키';
}

async function ensureBoxHeroBranchStockSeeded(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return;
  await ensureLiquorTables(db);
  const existingSeed: any = await db.execute(sql`SELECT seedKey FROM liquorSeedMeta WHERE seedKey = ${BOXHERO_STOCK_SEED_VERSION} LIMIT 1`);
  const seedRows = Array.isArray(existingSeed) ? existingSeed[0] : [];
  if (Array.isArray(seedRows) && seedRows.length > 0) return;

  const allBranches = await db.select().from(branches);
  const branchByKey = new Map(allBranches.map(branch => [normalizeBranchSeedKey(branch.name), branch]));
  const currentItems = await db.select().from(liquorItems).orderBy(liquorItems.sortOrder, liquorItems.name);
  const itemByKey = new Map<string, typeof currentItems[number]>();
  for (const item of currentItems) {
    itemByKey.set(normalizeLiquorSeedKey(item.name), item);
  }
  const defaultCostByKey = new Map(DEFAULT_LIQUOR_ITEMS.map(item => [normalizeLiquorSeedKey(item.name), item.unitCost]));
  let nextSortOrder = currentItems.length + 1;

  const getOrCreateItem = async (rawName: string, rawCategory: string) => {
    const canonicalName = getCanonicalLiquorName(rawName);
    const canonicalKey = normalizeLiquorSeedKey(canonicalName);
    const rawKey = normalizeLiquorSeedKey(rawName);
    let item = itemByKey.get(canonicalKey) || itemByKey.get(rawKey);
    if (item) return item;

    const unitCost = defaultCostByKey.get(canonicalKey) || defaultCostByKey.get(rawKey) || 0;
    const category = getSeedCategory(rawCategory);
    const result = await db.insert(liquorItems).values({
      name: canonicalName,
      category,
      unitCost: String(unitCost),
      isActive: 1,
      sortOrder: nextSortOrder++,
    });
    const insertId = Number((result as any).insertId || 0);
    if (insertId) {
      const [created] = await db.select().from(liquorItems).where(eq(liquorItems.id, insertId)).limit(1);
      if (created) {
        itemByKey.set(canonicalKey, created);
        itemByKey.set(rawKey, created);
        return created;
      }
    }
    const [fallback] = await db.select().from(liquorItems).where(eq(liquorItems.name, canonicalName)).limit(1);
    if (!fallback) throw new Error(`주류 품목 생성 실패: ${canonicalName}`);
    itemByKey.set(canonicalKey, fallback);
    itemByKey.set(rawKey, fallback);
    return fallback;
  };

  for (const [branchName, rows] of Object.entries(BOXHERO_BRANCH_STOCKS)) {
    const branch = branchByKey.get(normalizeBranchSeedKey(branchName));
    if (!branch) {
      console.warn(`[liquor-seed] 지점 매칭 실패: ${branchName}`);
      continue;
    }

    for (const row of rows) {
      const item = await getOrCreateItem(row.name, row.category);
      const qty = Number(row.quantity || 0);
      const [existingInventory] = await db.select().from(liquorInventories)
        .where(and(eq(liquorInventories.branchId, branch.id), eq(liquorInventories.liquorItemId, item.id)))
        .limit(1);
      if (existingInventory) {
        await db.update(liquorInventories)
          .set({ currentStock: String(qty) })
          .where(eq(liquorInventories.id, existingInventory.id));
      } else {
        await db.insert(liquorInventories).values({ branchId: branch.id, liquorItemId: item.id, currentStock: String(qty) });
      }
    }
  }

  await db.execute(sql`INSERT INTO liquorSeedMeta (seedKey) VALUES (${BOXHERO_STOCK_SEED_VERSION})`);
  console.log(`[liquor-seed] BoxHero 지점별 재고 반영 완료: ${BOXHERO_STOCK_SEED_VERSION}`);
}

async function ensureLiquorSeeded(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return;
  await ensureLiquorTables(db);
  const existing = await db.select({ id: liquorItems.id }).from(liquorItems).limit(1);
  if (existing.length === 0) {
    await db.insert(liquorItems).values(DEFAULT_LIQUOR_ITEMS.map((item, idx) => ({
      name: item.name,
      category: getSeedCategory(item.category),
      unitCost: String(item.unitCost),
      isActive: 1,
      sortOrder: idx,
    })));
  }
  await ensureBoxHeroBranchStockSeeded(db);
}

async function parseStoreCookie(cookieHeader: string | undefined, authHeader?: string) {
  // 1) Authorization: Bearer <token> 헤더 우선 확인
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  // 2) 헤더 없으면 쿠키에서 확인
  if (!token && cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=')];
      })
    );
    token = cookies[COOKIE_NAME];
  }
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (payload.type !== 'store') return null;
    return payload as { accountId: number; loginId: string; role: string; type: string };
  } catch {
    return null;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // 자체 아이디/비밀번호 로그인
    loginWithPassword: publicProcedure
      .input(z.object({
        loginId: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        await ensureCanonicalStoreAccounts();
        const account = await getStoreAccountByLoginId(input.loginId);
        if (!account) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '아이디 또는 비밀번호가 올바르지 않습니다' });
        }

        const isValid = await bcrypt.compare(input.password, account.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '아이디 또는 비밀번호가 올바르지 않습니다' });
        }

        const token = await createStoreSessionToken(account.id, account.loginId, account.role);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        let branch = null;
        if (account.branchId) {
          branch = await getBranchById(account.branchId);
        }

        return {
          success: true,
          token, // localStorage에 저장하여 Authorization 헤더로 전달
          account: {
            id: account.id,
            loginId: account.loginId,
            displayName: account.displayName,
            role: account.role,
            branchId: account.branchId,
            branch,
          },
        };
      }),

    // 자체 계정 현재 사용자 조회
    storeMe: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
      if (!payload) return null;

      await ensureCanonicalStoreAccounts();
      const account = await getStoreAccountById(payload.accountId);
      if (!account) return null;

      let branch = null;
      if (account.branchId) {
        branch = await getBranchById(account.branchId);
      }

      let allBranches = null;
      if (account.role === 'admin') {
        const db = await getDb();
        if (db) {
          allBranches = await db.select().from(branches).orderBy(branches.name);
        }
      }

      return {
        id: account.id,
        loginId: account.loginId,
        displayName: account.displayName,
        role: account.role,
        branchId: account.branchId,
        branch,
        allBranches,
      };
    }),
  }),

  push: router({
    subscribe: protectedProcedure
      .input(z.object({ endpoint: z.string(), p256dh: z.string(), auth: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await savePushSubscription({ userId: ctx.user.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth });
        return { success: true };
      }),
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await deletePushSubscription(input.endpoint);
        return { success: true };
      }),
    test: protectedProcedure.mutation(async ({ ctx }) => {
      const subs = await getPushSubscriptionsByOpenId(ctx.user.openId);
      if (subs.length === 0) return { success: false, message: "구독 없음" };
      const payload = JSON.stringify({ title: "매출 보고 알림 테스트", body: "푸시 알림이 정상적으로 작동합니다! ✅" });
      for (const sub of subs) {
        try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload); }
        catch (err: any) { if (err.statusCode === 410) await deletePushSubscription(sub.endpoint); }
      }
      return { success: true };
    }),
  }),

  branch: router({
    myBranches: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (ctx.user.role === 'admin') return db.select().from(branches).orderBy(branches.name);
      const managed = await db.select({ branch: branches }).from(branchManagers)
        .innerJoin(branches, eq(branchManagers.branchId, branches.id))
        .where(eq(branchManagers.userId, ctx.user.id));
      return managed.map(r => r.branch);
    }),
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(branches).orderBy(branches.name);
    }),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const branch = await createBranch({ name: input.name, code: input.code, ownerId: ctx.user.id });
        return { success: true, branch };
      }),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1), code: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(branches).set({ name: input.name, code: input.code }).where(eq(branches.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.delete(branches).where(eq(branches.id, input.id));
        return { success: true };
      }),
  }),

  user: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const allUsers = await db.select().from(users).orderBy(users.name);
      return Promise.all(allUsers.map(async (u) => {
        const managed = await db.select({ branch: branches }).from(branchManagers)
          .innerJoin(branches, eq(branchManagers.branchId, branches.id))
          .where(eq(branchManagers.userId, u.id));
        return { ...u, assignedBranches: managed.map(r => r.branch) };
      }));
    }),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(['user', 'admin']) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    assignBranch: adminProcedure
      .input(z.object({ userId: z.number(), branchId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const existing = await db.select().from(branchManagers)
          .where(and(eq(branchManagers.userId, input.userId), eq(branchManagers.branchId, input.branchId))).limit(1);
        if (existing.length === 0) {
          await db.insert(branchManagers).values({ userId: input.userId, branchId: input.branchId, role: 'manager' });
        }
        return { success: true };
      }),
    unassignBranch: adminProcedure
      .input(z.object({ userId: z.number(), branchId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.delete(branchManagers).where(and(eq(branchManagers.userId, input.userId), eq(branchManagers.branchId, input.branchId)));
        return { success: true };
      }),
  }),

  // storeAccount 관리 API
  storeAccount: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
      if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
      const accounts = await getAllStoreAccounts();
      const db = await getDb();
      const allBranches = db ? await db.select().from(branches) : [];
      return accounts.map(acc => ({
        id: acc.id, loginId: acc.loginId, displayName: acc.displayName,
        role: acc.role, branchId: acc.branchId, createdAt: acc.createdAt,
        branch: allBranches.find(b => b.id === acc.branchId) || null,
      }));
    }),
    create: publicProcedure
      .input(z.object({
        loginId: z.string().min(1).max(50),
        password: z.string().min(1),
        displayName: z.string().optional(),
        role: z.enum(['user', 'admin']).default('user'),
        branchId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        const existing = await getStoreAccountByLoginId(input.loginId);
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: '이미 사용 중인 아이디입니다' });
        const passwordHash = await bcrypt.hash(input.password, 10);
        const account = await createStoreAccount({
          loginId: input.loginId, passwordHash,
          displayName: input.displayName || input.loginId,
          role: input.role, branchId: input.branchId || null,
        });
        return { success: true, account };
      }),
    changePassword: publicProcedure
      .input(z.object({ accountId: z.number(), newPassword: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateStoreAccount(input.accountId, { passwordHash });
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        await deleteStoreAccount(input.accountId);
        return { success: true };
      }),
    assignBranch: publicProcedure
      .input(z.object({ accountId: z.number(), branchId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        await updateStoreAccount(input.accountId, { branchId: input.branchId });
        return { success: true };
      }),
    branchList: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
      if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(branches).orderBy(branches.name);
    }),
  }),

  // 매출 기록 API (storeAccount 기반)
  storeSales: router({
    getRecord: publicProcedure
      .input(z.object({ branchId: z.number(), date: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== input.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
        }
        const record = await getDailySalesRecord(input.branchId, input.date);
        if (!record) return null;
        const posStart = parseInt(record.posStartAmount || '0') || 0;
        const posEnd = parseInt(record.posEndAmount || '0') || 0;
        // 기존 레코드가 있는데 POS 시작금/마감금이 0이면, 이전 유효 마감금으로 화면 표시값 보정
        // 테이블 기록 자동반영 등이 POS를 0으로 만든 경우 다음날 시작금 끊김 방지
        if (posStart <= 0 && posEnd <= 0) {
          const prevPosRecord = await getPrevDailySalesRecordWithPosEnd(input.branchId, input.date);
          const fallbackStart = parseInt(prevPosRecord?.posEndAmount || '0') || 0;
          if (fallbackStart > 0) {
            const expenses = Array.isArray(record.expenses) ? record.expenses : [];
            const expenseTotal = (expenses as Array<{ amount?: string }>).reduce((s, e) => s + (parseInt(e.amount || '0') || 0), 0);
            const cashDepositVal = parseInt(record.cashDeposit || '0') || 0;
            const dateObj = new Date(input.date + 'T12:00:00');
            const isSunday = dateObj.getDay() === 0;
            return {
              ...record,
              posStartAmount: String(fallbackStart),
              posEndAmount: String(isSunday ? fallbackStart : fallbackStart - expenseTotal + cashDepositVal),
            };
          }
        }
        return record;
      }),
    getPrevRecord: publicProcedure
      .input(z.object({ branchId: z.number(), date: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== input.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
        }
        // input.date 이전의 가장 최근 기록을 반환 (하루 전 고정 조회 아님)
        return getPrevDailySalesRecordWithPosEnd(input.branchId, input.date);
      }),
    getRecords: publicProcedure
      .input(z.object({ branchId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== input.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
        }
        return getDailySalesRecordsByDateRange(input.branchId, input.startDate, input.endDate);
      }),
    save: publicProcedure
      .input(z.object({
        branchId: z.number(), date: z.string(),
        posStartAmount: z.string().default('0'), cash: z.string().default('0'), card: z.string().default('0'),
        cashTotal: z.string().default('0'), cardTotal: z.string().default('0'), posEndAmount: z.string().default('0'),
        cashDeposit: z.string().optional(),
        expenses: z.array(z.object({ id: z.string(), description: z.string(), amount: z.string() })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== input.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
        }
        // cashTotal/cardTotal 서버 재계산 (중간 날짜 누락 보정 포함)
        const prevRec = await getPrevDailySalesRecord(input.branchId, input.date);
        const dateObj = new Date(input.date + 'T12:00:00');
        const isSunday = dateObj.getDay() === 0;
        const todayCash = parseInt(input.cash || '0') || 0;
        const todayCard = parseInt(input.card || '0') || 0;
        const { cashTotal: computedCashTotal, cardTotal: computedCardTotal } = await computeCumulativesForDate(
          input.branchId, input.date, prevRec ?? null, todayCash, todayCard
        );
        // posEndAmount 서버 재계산
        const prevPosRecord = await getPrevDailySalesRecordWithPosEnd(input.branchId, input.date);
        const fallbackPosStart = parseInt(prevPosRecord?.posEndAmount || '0') || 0;
        const inputPosStart = parseInt(input.posStartAmount || '0') || 0;
        const posStartVal = inputPosStart > 0 ? inputPosStart : fallbackPosStart;
        const expenseTotal = (input.expenses || []).reduce((s, e) => s + (parseInt(e.amount || '0') || 0), 0);
        const cashDepositVal = parseInt(input.cashDeposit || '0') || 0;
        const computedPosEnd = isSunday ? posStartVal : posStartVal - expenseTotal + cashDepositVal;
        const record = await upsertDailySalesRecord({
          branchId: input.branchId, date: input.date,
          posStartAmount: String(posStartVal), cash: input.cash, card: input.card,
          cashTotal: String(computedCashTotal), cardTotal: String(computedCardTotal),
          posEndAmount: String(computedPosEnd),
          cashDeposit: input.cashDeposit ?? '0',
          expenses: input.expenses, submittedAt: new Date(),
        });
        // 저장 후 이후 날짜들의 posStart/posEnd 연쇄 재계산
        try { await cascadeUpdatePosAmounts(input.branchId, input.date); } catch (e) { console.error("[cascadeUpdatePosAmounts 오류]", e); }
        // 저장 후 이후 날짜들의 cashTotal/cardTotal 연쇄 재계산
        try { await cascadeUpdateCumulativeAmounts(input.branchId, input.date); } catch (e) { console.error("[cascadeUpdateCumulativeAmounts 오류]", e); }
        const branch = await getBranchById(input.branchId);
        const branchName = branch?.name ?? '알 수 없는 지점';
        const fmt = (v: string) => { const n = Number((v||''). replace(/,/g,'')); return isNaN(n)||n===0?'—':`₩${n.toLocaleString('ko-KR')}`; };
        const dailyTotal = Number(input.cash||0)+Number(input.card||0);
        const title = `[${branchName}] ${input.date} 매출 보고`;
        const body = `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)} | 합계: ₩${dailyTotal.toLocaleString('ko-KR')}`;
        const expenseLines = input.expenses.filter(e=>e.description&&e.amount).map(e=>`• ${e.description}: ${fmt(e.amount)}`).join('\n');
        const content = [`📍 지점: ${branchName}`,`📅 날짜: ${input.date}`,'','💰 오늘 매출',`  현금: ${fmt(input.cash)}`,`  카드: ${fmt(input.card)}`,`  합계: ₩${dailyTotal.toLocaleString('ko-KR')}`, ...(expenseLines?['',"🧾 지출 내역",expenseLines]:[])].join('\n');
        try { await notifyOwner({ title, content }); } catch {}
        let pushSent = false;
        if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
          try {
            const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
            for (const sub of subs) {
              try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body })); pushSent = true; }
              catch (err: any) { if (err.statusCode === 410) await deletePushSubscription(sub.endpoint); }
            }
          } catch {}
        }
        return { success: true, record, pushSent };
      }),
    adminDailyDetail: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        // storeAccount 관리자 OR Manus OAuth 관리자 모두 허용
        const storePayload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        const isStoreAdmin = storePayload?.role === 'admin';
        const isOAuthAdmin = ctx.user?.role === 'admin';
        if (!isStoreAdmin && !isOAuthAdmin) throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        const db = await getDb();
        if (!db) return [];
        const allBranches = await db.select().from(branches).orderBy(branches.name);
        const records = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.date, input.date));
        // 테이블 기록도 함께 조회
        const tableReportRows = await db.select().from(tableReports).where(eq(tableReports.date, input.date));
        const reportIds = tableReportRows.map(r => r.id);
        const tableItemRows = reportIds.length > 0
          ? await db.select().from(tableItems).where(inArray(tableItems.tableReportId, reportIds))
          : [];
        // 출근자 인센티브도 함께 조회
        const incentiveRows = reportIds.length > 0
          ? await db.select().from(staffIncentives).where(inArray(staffIncentives.tableReportId, reportIds)).orderBy(staffIncentives.sortOrder, staffIncentives.createdAt)
          : [];
        return allBranches.map(branch => ({
          branch,
          record: records.find(r => r.branchId === branch.id) || null,
          tableReport: (() => {
            const tr = tableReportRows.find(r => r.branchId === branch.id);
            if (!tr) return null;
            return {
              ...tr,
              items: tableItemRows.filter(i => i.tableReportId === tr.id),
              incentives: incentiveRows.filter(i => i.tableReportId === tr.id),
            };
          })(),
        }));
      }),
    adminSummary: publicProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ ctx, input }) => {
        const storePayload2 = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        const isStoreAdmin2 = storePayload2?.role === 'admin';
        const isOAuthAdmin2 = ctx.user?.role === 'admin';
        if (!isStoreAdmin2 && !isOAuthAdmin2) throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        const db = await getDb();
        if (!db) return { byBranch: [], byDate: [] };
        const allBranches = await db.select().from(branches).orderBy(branches.name);
        const records = await db.select().from(dailySalesRecords).orderBy(desc(dailySalesRecords.date));
        const filtered = records.filter(r => r.date >= input.startDate && r.date <= input.endDate);
        const byBranch = allBranches.map(branch => {
          const br = filtered.filter(r => r.branchId === branch.id);
          const totalCash = br.reduce((s,r)=>s+Number(r.cash||0),0);
          const totalCard = br.reduce((s,r)=>s+Number(r.card||0),0);
          const totalExpense = br.reduce((s,r)=>s+(r.expenses as any[]).reduce((ss:number,e:any)=>ss+Number(e.amount||0),0),0);
          return { branch, totalCash, totalCard, total: totalCash+totalCard, totalExpense, recordCount: br.length };
        });
        const dateMap: Record<string,{totalCash:number;totalCard:number;total:number}> = {};
        filtered.forEach(r => {
          if (!dateMap[r.date]) dateMap[r.date]={totalCash:0,totalCard:0,total:0};
          dateMap[r.date].totalCash+=Number(r.cash||0); dateMap[r.date].totalCard+=Number(r.card||0); dateMap[r.date].total+=Number(r.cash||0)+Number(r.card||0);
        });
        const byDate = Object.entries(dateMap).map(([date,data])=>({date,...data})).sort((a,b)=>b.date.localeCompare(a.date));
        return { byBranch, byDate };
      }),
    analyzeImage: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });

        // base64 → Buffer → S3 업로드
        const base64Data = input.imageBase64.replace(/^data:[^;]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const ext = input.mimeType.includes('png') ? 'png' : 'jpg';
        const fileKey = `pos-analysis/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url: imageUrl } = await storagePut(fileKey, imageBuffer, input.mimeType);

        // LLM Vision으로 포스기 화면 분석
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: '당신은 한국 카페/음식점 포스기 주문내역 이미지를 분석하는 전문가입니다. 이미지에서 현금 매출, 카드 매출, 지출 항목을 추출합니다.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url' as const,
                  image_url: { url: imageUrl, detail: 'high' as const },
                },
                {
                  type: 'text' as const,
                  text: `이 포스기 주문내역 이미지에서 다음 정보를 추출해주세요:\n1. 현금 매출 합계 (cash): 현금으로 결제된 총 금액\n2. 카드 매출 합계 (card): 카드/신용카드/체크카드로 결제된 총 금액\n3. 지출 항목 (expenses): 지출/비용 항목이 있다면 각 항목의 이름과 금액\n\n숫자는 원화 기준 정수로만 반환하세요 (쉼표, 원 기호 없이). 해당 항목이 없거나 확인 불가하면 0으로 반환하세요.`,
                },
              ],
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'pos_analysis',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  cash: { type: 'integer', description: '현금 매출 합계 (원)' },
                  card: { type: 'integer', description: '카드 매출 합계 (원)' },
                  expenses: {
                    type: 'array',
                    description: '지출 항목 목록',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string', description: '지출 항목명' },
                        amount: { type: 'integer', description: '지출 금액 (원)' },
                      },
                      required: ['description', 'amount'],
                      additionalProperties: false,
                    },
                  },
                  confidence: { type: 'string', description: '분석 신뢰도: high/medium/low' },
                  note: { type: 'string', description: '분석 시 참고사항이나 불확실한 부분' },
                },
                required: ['cash', 'card', 'expenses', 'confidence', 'note'],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices?.[0]?.message?.content;
        if (!rawContent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI 분석 결과를 받지 못했습니다' });
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        const result = JSON.parse(content);
        return {
          cash: String(result.cash || 0),
          card: String(result.card || 0),
          expenses: (result.expenses || []).map((e: { description: string; amount: number }, i: number) => ({
            id: `exp_ai_${Date.now()}_${i}`,
            description: e.description,
            amount: String(e.amount),
          })),
          confidence: result.confidence as string,
          note: result.note as string,
        };
      }),
  }),

  // 기존 Manus OAuth 기반 매출 API (하위 호환)
  sales: router({
    getRecord: protectedProcedure
      .input(z.object({ branchId: z.number(), date: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return null;
          const managed = await db.select().from(branchManagers)
            .where(and(eq(branchManagers.userId, ctx.user.id), eq(branchManagers.branchId, input.branchId))).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }
        return getDailySalesRecord(input.branchId, input.date);
      }),
    getRecords: protectedProcedure
      .input(z.object({ branchId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return [];
          const managed = await db.select().from(branchManagers)
            .where(and(eq(branchManagers.userId, ctx.user.id), eq(branchManagers.branchId, input.branchId))).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }
        return getDailySalesRecordsByDateRange(input.branchId, input.startDate, input.endDate);
      }),
    save: protectedProcedure
      .input(z.object({
        branchId: z.number(), date: z.string(),
        posStartAmount: z.string().default('0'), cash: z.string().default('0'), card: z.string().default('0'),
        cashTotal: z.string().default('0'), cardTotal: z.string().default('0'), posEndAmount: z.string().default('0'),
        cashDeposit: z.string().optional(),
        expenses: z.array(z.object({ id: z.string(), description: z.string(), amount: z.string() })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return { success: false };
          const managed = await db.select().from(branchManagers)
            .where(and(eq(branchManagers.userId, ctx.user.id), eq(branchManagers.branchId, input.branchId))).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }
        // cashTotal/cardTotal 서버 재계산 (중간 날짜 누락 보정 포함)
        const prevRec2 = await getPrevDailySalesRecord(input.branchId, input.date);
        const dateObj2 = new Date(input.date + 'T12:00:00');
        const isSunday2 = dateObj2.getDay() === 0;
        const todayCash2 = parseInt(input.cash || '0') || 0;
        const todayCard2 = parseInt(input.card || '0') || 0;
        const { cashTotal: computedCashTotal2, cardTotal: computedCardTotal2 } = await computeCumulativesForDate(
          input.branchId, input.date, prevRec2 ?? null, todayCash2, todayCard2
        );
        // posEndAmount 서버 재계산
        const prevPosRecord2 = await getPrevDailySalesRecordWithPosEnd(input.branchId, input.date);
        const fallbackPosStart2 = parseInt(prevPosRecord2?.posEndAmount || '0') || 0;
        const inputPosStart2 = parseInt(input.posStartAmount || '0') || 0;
        const posStartVal2 = inputPosStart2 > 0 ? inputPosStart2 : fallbackPosStart2;
        const expenseTotal2 = (input.expenses || []).reduce((s, e) => s + (parseInt(e.amount || '0') || 0), 0);
        const cashDepositVal2 = parseInt(input.cashDeposit || '0') || 0;
        const computedPosEnd2 = isSunday2 ? posStartVal2 : posStartVal2 - expenseTotal2 + cashDepositVal2;
        const record = await upsertDailySalesRecord({
          branchId: input.branchId, date: input.date,
          posStartAmount: String(posStartVal2), cash: input.cash, card: input.card,
          cashTotal: String(computedCashTotal2), cardTotal: String(computedCardTotal2),
          posEndAmount: String(computedPosEnd2),
          cashDeposit: input.cashDeposit ?? '0',
          expenses: input.expenses,
          submittedBy: ctx.user.id, submittedAt: new Date(),
        });
        // 저장 후 이후 날짜들의 posStart/posEnd 연쇄 재계산
        try { await cascadeUpdatePosAmounts(input.branchId, input.date); } catch (e) { console.error("[cascadeUpdatePosAmounts 오류]", e); }
        // 저장 후 이후 날짜들의 cashTotal/cardTotal 연쇄 재계산
        try { await cascadeUpdateCumulativeAmounts(input.branchId, input.date); } catch (e) { console.error("[cascadeUpdateCumulativeAmounts 오류]", e); }
        const branch = await getBranchById(input.branchId);
        const branchName = branch?.name ?? '알 수 없는 지점';
        const fmt = (v: string) => { const n = Number((v||''). replace(/,/g,'')); return isNaN(n)||n===0?'—':`₩${n.toLocaleString('ko-KR')}`; };
        const dailyTotal = Number(input.cash||0)+Number(input.card||0);
        const title = `[${branchName}] ${input.date} 매출 보고`;
        const body = `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)} | 합계: ₩${dailyTotal.toLocaleString('ko-KR')}`;
        try { await notifyOwner({ title, content: body }); } catch {}
        let pushSent = false;
        if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
          try {
            const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
            for (const sub of subs) {
              try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body })); pushSent = true; }
              catch (err: any) { if (err.statusCode === 410) await deletePushSubscription(sub.endpoint); }
            }
          } catch {}
        }
        return { success: true, record, pushSent };
      }),
    adminSummary: adminProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { byBranch: [], byDate: [] };
        const allBranches = await db.select().from(branches).orderBy(branches.name);
        const records = await db.select().from(dailySalesRecords).orderBy(desc(dailySalesRecords.date));
        const filtered = records.filter(r => r.date >= input.startDate && r.date <= input.endDate);
        const byBranch = allBranches.map(branch => {
          const br = filtered.filter(r => r.branchId === branch.id);
          const totalCash = br.reduce((s,r)=>s+Number(r.cash||0),0);
          const totalCard = br.reduce((s,r)=>s+Number(r.card||0),0);
          const totalExpense = br.reduce((s,r)=>s+(r.expenses as any[]).reduce((ss:number,e:any)=>ss+Number(e.amount||0),0),0);
          return { branch, totalCash, totalCard, total: totalCash+totalCard, totalExpense, recordCount: br.length };
        });
        const dateMap: Record<string,{totalCash:number;totalCard:number;total:number}> = {};
        filtered.forEach(r => {
          if (!dateMap[r.date]) dateMap[r.date]={totalCash:0,totalCard:0,total:0};
          dateMap[r.date].totalCash+=Number(r.cash||0); dateMap[r.date].totalCard+=Number(r.card||0); dateMap[r.date].total+=Number(r.cash||0)+Number(r.card||0);
        });
        const byDate = Object.entries(dateMap).map(([date,data])=>({date,...data})).sort((a,b)=>b.date.localeCompare(a.date));
        return { byBranch, byDate };
      }),
    adminDailyDetail: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const allBranches = await db.select().from(branches).orderBy(branches.name);
        const records = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.date, input.date));
        // 테이블 기록도 함께 조회
        const tableReportRows = await db.select().from(tableReports).where(eq(tableReports.date, input.date));
        const reportIds = tableReportRows.map(r => r.id);
        const tableItemRows = reportIds.length > 0
          ? await db.select().from(tableItems).where(inArray(tableItems.tableReportId, reportIds))
          : [];
        const incentiveRows = reportIds.length > 0
          ? await db.select().from(staffIncentives).where(inArray(staffIncentives.tableReportId, reportIds)).orderBy(staffIncentives.sortOrder, staffIncentives.createdAt)
          : [];
        return allBranches.map(branch => ({
          branch,
          record: records.find(r => r.branchId === branch.id) || null,
          tableReport: (() => {
            const tr = tableReportRows.find(r => r.branchId === branch.id);
            if (!tr) return null;
            return {
              ...tr,
              items: tableItemRows.filter(i => i.tableReportId === tr.id),
              incentives: incentiveRows.filter(i => i.tableReportId === tr.id),
            };
          })(),
        }));
      }),
    notify: publicProcedure
      .input(z.object({
        branch: z.string(), date: z.string(), cash: z.string(), card: z.string(),
        dailyTotal: z.string(), cashTotal: z.string(), cardTotal: z.string(), grandTotal: z.string(),
        posStartAmount: z.string(), posEndAmount: z.string(), cashDeposit: z.string().optional(),
        expenses: z.array(z.object({ description: z.string(), amount: z.string() })),
      }))
      .mutation(async ({ input }) => {
        const fmt = (v: string) => { const n = Number((v||''). replace(/,/g,'')); return isNaN(n)||n===0?'—':`₩${n.toLocaleString('ko-KR')}`; };
        const title = `[${input.branch}] ${input.date} 매출 보고`;
        const body = `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)} | 합계: ${fmt(input.dailyTotal)}`;
        try { await notifyOwner({ title, content: body }); } catch {}
        let pushSent = false;
        if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
          try {
            const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
            for (const sub of subs) {
              try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body })); pushSent = true; }
              catch (err: any) { if (err.statusCode === 410) await deletePushSubscription(sub.endpoint); }
            }
          } catch {}
        }
        return { success: true, pushSent };
      }),
  }),
  liquor: router({
    overview: publicProcedure
      .input(z.object({ date: z.string(), branchId: z.number().optional(), includeInactive: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        const db = await getDb();
        if (!db) return { branches: [], items: [], inventories: [], movements: [], branchSummaries: [], totals: { stock: 0, inQty: 0, outQty: 0, outCost: 0 } };
        await ensureLiquorSeeded(db);

        const allBranches = account.role === 'admin'
          ? await db.select().from(branches).orderBy(branches.name)
          : (account.branchId ? await db.select().from(branches).where(eq(branches.id, account.branchId)) : []);
        const allowedBranchIds = allBranches.map(b => b.id);
        const selectedBranchIds = account.role === 'admin' && input.branchId
          ? allowedBranchIds.filter(id => id === input.branchId)
          : allowedBranchIds;
        if (selectedBranchIds.length === 0) {
          return { branches: allBranches, items: [], inventories: [], movements: [], branchSummaries: [], totals: { stock: 0, inQty: 0, outQty: 0, outCost: 0 } };
        }

        const itemRows = await db.select().from(liquorItems).orderBy(liquorItems.sortOrder, liquorItems.name);
        let activeItems = input.includeInactive ? itemRows : itemRows.filter(i => Number(i.isActive) === 1);
        // 선택 지점에서 삭제한 품목은 관리자/매니저/직원 모두 해당 지점 화면에서 숨김 처리
        if (selectedBranchIds.length === 1) {
          const hiddenResult: any = await db.execute(sql`SELECT liquorItemId FROM liquorHiddenItems WHERE branchId = ${selectedBranchIds[0]}`);
          const hiddenRows = Array.isArray(hiddenResult) ? hiddenResult[0] : [];
          const hiddenIds = new Set((Array.isArray(hiddenRows) ? hiddenRows : []).map((r: any) => Number(r.liquorItemId)));
          activeItems = activeItems.filter(i => !hiddenIds.has(Number(i.id)));
        }
        const inventoryRows = await db.select().from(liquorInventories).where(inArray(liquorInventories.branchId, selectedBranchIds));
        const movementRows = await db.select().from(liquorStockMovements)
          .where(and(inArray(liquorStockMovements.branchId, selectedBranchIds), eq(liquorStockMovements.date, input.date)))
          .orderBy(desc(liquorStockMovements.createdAt));

        const itemById = new Map(itemRows.map(i => [i.id, i]));
        const branchById = new Map(allBranches.map(b => [b.id, b]));
        const creatorRows = await db.select().from(storeAccounts);
        const creatorById = new Map(creatorRows.map((a: any) => [Number(a.id), a]));
        const movements = movementRows.map(m => {
          const item = itemById.get(m.liquorItemId);
          const branch = branchById.get(m.branchId);
          const creator = m.createdBy ? creatorById.get(Number(m.createdBy)) : null;
          return {
            ...m,
            quantity: Number(m.quantity || 0),
            unitCost: Number(m.unitCost || item?.unitCost || 0),
            totalCost: Number(m.totalCost || 0) || Math.abs(Number(m.quantity || 0)) * Number(m.unitCost || item?.unitCost || 0),
            itemName: item?.name ?? '삭제된 품목',
            category: item?.category ?? '기타',
            branchName: branch?.name ?? '',
            createdByLoginId: creator?.loginId ?? '',
            createdByDisplayName: creator?.displayName ?? '',
            createdByRole: creator?.role ?? '',
          };
        });
        const activeItemIds = new Set(activeItems.map((i: any) => Number(i.id)));
        const inventories = inventoryRows
          .filter(inv => activeItemIds.has(Number(inv.liquorItemId)))
          .map(inv => ({ ...inv, currentStock: Number(inv.currentStock || 0) }));

        const branchSummaries = selectedBranchIds.map(branchId => {
          const branch = branchById.get(branchId);
          const branchMovements = movements.filter(m => m.branchId === branchId);
          const outMovements = branchMovements.filter(m => m.type === 'OUT');
          const inMovements = branchMovements.filter(m => m.type === 'IN');
          return {
            branchId,
            branchName: branch?.name ?? '',
            outQty: outMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity || 0)), 0),
            inQty: inMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity || 0)), 0),
            outCost: outMovements.reduce((sum, m) => sum + Math.abs(Number(m.totalCost || 0)), 0),
            itemCount: new Set(outMovements.map(m => m.liquorItemId)).size,
          };
        });

        const totals = {
          stock: inventories.reduce((sum, inv) => sum + Number(inv.currentStock || 0), 0),
          inQty: branchSummaries.reduce((sum, b) => sum + b.inQty, 0),
          outQty: branchSummaries.reduce((sum, b) => sum + b.outQty, 0),
          outCost: branchSummaries.reduce((sum, b) => sum + b.outCost, 0),
        };

        return { branches: allBranches, items: activeItems.map(i => ({ ...i, unitCost: Number(i.unitCost || 0) })), inventories, movements, branchSummaries, totals };
      }),

    history: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        branchId: z.number().optional(),
        keyword: z.string().optional(),
        type: z.enum(['IN', 'OUT', 'ADJUST']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        const db = await getDb();
        if (!db) return { movements: [] };
        await ensureLiquorSeeded(db);

        const allBranches = account.role === 'admin'
          ? await db.select().from(branches).orderBy(branches.name)
          : (account.branchId ? await db.select().from(branches).where(eq(branches.id, account.branchId)) : []);
        const allowedBranchIds = allBranches.map(b => b.id);
        const selectedBranchIds = account.role === 'admin' && input.branchId
          ? allowedBranchIds.filter(id => id === input.branchId)
          : allowedBranchIds;
        if (selectedBranchIds.length === 0) return { movements: [] };

        const itemRows = await db.select().from(liquorItems).orderBy(liquorItems.sortOrder, liquorItems.name);
        const itemById = new Map(itemRows.map(i => [i.id, i]));
        const branchById = new Map(allBranches.map(b => [b.id, b]));
        const creatorRows = await db.select().from(storeAccounts);
        const creatorById = new Map(creatorRows.map((a: any) => [Number(a.id), a]));

        const historyConditions = [
          inArray(liquorStockMovements.branchId, selectedBranchIds),
          gte(liquorStockMovements.date, input.startDate),
          lte(liquorStockMovements.date, input.endDate),
        ];
        if (input.type) historyConditions.push(eq(liquorStockMovements.type, input.type));

        const movementRows = await db.select().from(liquorStockMovements)
          .where(and(...historyConditions))
          .orderBy(desc(liquorStockMovements.date), desc(liquorStockMovements.createdAt));

        const keyword = (input.keyword || '').trim().toLowerCase();
        const movements = movementRows
          .map(m => {
            const item = itemById.get(m.liquorItemId);
            const branch = branchById.get(m.branchId);
            const creator = m.createdBy ? creatorById.get(Number(m.createdBy)) : null;
            return {
              ...m,
              quantity: Number(m.quantity || 0),
              unitCost: Number(m.unitCost || item?.unitCost || 0),
              totalCost: Number(m.totalCost || 0) || Math.abs(Number(m.quantity || 0)) * Number(m.unitCost || item?.unitCost || 0),
              itemName: item?.name ?? '삭제된 품목',
              category: item?.category ?? '기타',
              branchName: branch?.name ?? '',
              createdByLoginId: creator?.loginId ?? '',
              createdByDisplayName: creator?.displayName ?? '',
              createdByRole: creator?.role ?? '',
            };
          })
          .filter(m => !keyword || String(m.itemName).toLowerCase().includes(keyword));

        return { movements };
      }),


    upsertItem: publicProcedure
      .input(z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        category: z.string().min(1).default('기타'),
        unitCost: z.number().min(0).optional().default(0),
        isActive: z.boolean().default(true),
        branchId: z.number().optional(),
        initialStock: z.number().optional().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        const db = await getDb();
        if (!db) return { success: false };
        await ensureLiquorSeeded(db);

        const effectiveBranchId = account.role === 'admin'
          ? input.branchId
          : account.branchId;

        // 기존 품목 수정은 관리자만 허용. 지점은 신규 품목 등록만 가능.
        if (input.id) {
          if (account.role === 'admin') {
            await db.update(liquorItems).set({
              name: input.name,
              category: input.category,
              unitCost: String(input.unitCost || 0),
              isActive: input.isActive ? 1 : 0,
            }).where(eq(liquorItems.id, input.id));
          } else {
            await db.update(liquorItems).set({
              name: input.name,
              category: input.category,
              isActive: input.isActive ? 1 : 0,
            }).where(eq(liquorItems.id, input.id));
          }
          if (effectiveBranchId && input.initialStock !== undefined) {
            const [existingInventory] = await db.select().from(liquorInventories)
              .where(and(eq(liquorInventories.branchId, effectiveBranchId), eq(liquorInventories.liquorItemId, input.id))).limit(1);
            const prevStock = Number(existingInventory?.currentStock || 0);
            const nextStock = Number(input.initialStock || 0);
            const diff = nextStock - prevStock;
            if (existingInventory) await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq(liquorInventories.id, existingInventory.id));
            else await db.insert(liquorInventories).values({ branchId: effectiveBranchId, liquorItemId: input.id, currentStock: String(nextStock) });
            if (diff !== 0) {
              const [stockItem] = await db.select().from(liquorItems).where(eq(liquorItems.id, input.id)).limit(1);
              const unitCost = Number(stockItem?.unitCost || 0);
              await db.insert(liquorStockMovements).values({
                branchId: effectiveBranchId,
                liquorItemId: input.id,
                date: new Date().toISOString().slice(0, 10),
                type: 'ADJUST',
                quantity: String(diff),
                unitCost: String(unitCost),
                totalCost: String(Math.abs(diff) * unitCost),
                memo: `재고수정: ${prevStock}개 → ${nextStock}개 (${diff > 0 ? '+' : ''}${diff})`,
                createdBy: account.id,
              });
            }
          }
          return { success: true, id: input.id };
        }

        const cleanName = input.name.trim();
        const [sameName] = await db.select().from(liquorItems).where(eq(liquorItems.name, cleanName)).limit(1);
        let itemId = sameName?.id;
        if (!itemId) {
          const result = await db.insert(liquorItems).values({
            name: cleanName,
            category: input.category,
            // 지점 계정은 원가를 볼 수 없으므로 신규 등록 단가는 0원. 관리자는 입력 단가 사용.
            unitCost: String(account.role === 'admin' ? (input.unitCost || 0) : 0),
            isActive: 1,
            sortOrder: 9999,
          });
          itemId = Number((result as any).insertId || 0);
          if (!itemId) {
            const [created] = await db.select().from(liquorItems).where(eq(liquorItems.name, cleanName)).limit(1);
            itemId = created?.id;
          }
        } else if (Number(sameName.isActive) !== 1 && account.role === 'admin') {
          await db.update(liquorItems).set({ isActive: 1 }).where(eq(liquorItems.id, itemId));
        }
        if (!itemId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '품목 등록에 실패했습니다' });

        if (effectiveBranchId) {
          // 지점에서 다시 추가하면 해당 지점 숨김 상태 해제
          await db.execute(sql`DELETE FROM liquorHiddenItems WHERE branchId = ${effectiveBranchId} AND liquorItemId = ${itemId}`);
          const initialStock = Number(input.initialStock || 0);
          const [existingInventory] = await db.select().from(liquorInventories)
            .where(and(eq(liquorInventories.branchId, effectiveBranchId), eq(liquorInventories.liquorItemId, itemId))).limit(1);
          const prevStock = Number(existingInventory?.currentStock || 0);
          if (existingInventory) await db.update(liquorInventories).set({ currentStock: String(initialStock) }).where(eq(liquorInventories.id, existingInventory.id));
          else await db.insert(liquorInventories).values({ branchId: effectiveBranchId, liquorItemId: itemId, currentStock: String(initialStock) });
          const diff = initialStock - prevStock;
          if (diff !== 0) {
            const unitCost = account.role === 'admin' ? Number(input.unitCost || sameName?.unitCost || 0) : 0;
            await db.insert(liquorStockMovements).values({
              branchId: effectiveBranchId,
              liquorItemId: itemId,
              date: new Date().toISOString().slice(0, 10),
              type: 'ADJUST',
              quantity: String(diff),
              unitCost: String(unitCost),
              totalCost: String(Math.abs(diff) * unitCost),
              memo: '제품 등록 초기 재고',
              createdBy: account.id,
            });
          }
        }
        return { success: true, id: itemId };
      }),

    deleteItem: publicProcedure
      .input(z.object({ id: z.number(), branchId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        const db = await getDb();
        if (!db) return { success: false };
        await ensureLiquorSeeded(db);

        const branchId = account.role === 'admin' ? input.branchId : account.branchId;
        if (!branchId) throw new TRPCError({ code: 'BAD_REQUEST', message: '삭제할 지점을 먼저 선택해주세요' });
        if (account.role !== 'admin' && Number(account.branchId) !== Number(branchId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '해당 지점 품목만 삭제할 수 있습니다' });
        }

        // 제품 삭제는 전 지점 공통 마스터 삭제가 아니라 지점 단위 삭제입니다.
        // 해당 지점에서는 목록/총재고에서 완전히 빠지도록 숨김 처리 + 재고 row 물리 삭제를 함께 수행합니다.
        await db.execute(sql`INSERT IGNORE INTO liquorHiddenItems (branchId, liquorItemId) VALUES (${branchId}, ${input.id})`);
        await db.delete(liquorInventories).where(and(eq(liquorInventories.branchId, branchId), eq(liquorInventories.liquorItemId, input.id)));
        return { success: true, mode: 'branch' as const };
      }),

    recordMovement: publicProcedure
      .input(z.object({ branchId: z.number(), date: z.string(), type: z.enum(['IN', 'OUT', 'ADJUST']), items: z.array(z.object({ liquorItemId: z.number(), quantity: z.number(), memo: z.string().optional() })).min(1), memo: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        if (account.role !== 'admin' && account.branchId !== input.branchId) throw new TRPCError({ code: 'FORBIDDEN', message: '해당 지점 권한이 없습니다' });
        const db = await getDb();
        if (!db) return { success: false };
        await ensureLiquorSeeded(db);
        const itemIds = input.items.map(i => i.liquorItemId);
        const itemRows = itemIds.length ? await db.select().from(liquorItems).where(inArray(liquorItems.id, itemIds)) : [];
        const itemById = new Map(itemRows.map(i => [i.id, i]));
        for (const row of input.items) {
          const item = itemById.get(row.liquorItemId);
          if (!item) continue;
          const rawQty = Number(row.quantity || 0);
          if (!rawQty && input.type !== 'ADJUST') continue;
          const unitCost = Number(item.unitCost || 0);
          const signedQty = input.type === 'OUT' ? -Math.abs(rawQty) : input.type === 'IN' ? Math.abs(rawQty) : rawQty;
          const totalCost = Math.abs(signedQty) * unitCost;
          await db.insert(liquorStockMovements).values({ branchId: input.branchId, liquorItemId: row.liquorItemId, date: input.date, type: input.type, quantity: String(signedQty), unitCost: String(unitCost), totalCost: String(totalCost), memo: row.memo || input.memo || null, createdBy: account.id });
          const [existing] = await db.select().from(liquorInventories).where(and(eq(liquorInventories.branchId, input.branchId), eq(liquorInventories.liquorItemId, row.liquorItemId))).limit(1);
          const nextStock = Number(existing?.currentStock || 0) + signedQty;
          if (existing) {
            await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq(liquorInventories.id, existing.id));
          } else {
            await db.insert(liquorInventories).values({ branchId: input.branchId, liquorItemId: row.liquorItemId, currentStock: String(nextStock) });
          }
        }
        return { success: true };
      }),


    updateMovement: publicProcedure
      .input(z.object({ id: z.number(), date: z.string(), type: z.enum(['IN', 'OUT', 'ADJUST']).optional(), quantity: z.number(), memo: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        const db = await getDb();
        if (!db) return { success: false };
        await ensureLiquorSeeded(db);

        const [movement] = await db.select().from(liquorStockMovements).where(eq(liquorStockMovements.id, input.id)).limit(1);
        if (!movement) throw new TRPCError({ code: 'NOT_FOUND', message: '히스토리 내역을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== movement.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '해당 지점 내역만 수정할 수 있습니다' });
        }

        const rawQty = Number(input.quantity || 0);
        const nextType = input.type || movement.type;
        if (!rawQty && nextType !== 'ADJUST') throw new TRPCError({ code: 'BAD_REQUEST', message: '수량을 입력해주세요' });
        const newSignedQty = nextType === 'OUT' ? -Math.abs(rawQty) : nextType === 'IN' ? Math.abs(rawQty) : rawQty;
        const oldSignedQty = Number(movement.quantity || 0);
        const diff = newSignedQty - oldSignedQty;
        const [itemForCost] = await db.select().from(liquorItems).where(eq(liquorItems.id, movement.liquorItemId)).limit(1);
        const unitCost = Number(movement.unitCost || itemForCost?.unitCost || 0);
        const totalCost = Math.abs(newSignedQty) * unitCost;

        await db.update(liquorStockMovements).set({
          date: input.date,
          type: nextType,
          quantity: String(newSignedQty),
          totalCost: String(totalCost),
          memo: input.memo || null,
          updatedAt: new Date(),
        }).where(eq(liquorStockMovements.id, input.id));

        if (diff !== 0) {
          const [existing] = await db.select().from(liquorInventories)
            .where(and(eq(liquorInventories.branchId, movement.branchId), eq(liquorInventories.liquorItemId, movement.liquorItemId))).limit(1);
          if (existing) {
            const nextStock = Number(existing.currentStock || 0) + diff;
            await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq(liquorInventories.id, existing.id));
          } else {
            await db.insert(liquorInventories).values({ branchId: movement.branchId, liquorItemId: movement.liquorItemId, currentStock: String(diff) });
          }
        }
        return { success: true };
      }),

    updateMovementGroup: publicProcedure
      .input(z.object({ ids: z.array(z.number()).min(1), date: z.string(), type: z.enum(['IN', 'OUT', 'ADJUST']), memo: z.string().optional(), mergeSameDate: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        const db = await getDb();
        if (!db) return { success: false };
        await ensureLiquorSeeded(db);

        const rows = await db.select().from(liquorStockMovements).where(inArray(liquorStockMovements.id, input.ids));
        if (rows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '히스토리 내역을 찾을 수 없습니다' });
        if (account.role !== 'admin' && rows.some((m: any) => Number(m.branchId) !== Number(account.branchId))) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '해당 지점 내역만 수정할 수 있습니다' });
        }

        const mergeTarget = input.mergeSameDate ? (await db.select().from(liquorStockMovements)
          .where(and(
            eq(liquorStockMovements.branchId, rows[0].branchId),
            eq(liquorStockMovements.date, input.date),
            eq(liquorStockMovements.type, input.type),
            not(inArray(liquorStockMovements.id, input.ids))
          ))
          .orderBy(desc(liquorStockMovements.createdAt))
          .limit(1))[0] : null;

        const mergedCreatedAt = mergeTarget?.createdAt ? new Date(mergeTarget.createdAt as any) : undefined;
        const mergedCreatedBy = mergeTarget?.createdBy || rows[0].createdBy;
        const mergedMemo = input.mergeSameDate && mergeTarget ? (input.memo ?? mergeTarget.memo ?? null) : (input.memo || null);

        if (input.mergeSameDate && mergeTarget) {
          await db.update(liquorStockMovements).set({
            memo: mergedMemo,
            updatedAt: new Date(),
          }).where(and(
            eq(liquorStockMovements.branchId, rows[0].branchId),
            eq(liquorStockMovements.date, input.date),
            eq(liquorStockMovements.type, input.type),
            eq(liquorStockMovements.createdAt, mergeTarget.createdAt)
          ));
        }

        for (const movement of rows) {
          const oldSignedQty = Number(movement.quantity || 0);
          const baseQty = Math.abs(oldSignedQty);
          const newSignedQty = input.type === 'OUT' ? -baseQty : input.type === 'IN' ? baseQty : oldSignedQty;
          const diff = newSignedQty - oldSignedQty;
          const totalCost = Math.abs(newSignedQty) * Number(movement.unitCost || 0);

          await db.update(liquorStockMovements).set({
            date: input.date,
            type: input.type,
            quantity: String(newSignedQty),
            totalCost: String(totalCost),
            memo: mergedMemo,
            ...(mergedCreatedAt ? { createdAt: mergedCreatedAt, createdBy: mergedCreatedBy } : {}),
            updatedAt: new Date(),
          }).where(eq(liquorStockMovements.id, movement.id));

          if (diff !== 0) {
            const [existing] = await db.select().from(liquorInventories)
              .where(and(eq(liquorInventories.branchId, movement.branchId), eq(liquorInventories.liquorItemId, movement.liquorItemId))).limit(1);
            if (existing) {
              const nextStock = Number(existing.currentStock || 0) + diff;
              await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq(liquorInventories.id, existing.id));
            } else {
              await db.insert(liquorInventories).values({ branchId: movement.branchId, liquorItemId: movement.liquorItemId, currentStock: String(diff) });
            }
          }
        }
        return { success: true };
      }),

    addMovementToGroup: publicProcedure
      .input(z.object({
        groupIds: z.array(z.number()).min(1),
        liquorItemId: z.number(),
        quantity: z.number(),
        type: z.enum(['IN', 'OUT', 'ADJUST']),
        date: z.string(),
        memo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        const db = await getDb();
        if (!db) return { success: false };
        await ensureLiquorSeeded(db);

        const groupRows = await db.select().from(liquorStockMovements).where(inArray(liquorStockMovements.id, input.groupIds));
        if (groupRows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: '기준 히스토리를 찾을 수 없습니다' });
        const base = groupRows[0];
        if (account.role !== 'admin' && Number(account.branchId) !== Number(base.branchId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '해당 지점 내역만 수정할 수 있습니다' });
        }
        const [item] = await db.select().from(liquorItems).where(eq(liquorItems.id, input.liquorItemId)).limit(1);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: '품목을 찾을 수 없습니다' });

        const rawQty = Number(input.quantity || 0);
        if (!rawQty && input.type !== 'ADJUST') throw new TRPCError({ code: 'BAD_REQUEST', message: '수량을 입력해주세요' });
        const signedQty = input.type === 'OUT' ? -Math.abs(rawQty) : input.type === 'IN' ? Math.abs(rawQty) : rawQty;
        const unitCost = Number(item.unitCost || 0);
        const totalCost = Math.abs(signedQty) * unitCost;
        await db.insert(liquorStockMovements).values({
          branchId: base.branchId,
          liquorItemId: input.liquorItemId,
          date: input.date,
          type: input.type,
          quantity: String(signedQty),
          unitCost: String(unitCost),
          totalCost: String(totalCost),
          memo: input.memo || base.memo || null,
          createdBy: account.id,
          createdAt: base.createdAt as any,
        });
        const [existing] = await db.select().from(liquorInventories)
          .where(and(eq(liquorInventories.branchId, base.branchId), eq(liquorInventories.liquorItemId, input.liquorItemId))).limit(1);
        const nextStock = Number(existing?.currentStock || 0) + signedQty;
        if (existing) await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq(liquorInventories.id, existing.id));
        else await db.insert(liquorInventories).values({ branchId: base.branchId, liquorItemId: input.liquorItemId, currentStock: String(nextStock) });
        return { success: true };
      }),

    deleteMovement: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        const db = await getDb();
        if (!db) return { success: false };
        await ensureLiquorSeeded(db);

        const [movement] = await db.select().from(liquorStockMovements).where(eq(liquorStockMovements.id, input.id)).limit(1);
        if (!movement) throw new TRPCError({ code: 'NOT_FOUND', message: '히스토리 내역을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== movement.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '해당 지점 내역만 삭제할 수 있습니다' });
        }

        const signedQty = Number(movement.quantity || 0);
        const [existing] = await db.select().from(liquorInventories)
          .where(and(eq(liquorInventories.branchId, movement.branchId), eq(liquorInventories.liquorItemId, movement.liquorItemId))).limit(1);
        if (existing) {
          const nextStock = Number(existing.currentStock || 0) - signedQty;
          await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq(liquorInventories.id, existing.id));
        }
        await db.delete(liquorStockMovements).where(eq(liquorStockMovements.id, input.id));
        return { success: true };
      }),

    setStock: publicProcedure
      .input(z.object({ branchId: z.number(), liquorItemId: z.number(), currentStock: z.number(), memo: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const account = await requireStoreAccount(ctx);
        if (account.role !== 'admin' && account.branchId !== input.branchId) throw new TRPCError({ code: 'FORBIDDEN', message: '해당 지점 재고만 수정할 수 있습니다' });
        const db = await getDb();
        if (!db) return { success: false };
        await ensureLiquorSeeded(db);
        const [item] = await db.select().from(liquorItems).where(eq(liquorItems.id, input.liquorItemId)).limit(1);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: '품목을 찾을 수 없습니다' });
        const [existing] = await db.select().from(liquorInventories).where(and(eq(liquorInventories.branchId, input.branchId), eq(liquorInventories.liquorItemId, input.liquorItemId))).limit(1);
        const prevStock = Number(existing?.currentStock || 0);
        const diff = input.currentStock - prevStock;
        if (existing) await db.update(liquorInventories).set({ currentStock: String(input.currentStock) }).where(eq(liquorInventories.id, existing.id));
        else await db.insert(liquorInventories).values({ branchId: input.branchId, liquorItemId: input.liquorItemId, currentStock: String(input.currentStock) });
        if (diff !== 0) {
          const unitCost = Number(item.unitCost || 0);
          await db.insert(liquorStockMovements).values({ branchId: input.branchId, liquorItemId: input.liquorItemId, date: new Date().toISOString().slice(0, 10), type: 'ADJUST', quantity: String(diff), unitCost: String(unitCost), totalCost: String(Math.abs(diff) * unitCost), memo: input.memo || `재고수정: ${prevStock}개 → ${input.currentStock}개 (${diff > 0 ? '+' : ''}${diff})`, createdBy: account.id });
        }
        return { success: true };
      }),
  }),

  tableReport: router({
    // 날짜별 테이블 기록 조회 (없으면 null 반환)
    getByDate: publicProcedure
      .input(z.object({ date: z.string(), branchId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) return null;
        // 관리자(branchId=null)인 경우 input.branchId를 사용, 일반 직원은 자신의 branchId 사용
        const effectiveBranchId = account.branchId ?? input.branchId;
        if (!effectiveBranchId) return null;
        const [report] = await db.select().from(tableReports)
          .where(and(eq(tableReports.branchId, effectiveBranchId), eq(tableReports.date, input.date)))
          .limit(1);
        if (!report) return null;
        const items = await db.select().from(tableItems)
          .where(eq(tableItems.tableReportId, report.id))
          .orderBy(tableItems.sortOrder, tableItems.createdAt);
        const incentives = await db.select().from(staffIncentives)
          .where(eq(staffIncentives.tableReportId, report.id))
          .orderBy(staffIncentives.sortOrder, staffIncentives.createdAt);
        return { ...report, items, incentives };
      }),
     // 기록 생성 또는 업데이트
    upsert: publicProcedure
      .input(z.object({
        date: z.string(),
        teamCount: z.number().default(0),
        notes: z.string().optional(),
        branchId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'FORBIDDEN', message: '지점 계정이 필요합니다' });
        // 관리자(branchId=null)인 경우 input.branchId를 사용
        const effectiveBranchId = account.branchId ?? input.branchId;
        if (!effectiveBranchId) throw new TRPCError({ code: 'FORBIDDEN', message: '지점 정보가 필요합니다' });
        // 1. tableReport upsert
        const [existing] = await db.select().from(tableReports)
          .where(and(eq(tableReports.branchId, effectiveBranchId), eq(tableReports.date, input.date)))
          .limit(1);
        let reportId: number;
        if (existing) {
          await db.update(tableReports).set({
            teamCount: input.teamCount,
            notes: input.notes || null,
          }).where(eq(tableReports.id, existing.id));
          reportId = existing.id;
        } else {
          const [result] = await db.insert(tableReports).values({
            branchId: effectiveBranchId,
            date: input.date,
            teamCount: input.teamCount,
            notes: input.notes || null,
          });
          reportId = (result as any).insertId;
        }
        // 2. 현금/카드 테이블 합산 → dailySalesRecords 자동 반영
        const allItems = await db.select().from(tableItems).where(eq(tableItems.tableReportId, reportId));
        const cashSum = allItems
          .filter(it => it.paymentMethod === 'cash')
          .reduce((sum, it) => sum + Number(it.amount || 0), 0);
        const cardSum = allItems
          .filter(it => it.paymentMethod === 'card')
          .reduce((sum, it) => sum + Number(it.amount || 0), 0);
        // cashAmount, cardAmount를 tableReports에도 저장
        await db.update(tableReports).set({
          cashAmount: String(cashSum),
          cardAmount: String(cardSum),
        }).where(eq(tableReports.id, reportId));
        // dailySalesRecords의 cash, card 칸에 자동 반영 + 누적금 재계산
        const existingSales = await getDailySalesRecord(effectiveBranchId, input.date);
        const prevRec2 = await getPrevDailySalesRecord(effectiveBranchId, input.date);
        const { cashTotal: computedCashTotal2, cardTotal: computedCardTotal2 } = await computeCumulativesForDate(
          effectiveBranchId, input.date, prevRec2 ?? null, cashSum, cardSum
        );
        await upsertDailySalesRecord({
          branchId: effectiveBranchId,
          date: input.date,
          posStartAmount: existingSales?.posStartAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || '0') || 0),
          cash: String(cashSum),
          card: String(cardSum),
          cashTotal: String(computedCashTotal2),
          cardTotal: String(computedCardTotal2),
          posEndAmount: existingSales?.posEndAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || '0') || 0),
          expenses: (existingSales?.expenses as any) ?? [],
          submittedAt: new Date(),
        });
        try { await cascadeUpdateCumulativeAmounts(effectiveBranchId, input.date); } catch (e) { console.error('[cascadeUpdateCumulativeAmounts 오류]', e); }
        try { await cascadeUpdatePosAmounts(effectiveBranchId, input.date); } catch (e) { console.error('[cascadeUpdatePosAmounts 오류]', e); }

        return { id: reportId, cashSum, cardSum };
      }),
    // 테이블 항목 추가
    addItem: publicProcedure
      .input(z.object({
        tableReportId: z.number(),
        tableNumber: z.string(),
        guestType: z.enum(['walking', 'regular', 'named']).default('walking'),
        guestName: z.string().optional(),
        amount: z.string().default('0'),
        paymentMethod: z.enum(['card', 'cash']).default('card'),
        memo: z.string().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [result] = await db.insert(tableItems).values({
          tableReportId: input.tableReportId,
          tableNumber: input.tableNumber,
          guestType: input.guestType,
          guestName: input.guestName || null,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          memo: input.memo || null,
          sortOrder: input.sortOrder,
        });
        return { id: (result as any).insertId };
      }),
    // 테이블 항목 수정
    updateItem: publicProcedure
      .input(z.object({
        id: z.number(),
        tableNumber: z.string().optional(),
        guestType: z.enum(['walking', 'regular', 'named']).optional(),
        guestName: z.string().optional().nullable(),
        amount: z.string().optional(),
        paymentMethod: z.enum(['card', 'cash']).optional(),
        memo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.tableNumber !== undefined) updateData.tableNumber = rest.tableNumber;
        if (rest.guestType !== undefined) updateData.guestType = rest.guestType;
        if (rest.guestName !== undefined) updateData.guestName = rest.guestName;
        if (rest.amount !== undefined) updateData.amount = rest.amount;
        if (rest.paymentMethod !== undefined) updateData.paymentMethod = rest.paymentMethod;
        if (rest.memo !== undefined) updateData.memo = rest.memo;
        await db.update(tableItems).set(updateData).where(eq(tableItems.id, id));
        return { success: true };
      }),
    // 테이블 항목 삭제
    deleteItem: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.delete(tableItems).where(eq(tableItems.id, input.id));
        return { success: true };
      }),
    // 두 테이블 항목 합치기 (분할 결제 대응)
    // targetItemId: 남길 테이블 항목 ID, sourceItemId: 합쳐지고 삭제될 테이블 항목 ID
    mergeItems: publicProcedure
      .input(z.object({
        targetItemId: z.number(), // 남길 항목
        sourceItemId: z.number(), // 합쳐지고 삭제될 항목
        tableReportId: z.number(), // 소속 tableReport ID (누적금 재계산용)
        date: z.string(),          // YYYY-MM-DD (누적금 재계산용)
        branchId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'FORBIDDEN' });

        // 두 항목 조회
        const [target] = await db.select().from(tableItems).where(eq(tableItems.id, input.targetItemId)).limit(1);
        const [source] = await db.select().from(tableItems).where(eq(tableItems.id, input.sourceItemId)).limit(1);
        if (!target || !source) throw new TRPCError({ code: 'NOT_FOUND', message: '항목을 찾을 수 없습니다' });
        if (target.tableReportId !== source.tableReportId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '같은 날짜의 항목만 합칠 수 있습니다' });
        }

        // 금액 합산
        const mergedAmount = String(Number(target.amount || 0) + Number(source.amount || 0));

        // 메모 합치기: 두 메모를 줄바꿈으로 연결 (빈 메모는 제외)
        const targetMemo = (target.memo ?? '').trim();
        const sourceMemo = (source.memo ?? '').trim();
        let mergedMemo: string | null = null;
        if (targetMemo && sourceMemo) {
          mergedMemo = targetMemo + '<br>' + sourceMemo;
        } else if (targetMemo) {
          mergedMemo = targetMemo;
        } else if (sourceMemo) {
          mergedMemo = sourceMemo;
        }

        // target 항목 업데이트 (금액 합산, 메모 합치기)
        await db.update(tableItems).set({
          amount: mergedAmount,
          memo: mergedMemo,
        }).where(eq(tableItems.id, input.targetItemId));

        // source 항목 삭제
        await db.delete(tableItems).where(eq(tableItems.id, input.sourceItemId));

        // tableReport 현금/카드 합산 재계산
        const effectiveBranchId = account.role === 'admin' ? (input.branchId ?? account.branchId ?? null) : (account.branchId ?? null);
        if (effectiveBranchId) {
          const allItems = await db.select().from(tableItems).where(eq(tableItems.tableReportId, input.tableReportId));
          const cashSum = allItems.filter(it => it.paymentMethod === 'cash').reduce((s, it) => s + Number(it.amount || 0), 0);
          const cardSum = allItems.filter(it => it.paymentMethod === 'card').reduce((s, it) => s + Number(it.amount || 0), 0);
          await db.update(tableReports).set({
            cashAmount: String(cashSum),
            cardAmount: String(cardSum),
          }).where(eq(tableReports.id, input.tableReportId));
          // dailySalesRecords 자동 반영 + 누적금 재계산
          const existingSales = await getDailySalesRecord(effectiveBranchId, input.date);
          const prevRec = await getPrevDailySalesRecord(effectiveBranchId, input.date);
          const { cashTotal, cardTotal } = await computeCumulativesForDate(effectiveBranchId, input.date, prevRec ?? null, cashSum, cardSum);
          await upsertDailySalesRecord({
            branchId: effectiveBranchId,
            date: input.date,
            posStartAmount: existingSales?.posStartAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || '0') || 0),
            cash: String(cashSum),
            card: String(cardSum),
            cashTotal: String(cashTotal),
            cardTotal: String(cardTotal),
            posEndAmount: existingSales?.posEndAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || '0') || 0),
            expenses: (existingSales?.expenses as any) ?? [],
            submittedAt: new Date(),
          });
          try { await cascadeUpdateCumulativeAmounts(effectiveBranchId, input.date); } catch (e) { console.error('[mergeItems cascade 오류]', e); }
        }

        return { success: true, mergedAmount, mergedMemo };
      }),

    // 직원 인센티브 추가
    addIncentive: publicProcedure
      .input(z.object({
        tableReportId: z.number(),
        staffName: z.string(),
        glassCount: z.number().default(0),
        bottleCount: z.number().default(0),
        beerBottleCount: z.number().default(0),
        salesIncentive: z.string().default('0'),
        workStart: z.string().optional(),
        workEnd: z.string().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const [result] = await db.insert(staffIncentives).values(input);
        return { id: (result as any).insertId };
      }),
    // 직원 인센티브 수정
    updateIncentive: publicProcedure
      .input(z.object({
        id: z.number(),
        staffName: z.string().optional(),
        glassCount: z.number().optional(),
        bottleCount: z.number().optional(),
        beerBottleCount: z.number().optional(),
        salesIncentive: z.string().optional(),
        workStart: z.string().optional(),
        workEnd: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.staffName !== undefined) updateData.staffName = rest.staffName;
        if (rest.glassCount !== undefined) updateData.glassCount = rest.glassCount;
        if (rest.bottleCount !== undefined) updateData.bottleCount = rest.bottleCount;
        if (rest.beerBottleCount !== undefined) updateData.beerBottleCount = rest.beerBottleCount;
        if (rest.salesIncentive !== undefined) updateData.salesIncentive = rest.salesIncentive;
        if (rest.workStart !== undefined) updateData.workStart = rest.workStart;
        if (rest.workEnd !== undefined) updateData.workEnd = rest.workEnd;
        await db.update(staffIncentives).set(updateData).where(eq(staffIncentives.id, id));
        return { success: true };
      }),
    // 직원 인센티브 삭제
      deleteIncentive: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.delete(staffIncentives).where(eq(staffIncentives.id, input.id));
        return { success: true };
      }),

    // 배치 저장 API - 한 번의 요청으로 report + 항목 + 인센티브 모두 저장
    batchSave: publicProcedure
      .input(z.object({
        date: z.string(),
        teamCount: z.number().default(0),
        notes: z.string().optional(),
        branchId: z.number().optional(),
        items: z.array(z.object({
          id: z.number().optional(),
          localId: z.string(),
          tableNumber: z.string(),
          guestType: z.enum(['walking', 'regular', 'named']).default('walking'),
          guestName: z.string().optional().nullable(),
          amount: z.string().default('0'),
          paymentMethod: z.enum(['card', 'cash']).default('card'),
          memo: z.string().optional(),
          sortOrder: z.number().default(0),
        })),
        incentives: z.array(z.object({
          id: z.number().optional(),
          localId: z.string(),
          staffName: z.string(),
          staffType: z.enum(['staff', 'parttime']).default('staff'),
          glassCount: z.number().default(0),
          bottleCount: z.number().default(0),
          beerBottleCount: z.number().default(0),
          salesIncentive: z.string().default('0'),
          workStart: z.string().optional(),
          workEnd: z.string().optional(),
          sortOrder: z.number().default(0),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'FORBIDDEN', message: '지점 계정이 필요합니다' });
        // 관리자(branchId=null)인 경우 input.branchId를 사용
        const effectiveBranchId = account.branchId ?? input.branchId;
        if (!effectiveBranchId) throw new TRPCError({ code: 'FORBIDDEN', message: '지점 정보가 필요합니다' });

        // 1. tableReport upsert
        const [existing] = await db.select().from(tableReports)
          .where(and(eq(tableReports.branchId, effectiveBranchId), eq(tableReports.date, input.date)))
          .limit(1);
        let reportId: number;
        if (existing) {
          await db.update(tableReports).set({
            teamCount: input.teamCount,
            notes: input.notes || null,
          }).where(eq(tableReports.id, existing.id));
          reportId = existing.id;
        } else {
          const [result] = await db.insert(tableReports).values({
            branchId: effectiveBranchId,
            date: input.date,
            teamCount: input.teamCount,
            notes: input.notes || null,
          });
          reportId = (result as any).insertId;
        }

        // 2. 테이블 항목 배치 처리 (Promise.all로 병렬)
        const itemIdMap: Record<string, number> = {};
        const validItems = input.items.filter(it => it.tableNumber || it.amount || it.memo);
        await Promise.all(validItems.map(async (it, i) => {
          if (it.id) {
            await db.update(tableItems).set({
              tableNumber: it.tableNumber,
              guestType: it.guestType,
              guestName: it.guestName ?? null,
              amount: it.amount || '0',
              paymentMethod: it.paymentMethod,
              memo: it.memo || null,
              sortOrder: it.sortOrder ?? i,
            }).where(eq(tableItems.id, it.id));
            itemIdMap[it.localId] = it.id;
          } else {
            const [result] = await db.insert(tableItems).values({
              tableReportId: reportId,
              tableNumber: it.tableNumber,
              guestType: it.guestType,
              guestName: it.guestName ?? null,
              amount: it.amount || '0',
              paymentMethod: it.paymentMethod,
              memo: it.memo || null,
              sortOrder: it.sortOrder ?? i,
            });
            itemIdMap[it.localId] = (result as any).insertId;
          }
        }));

        // 3. 인센티브 배치 처리 (Promise.all로 병렬)
        const incentiveIdMap: Record<string, number> = {};
        const validIncentives = input.incentives.filter(inc => inc.staffName);
        await Promise.all(validIncentives.map(async (inc, i) => {
          if (inc.id) {
            await db.update(staffIncentives).set({
              staffName: inc.staffName,
              staffType: inc.staffType,
              glassCount: inc.glassCount,
              bottleCount: inc.bottleCount,
              beerBottleCount: inc.beerBottleCount,
              salesIncentive: inc.salesIncentive || '0',
              workStart: inc.workStart || null,
              workEnd: inc.workEnd || null,
            }).where(eq(staffIncentives.id, inc.id));
            incentiveIdMap[inc.localId] = inc.id;
          } else {
            const [result] = await db.insert(staffIncentives).values({
              tableReportId: reportId,
              staffName: inc.staffName,
              staffType: inc.staffType,
              glassCount: inc.glassCount,
              bottleCount: inc.bottleCount,
              beerBottleCount: inc.beerBottleCount,
              salesIncentive: inc.salesIncentive || '0',
              workStart: inc.workStart || null,
              workEnd: inc.workEnd || null,
              sortOrder: inc.sortOrder ?? i,
            });
            incentiveIdMap[inc.localId] = (result as any).insertId;
          }
        }));

        // 4. 현금/카드 합산 → dailySalesRecords 자동 반영
        const allItems = await db.select().from(tableItems).where(eq(tableItems.tableReportId, reportId));
        const cashSum = allItems.filter(it => it.paymentMethod === 'cash').reduce((s, it) => s + Number(it.amount || 0), 0);
        const cardSum = allItems.filter(it => it.paymentMethod === 'card').reduce((s, it) => s + Number(it.amount || 0), 0);

        await db.update(tableReports).set({
          cashAmount: String(cashSum),
          cardAmount: String(cardSum),
        }).where(eq(tableReports.id, reportId));

        const existingSales = await getDailySalesRecord(effectiveBranchId, input.date);
        // cashTotal/cardTotal 서버 재계산 (중간 날짜 누락 보정 포함)
        const prevRec = await getPrevDailySalesRecord(effectiveBranchId, input.date);
        const { cashTotal: computedCashTotal, cardTotal: computedCardTotal } = await computeCumulativesForDate(
          effectiveBranchId, input.date, prevRec ?? null, cashSum, cardSum
        );
        await upsertDailySalesRecord({
          branchId: effectiveBranchId,
          date: input.date,
          posStartAmount: existingSales?.posStartAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || '0') || 0),
          cash: String(cashSum),
          card: String(cardSum),
          cashTotal: String(computedCashTotal),
          cardTotal: String(computedCardTotal),
          posEndAmount: existingSales?.posEndAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || '0') || 0),
          expenses: (existingSales?.expenses as any) ?? [],
          submittedAt: new Date(),
        });
        // 이후 날짜 누적금 연쇄 재계산
        try { await cascadeUpdateCumulativeAmounts(effectiveBranchId, input.date); } catch (e) { console.error('[cascadeUpdateCumulativeAmounts 오류]', e); }
        try { await cascadeUpdatePosAmounts(effectiveBranchId, input.date); } catch (e) { console.error('[cascadeUpdatePosAmounts 오류]', e); }

        return { id: reportId, cashSum, cardSum, itemIdMap, incentiveIdMap };
      }),

    // 직원별 월간 인센티브 집계
    staffIncentiveStats: publicProcedure
      .input(z.object({
        yearMonth: z.string(), // 'YYYY-MM'
        branchId: z.number().optional(), // 없으면 전체 지점
      }))
      .query(async ({ input, ctx }) => {
        const account = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        const prefix = `${input.yearMonth}-%`;

        // DB에서 실제 계정 정보 조회 (branchId 포함)
        const fullAccount = await getStoreAccountById(account.accountId);
        if (!fullAccount) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // 관리자는 전체 또는 특정 지점, 일반 계정은 자기 지점만
        const targetBranchId = account.role === 'admin'
          ? (input.branchId ?? null)
          : fullAccount.branchId;

        // 집계용 rows (직원명별 합계, 직원+알바 모두 포함)
        const rows = await db
          .select({
            staffName: staffIncentives.staffName,
            staffType: staffIncentives.staffType,
            totalGlass: sql<number>`SUM(${staffIncentives.glassCount})`,
            totalBottle: sql<number>`SUM(${staffIncentives.bottleCount})`,
            totalBeerBottle: sql<number>`SUM(${staffIncentives.beerBottleCount})`,
            totalSalesIncentive: sql<string>`SUM(CAST(NULLIF(${staffIncentives.salesIncentive}, '') AS DECIMAL(15,0)))`,
            workDays: sql<number>`COUNT(DISTINCT ${tableReports.date})`,
          })
          .from(staffIncentives)
          .innerJoin(tableReports, eq(staffIncentives.tableReportId, tableReports.id))
          .where(
            targetBranchId !== null
              ? and(like(tableReports.date, prefix), eq(tableReports.branchId, targetBranchId))
              : like(tableReports.date, prefix)
          )
          .groupBy(staffIncentives.staffName, staffIncentives.staffType)
          .orderBy(staffIncentives.staffType, staffIncentives.staffName);

        // 근무시간 계산을 위한 상세 rows (날짜별 직원/알바 근무시간, 모두 포함)
        const detailRows = await db
          .select({
            staffName: staffIncentives.staffName,
            staffType: staffIncentives.staffType,
            date: tableReports.date,
            workStart: staffIncentives.workStart,
            workEnd: staffIncentives.workEnd,
          })
          .from(staffIncentives)
          .innerJoin(tableReports, eq(staffIncentives.tableReportId, tableReports.id))
          .where(
            targetBranchId !== null
              ? and(like(tableReports.date, prefix), eq(tableReports.branchId, targetBranchId))
              : like(tableReports.date, prefix)
          )
          .orderBy(tableReports.date);

        // 근무시간 계산 헬퍼 (HH:mm 형식, 자정 넘어서 근무 처리)
        function calcWorkMinutes(start: string | null, end: string | null): number {
          if (!start || !end) return 0;
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
          let startMin = sh * 60 + sm;
          let endMin = eh * 60 + em;
          // 종료가 시작보다 이르면 자정을 넘긴 것으로 처리
          if (endMin <= startMin) endMin += 24 * 60;
          return endMin - startMin;
        }

        // 주간 경계 계산: 해당 월의 첫 번째 월요일을 기준점으로 사용 (동적 계산)
        // 예: 2026-04의 첫 월요일은 4월 6일
        function getBaseMondayOfMonth(ym: string): Date {
          const [y, m] = ym.split('-').map(Number);
          // 해당 월 1일부터 첫 번째 월요일 찾기
          const firstDay = new Date(y, m - 1, 1);
          const dayOfWeek = firstDay.getDay(); // 0=일, 1=월, ..., 6=토
          // 월요일이 아니면 다음 월요일로
          const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
          return new Date(y, m - 1, 1 + daysToMonday);
        }

        const baseMondayOfMonth = getBaseMondayOfMonth(input.yearMonth);

        function getWeekLabel(date: string): string {
          const d = new Date(date + 'T00:00:00');
          const diffMs = d.getTime() - baseMondayOfMonth.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const weekNum = Math.floor(diffDays / 7);
          const weekStart = new Date(baseMondayOfMonth.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
          const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
          return `${fmt(weekStart)}~${fmt(weekEnd)}`;
        }

        // 직원별 주간 근무시간 집계
        const staffWeeklyMap: Record<string, Record<string, number>> = {};
        const staffTotalMinutes: Record<string, number> = {};

        for (const row of detailRows) {
          const name = row.staffName;
          const mins = calcWorkMinutes(row.workStart, row.workEnd);
          if (!staffWeeklyMap[name]) staffWeeklyMap[name] = {};
          const weekLabel = getWeekLabel(row.date);
          staffWeeklyMap[name][weekLabel] = (staffWeeklyMap[name][weekLabel] || 0) + mins;
          staffTotalMinutes[name] = (staffTotalMinutes[name] || 0) + mins;
        }

        // 인센티브 단가 계산
        const GLASS_PRICE = 5000;
        const BOTTLE_PRICE = 10000;
        const BEER_PRICE = 3000;

        // 주간 목록 (해당 월에 등장하는 주간들) - 날짜 기준 정렬
        // weekLabel은 'M/D~M/D' 형식이라 문자열 정렬 시 뒤죽박죽이 됨
        // 대신 각 주의 실제 시작 날짜(ms)를 기준으로 정렬
        const weekLabelSet = new Set(detailRows.map(r => getWeekLabel(r.date)));
        const allWeekLabels = Array.from(weekLabelSet).sort((a, b) => {
          // 각 라벨에서 시작 날짜를 역산: baseMondayOfMonth + weekNum * 7일
          // 라벨을 생성한 날짜들 중 해당 라벨을 가진 첫 번째 날짜로 비교
          const dateA = detailRows.find(r => getWeekLabel(r.date) === a)?.date ?? '';
          const dateB = detailRows.find(r => getWeekLabel(r.date) === b)?.date ?? '';
          return dateA.localeCompare(dateB);
        });

        // 최종 결과 조합
        const result = rows.map(row => {
          const name = row.staffName;
          const glass = Number(row.totalGlass) || 0;
          const bottle = Number(row.totalBottle) || 0;
          const beer = Number(row.totalBeerBottle) || 0;
          const salesInc = Number(row.totalSalesIncentive) || 0;
          const incentiveAmount = glass * GLASS_PRICE + bottle * BOTTLE_PRICE + beer * BEER_PRICE + salesInc;

          const totalMins = staffTotalMinutes[name] || 0;
          const weeklyHours = staffWeeklyMap[name] || {};
          const weekCount = Object.keys(weeklyHours).length || 1;
          const avgWeeklyIncentive = Math.round(incentiveAmount / weekCount);

          // 기준 시간: 출근일수 × 7시간(420분)
          const workDays = Number(row.workDays) || 0;
          const standardMinutes = workDays * 420; // 7시간 = 420분
          const workDiffMinutes = totalMins - standardMinutes; // 양수=초과, 음수=부족

          return {
            ...row,
            incentiveAmount,
            totalWorkMinutes: totalMins,
            standardMinutes,
            workDiffMinutes,
            weeklyWorkMinutes: weeklyHours, // { '4/6~4/12': 분수 }
            avgWeeklyIncentive,
          };
        });

        return { stats: result, weekLabels: allWeekLabels };
      }),

    // 지점 메모에서 형광펜 패턴 추출 (앱 로드 시 사전 학습용)
    getHighlightPatterns: publicProcedure
      .input(z.object({
        branchId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        const effectiveBranchId = input.branchId ?? account?.branchId ?? null;

        let yellowKeywords: string[] = [];
        let pinkKeywords: string[] = [];
        let recentMemoExamples: string[] = [];

        if (effectiveBranchId) {
          try {
            const db = await getDb();
            if (db) {
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - 90); // 90일치 학습
              const cutoff = cutoffDate.toISOString().slice(0, 10);
              const recentItems = await db
                .select({ memo: tableItems.memo })
                .from(tableItems)
                .innerJoin(tableReports, eq(tableItems.tableReportId, tableReports.id))
                .where(
                  and(
                    eq(tableReports.branchId, effectiveBranchId),
                    sql`${tableReports.date} >= ${cutoff}`,
                    sql`${tableItems.memo} IS NOT NULL`,
                    sql`${tableItems.memo} != ''`,
                  )
                )
                .orderBy(desc(tableReports.date))
                .limit(200);

              const yellowSet = new Set<string>();
              const pinkSet = new Set<string>();
              for (const row of recentItems) {
                const memo = row.memo ?? '';
                const yMatches = Array.from(memo.matchAll(/<mark[^>]*rgb\(255,\s*224,\s*102\)[^>]*>([\s\S]*?)<\/mark>/g));
                for (const m of yMatches) {
                  const text = m[1].replace(/<[^>]+>/g, '').trim();
                  if (text && text.length > 0 && text.length < 30) yellowSet.add(text);
                }
                const pMatches = Array.from(memo.matchAll(/<mark[^>]*rgb\(255,\s*179,\s*209\)[^>]*>([\s\S]*?)<\/mark>/g));
                for (const m of pMatches) {
                  const text = m[1].replace(/<[^>]+>/g, '').trim();
                  const parts = text.split(/[,，]/).map((p: string) => p.trim()).filter((p: string) => p.length > 0 && p.length < 15);
                  for (const p of parts) {
                    const nameMatch = p.match(/^([가-힣a-zA-Z]+)\d*$/);
                    if (nameMatch) pinkSet.add(nameMatch[1]);
                    else if (/^[가-힣a-zA-Z]{1,6}$/.test(p)) pinkSet.add(p);
                  }
                }
                if (recentMemoExamples.length < 10) {
                  const cleanMemo = memo.replace(/<[^>]+>/g, '').trim();
                  if (cleanMemo) recentMemoExamples.push(cleanMemo);
                }
              }
              const YELLOW_BLACKLIST = ['무제한', '연장', '기본', '추가', '서비스', '포장', '테이블', '룸'];
              yellowKeywords = Array.from(yellowSet)
                .filter(kw => !YELLOW_BLACKLIST.some(bl => kw.includes(bl)))
                .slice(0, 50);
              pinkKeywords = Array.from(pinkSet).slice(0, 50);
            }
          } catch (e) {
            console.error('[getHighlightPatterns] 오류:', e);
          }
        }
        return { yellowKeywords, pinkKeywords, recentMemoExamples, branchId: effectiveBranchId };
      }),

    // 포스기 주문내역 사진에서 주문메모 텍스트 자동 추출 (이전 기록 참고 형광펜 + 금액 계산)
    analyzeOrderMemo: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
        branchId: z.number().optional(),
        date: z.string().optional(),
        // 클라이언트에서 사전 로드된 패턴 (있으면 DB 재조회 생략)
        preloadedYellow: z.array(z.string()).optional(),
        preloadedPink: z.array(z.string()).optional(),
        preloadedExamples: z.array(z.string()).optional(),
        // [추가] 사용자 학습형 형광펜 제외 단어
        //   - 클라이언트에서 사용자가 mark를 지운 횟수를 누적하여 임계값을 넘은 단어 목록.
        //   - 서버 단에서 keyword 후보 및 LLM 프롬프트의 절대 형광펜 금지 항목에 포함시킨다.
        excludedYellow: z.array(z.string()).optional(),
        excludedPink: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });

        // base64 → Buffer → S3 업로드
        const base64Data = input.imageBase64.replace(/^data:[^;]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const ext = input.mimeType.includes('png') ? 'png' : 'jpg';
        const fileKey = `order-memo-analysis/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url: imageUrl } = await storagePut(fileKey, imageBuffer, input.mimeType);

        // 클라이언트에서 사전 로드된 패턴이 있으면 우선 사용 (DB 재조회 생략)
        const account = await getStoreAccountById(payload.accountId);
        const effectiveBranchId = input.branchId ?? account?.branchId ?? null;
        let yellowKeywords: string[] = input.preloadedYellow ?? [];
        let pinkKeywords: string[] = input.preloadedPink ?? [];
        let recentMemoExamples: string[] = input.preloadedExamples ?? [];

        // [추가] 학습형 제외 단어 정규화
        const excludedYellowSet = new Set((input.excludedYellow ?? []).map(s => s.trim()).filter(Boolean));
        const excludedPinkSet = new Set((input.excludedPink ?? []).map(s => s.trim()).filter(Boolean));

        // preloaded 패턴이 없을 때만 DB 재조회 (사전 로드 시 생략으로 성능 개선)
        const hasPreloaded = (input.preloadedYellow?.length ?? 0) > 0 || (input.preloadedPink?.length ?? 0) > 0;
        if (effectiveBranchId && !hasPreloaded) {
          try {
            const db = await getDb();
            if (db) {
              // 최근 60일 해당 지점 메모 조회
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - 60);
              const cutoff = cutoffDate.toISOString().slice(0, 10);
              const recentItems = await db
                .select({ memo: tableItems.memo, amount: tableItems.amount })
                .from(tableItems)
                .innerJoin(tableReports, eq(tableItems.tableReportId, tableReports.id))
                .where(
                  and(
                    eq(tableReports.branchId, effectiveBranchId),
                    sql`${tableReports.date} >= ${cutoff}`,
                    sql`${tableItems.memo} IS NOT NULL`,
                    sql`${tableItems.memo} != ''`,
                  )
                )
                .orderBy(desc(tableReports.date))
                .limit(80);

              // 형광펜 패턴 추출
              const yellowSet = new Set<string>();
              const pinkSet = new Set<string>();
              for (const row of recentItems) {
                const memo = row.memo ?? '';
                // 노란 형광펜 텍스트 추출
                const yMatches = Array.from(memo.matchAll(/<mark[^>]*rgb\(255,\s*224,\s*102\)[^>]*>([\s\S]*?)<\/mark>/g));
                for (const m of yMatches) {
                  const text = m[1].replace(/<[^>]+>/g, '').trim();
                  if (text && text.length > 0 && text.length < 30) yellowSet.add(text);
                }
                // 분홍 형광펜 텍스트 추출 (쉼표로 분리된 직원명 개별 처리)
                const pMatches = Array.from(memo.matchAll(/<mark[^>]*rgb\(255,\s*179,\s*209\)[^>]*>([\s\S]*?)<\/mark>/g));
                for (const m of pMatches) {
                  const text = m[1].replace(/<[^>]+>/g, '').trim();
                  // 쉼표로 분리하여 개별 직원명 추출
                  const parts = text.split(/[,，]/).map((p: string) => p.trim()).filter((p: string) => p.length > 0 && p.length < 15);
                  for (const p of parts) {
                    // 숫자만 있는 경우 제외, 직원명+숫자 패턴 (예: 아름4, 예나5)
                    const nameMatch = p.match(/^([가-힣a-zA-Z]+)\d*$/);
                    if (nameMatch) pinkSet.add(nameMatch[1]);
                    else if (/^[가-힣a-zA-Z]{1,6}$/.test(p)) pinkSet.add(p);
                  }
                }
                // 최근 메모 예시 (형광펜 제거한 텍스트)
                if (recentMemoExamples.length < 8) {
                  const cleanMemo = memo.replace(/<[^>]+>/g, '').trim();
                  if (cleanMemo) recentMemoExamples.push(cleanMemo);
                }
              }
              // 무제한, 연장 등 일반 텍스트는 노란 형광펜 키워드에서 제외
              const YELLOW_BLACKLIST = ['무제한', '연장', '기본', '추가', '서비스', '포장', '테이블', '룸'];
              yellowKeywords = Array.from(yellowSet)
                .filter(kw => !YELLOW_BLACKLIST.some(bl => kw.includes(bl)))
                .slice(0, 30);
              pinkKeywords = Array.from(pinkSet).slice(0, 30);
            }
          } catch (e) {
            console.error('[analyzeOrderMemo] 이전 기록 조회 실패:', e);
          }
        }

        // [보강] 사용자 학습형 제외 단어를 keyword 후보에서 제거
        //   - 완전일치(has)뿐 아니라 부분일치(includes) 도 함께 적용한다.
        //   - 예: "무제한"이 제외 단어라면 "무제한 이벤트", "무제한2" 같은 후보도 같이 제거.
        //   - 사용자 입력은 비어있는 문자열을 제외하고 trim 후 사용한다.
        const excludedYellowList = Array.from(excludedYellowSet).filter(w => w.length > 0);
        const excludedPinkList = Array.from(excludedPinkSet).filter(w => w.length > 0);
        const matchesAnyExcluded = (kw: string, list: string[]) =>
          list.some(ex => ex.length > 0 && (kw === ex || kw.includes(ex)));

        if (excludedYellowList.length > 0) {
          yellowKeywords = yellowKeywords.filter(kw => !matchesAnyExcluded(kw, excludedYellowList));
        }
        if (excludedPinkList.length > 0) {
          pinkKeywords = pinkKeywords.filter(kw => !matchesAnyExcluded(kw, excludedPinkList));
        }

        // [추가] LLM에게 절대 형광펜 금지로 알려줄 사용자 학습형 제외 단어 안내문
        const userExcludedYellowList = Array.from(excludedYellowSet);
        const userExcludedPinkList = Array.from(excludedPinkSet);
        const userExcludeNote = (userExcludedYellowList.length + userExcludedPinkList.length) > 0
          ? `\n\n[사용자 학습형 형광펜 절대 금지 단어]\n` +
            (userExcludedYellowList.length > 0 ? `- 노란 형광펜 금지: ${userExcludedYellowList.join(', ')}\n` : '') +
            (userExcludedPinkList.length > 0 ? `- 분홍 형광펜 금지: ${userExcludedPinkList.join(', ')}\n` : '') +
            `위 단어들은 사용자가 반복적으로 형광펜을 제거한 단어이므로 절대로 mark 태그를 적용하지 말 것.`
          : '';

        // 형광펜 가이드 프롬프트 구성
        const yellowGuide = yellowKeywords.length > 0
          ? `노란 형광펜(<mark style="background: rgb(255, 224, 102); border-radius: 2px; padding: 0px 1px;">텍스트</mark>): 주류/샴페인/위스키/특이 메뉴. 이전 기록에서 노란 형광펜이 적용된 키워드 예시: ${yellowKeywords.join(', ')}`
          : '노란 형광펜: 주류/샴페인/위스키/특이 메뉴에 적용';
        const pinkGuide = pinkKeywords.length > 0
          ? `분홍 형광펜(<mark style="background: rgb(255, 179, 209); border-radius: 2px; padding: 0px 1px;">텍스트</mark>): 직원명(호스티스/스텝 이름). 이전 기록에서 분홍 형광펜이 적용된 직원명 예시: ${pinkKeywords.join(', ')}`
          : '분홍 형광펜: 직원명(호스티스/스텝 이름)에 적용';
        const examplesGuide = recentMemoExamples.length > 0
          ? `\n\n이전 기록 메모 형식 예시:\n${recentMemoExamples.slice(0, 5).map(m => `- ${m}`).join('\n')}`
          : '';

        // LLM Vision으로 포스기 주문내역 분석 → 형광펜 HTML 메모 + 금액 계산
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `당신은 한국 클럽/바/나이트의 포스기 주문내역 이미지를 분석하는 전문가입니다.
이미지에서 주문 항목을 추출하고, 이전 기록 패턴을 참고하여 형광펜 HTML을 적용한 메모와 총 금액을 계산합니다.

수량 표기 변환 규칙 (최우선):
- 포스기의 "x1", "X1", "×1", "*1" 형식을 모두 "(1)" 괄호 형식으로 변환
- 예: 히비키x1 → 히비키(1), 모엣x2 → 모엣(2), 발렌17 X1 → 발렌17(1)
- 형광펜은 수량 괄호 끝까지 포함하여 적용

형광펜 규칙:
${yellowGuide}
${pinkGuide}${userExcludeNote}

금액 계산 규칙:
- 이미지에 표시된 총 결제금액을 그대로 사용 (있는 경우)
- 없으면 개별 항목 금액 합산
- 금액이 전혀 파악 안 되면 0 반환${examplesGuide}`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url' as const,
                  image_url: { url: imageUrl, detail: 'high' as const },
                },
                {
                  type: 'text' as const,
                  text: `이 포스기 주문내역 이미지를 분석해서 다음을 반환해주세요:

1. memo: 주문 내역을 한 줄로 요약한 HTML 텍스트

   [수량 표기 규칙 - 중요]
   - 포스기에 "x1", "X1", "×1", "*1" 등으로 표시된 수량은 반드시 괄호로 변환하세요
   - 예: "히비키x1" → "히비키(1)", "모엣x2" → "모엣(2)", "발렌17 X1" → "발렌17(1)"
   - 수량이 없으면 괄호 생략 (예: "무제한2", "연장1")

   [형광펜 규칙]
   - 주류/샴페인/위스키 등 특이 메뉴: 노란 형광펜
     수량 괄호까지 포함해서 형광펜 적용 (예: <mark style="background: rgb(255, 224, 102); border-radius: 2px; padding: 0px 1px;">히비키(1)</mark>)
   - 직원명(호스티스/스텝): 분홍 형광펜 (수량 괄호 포함)
     (예: <mark style="background: rgb(255, 179, 209); border-radius: 2px; padding: 0px 1px;">아름(3), 예나(2)</mark>)
   - 절대 형광펜 금지 항목: 무제한, 연장, 기본, 추가, 서비스, 포장, 테이블, 룸 등 일반 서비스 텍스트
     ("무제한"은 절대로 노란 형광펜을 적용하지 말 것)

   예시 출력: 무제한2, 연장1, <mark style="background: rgb(255, 224, 102); border-radius: 2px; padding: 0px 1px;">모엣(1)</mark>, <mark style="background: rgb(255, 179, 209); border-radius: 2px; padding: 0px 1px;">아름(3), 예나(2)</mark>

2. amount: 이미지에서 파악한 총 결제금액 (원 단위 정수, 파악 불가시 0)
   - 이미지에 합계 금액이 명시되어 있으면 그 값 사용
   - 없으면 개별 항목 금액 합산

3. confidence: 분석 신뢰도 (high/medium/low)`,
                },
              ],
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'order_memo_v2',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  memo: { type: 'string', description: '형광펜 HTML이 포함된 주문 메모 (한 줄)' },
                  amount: { type: 'integer', description: '총 결제금액 (원, 파악 불가시 0)' },
                  confidence: { type: 'string', description: '분석 신뢰도: high/medium/low' },
                },
                required: ['memo', 'amount', 'confidence'],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices?.[0]?.message?.content;
        if (!rawContent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI 분석 결과를 받지 못했습니다' });
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        const result = JSON.parse(content);

        // [4차 방어] LLM 응답 memo 후처리:
        //   - LLM이 프롬프트 지시를 무시하고 excluded 단어에 mark 태그를 붙였을 경우를 대비,
        //     서버에서 mark 태그를 강제로 제거(언래핑)한다.
        //   - 노란/분홍 mark 태그 각각에 대해, 내부 텍스트가 excluded 단어를 포함하면
        //     <mark ...>...</mark> → 내부 텍스트만 남긴다.
        const stripMarksContaining = (
          html: string,
          markPattern: RegExp,
          excludedList: string[],
        ): string => {
          if (!html || excludedList.length === 0) return html;
          return html.replace(markPattern, (full, inner: string) => {
            const innerText = String(inner).replace(/<[^>]+>/g, '');
            const hit = excludedList.some(ex => ex.length > 0 && innerText.includes(ex));
            return hit ? inner : full; // 적중 시 mark 언래핑, 아니면 그대로
          });
        };

        let memoOut = (result.memo as string) || '';
        const yellowMarkRe = /<mark[^>]*rgb\(255,\s*224,\s*102\)[^>]*>([\s\S]*?)<\/mark>/g;
        const pinkMarkRe = /<mark[^>]*rgb\(255,\s*179,\s*209\)[^>]*>([\s\S]*?)<\/mark>/g;
        memoOut = stripMarksContaining(memoOut, yellowMarkRe, excludedYellowList);
        memoOut = stripMarksContaining(memoOut, pinkMarkRe, excludedPinkList);

        return {
          memo: memoOut,
          amount: typeof result.amount === 'number' && result.amount > 0 ? String(result.amount) : '',
          confidence: (result.confidence as string) || 'low',
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

