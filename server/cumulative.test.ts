/**
 * computeCumulativesForDate / cascadeUpdateCumulativeAmounts 회귀 테스트
 *
 * 실제 DB 연결 없이 순수 로직만 검증하기 위해
 * computeCumulativesForDate의 핵심 계산 로직을 인라인으로 재현합니다.
 */
import { describe, it, expect } from 'vitest';

// ── 순수 함수로 추출한 누적금 계산 로직 ──────────────────────────────────
type DayRecord = { date: string; cash: number; card: number };

function computeCumulatives(
  allRecords: DayRecord[],
  targetDate: string,
  todayCash: number,
  todayCard: number
): { cashTotal: number; cardTotal: number } {
  const isFirstOfMonth = targetDate.endsWith('-01');
  const dateObj = new Date(targetDate + 'T12:00:00');
  const isSunday = dateObj.getDay() === 0;

  if (isFirstOfMonth) {
    return { cashTotal: isSunday ? 0 : todayCash, cardTotal: isSunday ? 0 : todayCard };
  }

  const [year, month] = targetDate.split('-');
  const monthStart = `${year}-${month}-01`;

  const prevRecords = allRecords.filter(r => r.date >= monthStart && r.date < targetDate);
  prevRecords.sort((a, b) => a.date.localeCompare(b.date));

  let baseCash = 0;
  let baseCard = 0;

  for (const r of prevRecords) {
    const rIsSunday = new Date(r.date + 'T12:00:00').getDay() === 0;
    if (r.date === monthStart) {
      baseCash = rIsSunday ? 0 : r.cash;
      baseCard = rIsSunday ? 0 : r.card;
    } else if (!rIsSunday) {
      baseCash += r.cash;
      baseCard += r.card;
    }
  }

  if (isSunday) {
    return { cashTotal: baseCash, cardTotal: baseCard };
  }
  return { cashTotal: baseCash + todayCash, cardTotal: baseCard + todayCard };
}

// ── 테스트 케이스 ──────────────────────────────────────────────────────────

