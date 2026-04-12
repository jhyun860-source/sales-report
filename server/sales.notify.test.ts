import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// notifyOwner 모킹
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { notifyOwner } from "./_core/notification";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const sampleInput = {
  branch: "삼성점",
  date: "2026-04-12",
  cash: "100000",
  card: "200000",
  dailyTotal: "300000",
  cashTotal: "500000",
  cardTotal: "800000",
  grandTotal: "1300000",
  posStartAmount: "50000",
  posEndAmount: "30000",
  cashDeposit: "0",
  expenses: [
    { description: "식비", amount: "20000" },
  ],
  paymentChangeNote: "",
  paymentChangeAmount: "0",
};

describe("sales.notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("notifyOwner를 호출하고 성공 결과를 반환한다", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.notify(sampleInput);

    expect(result.success).toBe(true);
    expect(notifyOwner).toHaveBeenCalledOnce();
  });

  it("notifyOwner에 지점명과 날짜가 포함된 제목을 전달한다", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.sales.notify(sampleInput);

    const callArgs = vi.mocked(notifyOwner).mock.calls[0]?.[0];
    expect(callArgs?.title).toContain("삼성점");
    expect(callArgs?.title).toContain("2026-04-12");
  });

  it("notifyOwner에 매출 정보가 포함된 내용을 전달한다", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.sales.notify(sampleInput);

    const callArgs = vi.mocked(notifyOwner).mock.calls[0]?.[0];
    // content(body)는 매출 요약 형태: "💰 현금: ₩100,000 / 카드: ₩200,000 | 합계: ₩300,000"
    expect(callArgs?.content).toContain("100,000");  // 현금 포맷팅
    expect(callArgs?.content).toContain("200,000");  // 카드 포맷팅
    // title에 지점명 포함 확인
    expect(callArgs?.title).toContain("삼성점");
  });

  it("notifyOwner 실패 시도 success: true를 반환한다 (알림 실패는 저장에 영향 없음)", async () => {
    vi.mocked(notifyOwner).mockResolvedValueOnce(false);
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.notify(sampleInput);

    // 알림 실패해도 저장은 성공해야 함
    expect(result.success).toBe(true);
  });

  it("expenses가 비어있어도 정상 처리된다", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.notify({
      ...sampleInput,
      expenses: [],
    });

    expect(result.success).toBe(true);
  });
});
