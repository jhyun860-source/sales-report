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
    expect(callArgs?.content).toContain("삼성점");
    expect(callArgs?.content).toContain("100,000");  // 현금 포맷팅
    expect(callArgs?.content).toContain("200,000");  // 카드 포맷팅
    expect(callArgs?.content).toContain("식비");     // 지출 내역
  });

  it("notifyOwner 실패 시 success: false를 반환한다", async () => {
    vi.mocked(notifyOwner).mockResolvedValueOnce(false);
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.notify(sampleInput);

    expect(result.success).toBe(false);
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
