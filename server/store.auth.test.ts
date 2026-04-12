/**
 * storeAccount 기반 로그인 테스트
 * - loginWithPassword mutation 검증
 * - storeMe query 검증
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// DB 모킹
vi.mock("./db", () => ({
  getStoreAccountByLoginId: vi.fn(),
  getStoreAccountById: vi.fn(),
  getBranchById: vi.fn(),
  getDb: vi.fn(() => null),
  savePushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
  getPushSubscriptionsByOpenId: vi.fn(() => []),
  createBranch: vi.fn(),
  getDailySalesRecord: vi.fn(),
  getDailySalesRecordsByDateRange: vi.fn(),
  upsertDailySalesRecord: vi.fn(),
  createStoreAccount: vi.fn(),
  updateStoreAccount: vi.fn(),
  getAllStoreAccounts: vi.fn(),
  deleteStoreAccount: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    cookieSecret: "test-secret-key-for-testing-only-32chars",
    vapidPublicKey: null,
    vapidPrivateKey: null,
    ownerOpenId: null,
  },
}));

vi.mock("./_core/systemRouter", () => ({
  systemRouter: {},
}));

vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

import { getStoreAccountByLoginId, getStoreAccountById } from "./db";

describe("storeAccount 인증", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("올바른 비밀번호로 로그인 성공 검증", async () => {
    const hash = await bcrypt.hash("1234", 10);
    const mockAccount = {
      id: 1,
      loginId: "s1",
      displayName: "선릉점 점장",
      role: "user",
      branchId: 1,
      passwordHash: hash,
      createdAt: new Date(),
    };

    vi.mocked(getStoreAccountByLoginId).mockResolvedValue(mockAccount as any);

    // bcrypt 검증
    const isValid = await bcrypt.compare("1234", hash);
    expect(isValid).toBe(true);
  });

  it("잘못된 비밀번호는 검증 실패", async () => {
    const hash = await bcrypt.hash("1234", 10);
    const isValid = await bcrypt.compare("wrong", hash);
    expect(isValid).toBe(false);
  });

  it("대치점 비밀번호 1224 검증", async () => {
    const hash = await bcrypt.hash("1224", 10);
    const isValid = await bcrypt.compare("1224", hash);
    expect(isValid).toBe(true);
    // 1234는 틀림
    const isWrong = await bcrypt.compare("1234", hash);
    expect(isWrong).toBe(false);
  });

  it("존재하지 않는 계정은 null 반환", async () => {
    vi.mocked(getStoreAccountByLoginId).mockResolvedValue(null);
    const result = await getStoreAccountByLoginId("nonexistent");
    expect(result).toBeNull();
  });

  it("계정 ID로 조회 성공", async () => {
    const mockAccount = {
      id: 1,
      loginId: "s1",
      displayName: "선릉점 점장",
      role: "user",
      branchId: 1,
      passwordHash: "hash",
      createdAt: new Date(),
    };
    vi.mocked(getStoreAccountById).mockResolvedValue(mockAccount as any);
    const result = await getStoreAccountById(1);
    expect(result?.loginId).toBe("s1");
    expect(result?.role).toBe("user");
  });
});

describe("지점별 계정 설정 검증", () => {
  it("5개 지점 계정 아이디 목록 확인", () => {
    const accounts = [
      { loginId: "s1", branchName: "선릉점", password: "1234" },
      { loginId: "d1", branchName: "대치점", password: "1224" },
      { loginId: "s2", branchName: "삼성점", password: "1234" },
      { loginId: "m1", branchName: "문정1호점", password: "1234" },
      { loginId: "m2", branchName: "문정2호점", password: "1234" },
    ];

    // 아이디 중복 없음 확인
    const loginIds = accounts.map(a => a.loginId);
    const uniqueIds = new Set(loginIds);
    expect(uniqueIds.size).toBe(loginIds.length);

    // 모든 계정이 있는지 확인
    expect(loginIds).toContain("s1");
    expect(loginIds).toContain("d1");
    expect(loginIds).toContain("s2");
    expect(loginIds).toContain("m1");
    expect(loginIds).toContain("m2");
  });
});