describe('computeCumulativesForDate', () => {
  it('매월 1일은 당일 매출만 (리셋)', () => {
    const records: DayRecord[] = [];
    const result = computeCumulatives(records, '2026-04-01', 1000, 2000);
    expect(result.cashTotal).toBe(1000);
    expect(result.cardTotal).toBe(2000);
  });

  it('매월 1일이 일요일이면 0으로 리셋', () => {
    // 2026-03-01은 일요일
    const records: DayRecord[] = [];
    const result = computeCumulatives(records, '2026-03-01', 5000, 3000);
    expect(result.cashTotal).toBe(0);
    expect(result.cardTotal).toBe(0);
  });

  it('평일 누적: 이전 날짜들의 매출을 합산', () => {
    const records: DayRecord[] = [
      { date: '2026-04-01', cash: 1000, card: 2000 }, // 수
      { date: '2026-04-02', cash: 500, card: 1500 },  // 목
    ];
    // 4/3(금) 당일: cash=300, card=700
    const result = computeCumulatives(records, '2026-04-03', 300, 700);
    // 1일(수): 1000+2000 기준, 2일(목): +500+1500, 3일: +300+700
    expect(result.cashTotal).toBe(1000 + 500 + 300);
    expect(result.cardTotal).toBe(2000 + 1500 + 700);
  });

  it('일요일은 이전 날짜 누적금 유지 (당일 매출 미포함)', () => {
    const records: DayRecord[] = [
      { date: '2026-04-01', cash: 1000, card: 2000 }, // 수
      { date: '2026-04-04', cash: 500, card: 1500 },  // 토
    ];
    // 4/5(일) 당일: cash=0, card=0 (영업 안 함)
    const result = computeCumulatives(records, '2026-04-05', 0, 0);
    expect(result.cashTotal).toBe(1000 + 500);
    expect(result.cardTotal).toBe(2000 + 1500);
  });

  it('중간 날짜 누락 시에도 정확한 누적금 계산', () => {
    // 4/1, 4/3만 있고 4/2 레코드 없음
    const records: DayRecord[] = [
      { date: '2026-04-01', cash: 1000, card: 2000 }, // 수
      // 4/2 레코드 없음
    ];
    // 4/3(금) 당일: cash=500, card=800
    const result = computeCumulatives(records, '2026-04-03', 500, 800);
    // 4/2가 없어도 4/1 기준으로 4/3 계산
    expect(result.cashTotal).toBe(1000 + 500);
    expect(result.cardTotal).toBe(2000 + 800);
  });

  it('월초 이후 일요일 다음 평일은 일요일 이전 누적금 + 당일 매출', () => {
    const records: DayRecord[] = [
      { date: '2026-04-01', cash: 1000, card: 2000 }, // 수
      { date: '2026-04-04', cash: 300, card: 600 },   // 토
      { date: '2026-04-05', cash: 0, card: 0 },       // 일 (영업 안 함)
    ];
    // 4/6(월) 당일: cash=400, card=700
    const result = computeCumulatives(records, '2026-04-06', 400, 700);
    // 4/1(1000) + 4/4(300) + 4/6(400) = 1700 (4/5 일요일 제외)
    expect(result.cashTotal).toBe(1000 + 300 + 400);
    expect(result.cardTotal).toBe(2000 + 600 + 700);
  });

  it('현금 0인 날도 카드 누적에 포함', () => {
    const records: DayRecord[] = [
      { date: '2026-04-01', cash: 0, card: 3000 },    // 수
      { date: '2026-04-02', cash: 0, card: 2000 },    // 목
    ];
    // 4/3(금) 당일: cash=0, card=1000
    const result = computeCumulatives(records, '2026-04-03', 0, 1000);
    expect(result.cashTotal).toBe(0);
    expect(result.cardTotal).toBe(3000 + 2000 + 1000);
  });

  it('삼성점 4월 시나리오: 4/1~4/10 누적금 정확성', () => {
    // 실제 삼성점 데이터 기반
    const records: DayRecord[] = [
      { date: '2026-04-01', cash: 980000, card: 906000 },   // 수
      { date: '2026-04-02', cash: 0, card: 1564000 },       // 목
      { date: '2026-04-03', cash: 25000, card: 1729000 },   // 금
      { date: '2026-04-04', cash: 0, card: 748000 },        // 토
      { date: '2026-04-05', cash: 0, card: 0 },             // 일
      { date: '2026-04-06', cash: 0, card: 2665000 },       // 월
      { date: '2026-04-07', cash: 425000, card: 1307000 },  // 화
      { date: '2026-04-08', cash: 35000, card: 110000 },    // 수
      { date: '2026-04-09', cash: 0, card: 933000 },        // 목
    ];

    // 4/10(금) 당일: cash=425000, card=2135000
    const result = computeCumulatives(records, '2026-04-10', 425000, 2135000);
    expect(result.cashTotal).toBe(1890000);  // 980+0+25+0+0+0+425+35+0+425
    expect(result.cardTotal).toBe(12097000); // 906+1564+1729+748+0+2665+1307+110+933+2135
  });

  it('선릉점 4월 7일 시나리오: 21,000원 차이 검증', () => {
    // 선릉점 4/1~4/6 데이터
    const records: DayRecord[] = [
      { date: '2026-04-01', cash: 0, card: 3954000 },    // 수
      { date: '2026-04-02', cash: 0, card: 1352000 },    // 목
      { date: '2026-04-03', cash: 0, card: 2030000 },    // 금
      { date: '2026-04-04', cash: 0, card: 1485000 },    // 토
      { date: '2026-04-06', cash: 2270000, card: 2552000 }, // 월 (4/5 일요일 없음)
    ];
    // 4/7(화) 당일: cash=21000, card=3979000
    const result = computeCumulatives(records, '2026-04-07', 21000, 3979000);
    expect(result.cashTotal).toBe(2270000 + 21000);   // 2,291,000
    expect(result.cardTotal).toBe(3954000 + 1352000 + 2030000 + 1485000 + 2552000 + 3979000); // 15,352,000
  });
});
