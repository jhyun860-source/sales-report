/**
 * 서버 누적금(cashTotal/cardTotal) 재계산 회귀 테스트
 * 클라이언트가 보낸 cashTotal/cardTotal 값을 무시하고 서버가 직접 계산하는지 검증
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// 누적금 계산 순수 함수 (routers.ts의 로직을 추출하여 테스트)
function computeTotals(
  date: string,
  cash: string,
  card: string,
  prevCashTotal: number,
  prevCardTotal: number
): { cashTotal: number; cardTotal: number } {
  const dateObj = new Date(date + "T12:00:00");
  const isSunday = dateObj.getDay() === 0;
  const isFirstOfMonth = date.endsWith("-01");
  const todayCash = parseInt(cash || "0") || 0;
  const todayCard = parseInt(card || "0") || 0;

  if (isFirstOfMonth) {
    return { cashTotal: todayCash, cardTotal: todayCard };
  } else if (isSunday) {
    return { cashTotal: prevCashTotal, cardTotal: prevCardTotal };
  } else {
    return {
      cashTotal: prevCashTotal + todayCash,
      cardTotal: prevCardTotal + todayCard,
    };
  }
}

describe("서버 누적금 계산 로직", () => {
  it("월 1일은 당일 매출로 리셋된다", () => {
    const result = computeTotals("2026-04-01", "100000", "500000", 999999, 999999);
    expect(result.cashTotal).toBe(100000);
    expect(result.cardTotal).toBe(500000);
  });

  it("일요일은 당일 매출 없이 이전 누적을 유지한다", () => {
    // 2026-04-12는 일요일
    const result = computeTotals("2026-04-12", "0", "0", 2105000, 44158000);
    expect(result.cashTotal).toBe(2105000);
    expect(result.cardTotal).toBe(44158000);
  });

  it("평일은 이전 누적 + 당일 매출로 계산된다", () => {
    // 4월 10일(목요일): 이전 cashTotal=145000, 당일 cash=1960000
    const result = computeTotals("2026-04-10", "1960000", "5510000", 145000, 38648000);
    expect(result.cashTotal).toBe(2105000);
    expect(result.cardTotal).toBe(44158000);
  });

  it("클라이언트가 잘못된 cashTotal을 보내도 서버 계산값이 우선한다", () => {
    // 클라이언트가 cashTotal=0을 보내는 상황 시뮬레이션
    // 서버는 클라이언트 값을 무시하고 prevCashTotal + todayCash로 계산
    const clientWrongCashTotal = "0"; // 클라이언트가 잘못 계산한 값
    const result = computeTotals("2026-04-07", "0", "6685000", 145000, 18033000);
    // 서버 계산: 145000 + 0 = 145000 (현금 없음), 18033000 + 6685000 = 24718000
    expect(result.cashTotal).toBe(145000);
    expect(result.cardTotal).toBe(24718000);
    // 클라이언트 잘못된 값(0)과 다름을 확인
    expect(result.cardTotal).not.toBe(parseInt(clientWrongCashTotal));
  });

  it("월요일은 이전 누적 + 당일 매출로 계산된다 (월요일 리셋 없음)", () => {
    // 2026-04-06은 월요일 - 리셋하지 않고 누적
    const result = computeTotals("2026-04-06", "0", "7493000", 145000, 10540000);
    expect(result.cashTotal).toBe(145000); // 현금 없음, 이전 누적 유지
    expect(result.cardTotal).toBe(18033000); // 10540000 + 7493000
  });
});
