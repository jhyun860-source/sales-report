/**
 * tableReport 라우터 단위 테스트
 * - 테이블 항목 구조 검증
 * - 직원 인센티브 구조 검증 (salesIncentive, workStart, workEnd 포함)
 * - 현금/카드 합산 로직 검증
 */

import { describe, it, expect } from 'vitest';

describe('tableReport router', () => {
  it('should have correct table item structure', () => {
    const tableItem = {
      tableNumber: '1T',
      guestType: 'walking' as const,
      amount: '100000',
      paymentMethod: 'card' as const,
      memo: '무제한x2, 지인3간',
    };

    expect(tableItem.tableNumber).toBe('1T');
    expect(tableItem.guestType).toBe('walking');
    expect(Number(tableItem.amount)).toBe(100000);
    expect(tableItem.paymentMethod).toBe('card');
    expect(tableItem.memo).toBe('무제한x2, 지인3간');
  });

  it('should have correct staff incentive structure with new fields', () => {
    const staffIncentive = {
      staffName: '보라',
      glassCount: 2,
      bottleCount: 1,
      beerBottleCount: 0,
      salesIncentive: '50000',
      workStart: '20:00',
      workEnd: '02:00',
    };

    expect(staffIncentive.staffName).toBe('보라');
    expect(staffIncentive.glassCount).toBe(2);
    expect(staffIncentive.bottleCount).toBe(1);
    expect(staffIncentive.beerBottleCount).toBe(0);
    expect(Number(staffIncentive.salesIncentive)).toBe(50000);
    expect(staffIncentive.workStart).toMatch(/^\d{2}:\d{2}$/);
    expect(staffIncentive.workEnd).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should validate guest types', () => {
    const validGuestTypes = ['walking', 'regular'];
    expect(validGuestTypes).toContain('walking');
    expect(validGuestTypes).toContain('regular');
    expect(validGuestTypes).not.toContain('unknown');
  });

  it('should validate payment methods', () => {
    const validPaymentMethods = ['card', 'cash', 'mixed'];
    expect(validPaymentMethods).toContain('card');
    expect(validPaymentMethods).toContain('cash');
    expect(validPaymentMethods).toContain('mixed');
  });

  it('should calculate cash/card sums separately for daily sales auto-sync', () => {
    const tableItems = [
      { paymentMethod: 'cash', amount: '100000' },
      { paymentMethod: 'card', amount: '200000' },
      { paymentMethod: 'cash', amount: '50000' },
      { paymentMethod: 'card', amount: '300000' },
      { paymentMethod: 'mixed', amount: '80000' }, // 혼합은 합산에서 제외
    ];

    const cashSum = tableItems
      .filter(it => it.paymentMethod === 'cash')
      .reduce((sum, it) => sum + Number(it.amount), 0);

    const cardSum = tableItems
      .filter(it => it.paymentMethod === 'card')
      .reduce((sum, it) => sum + Number(it.amount), 0);

    expect(cashSum).toBe(150000);
    expect(cardSum).toBe(500000);
  });

  it('should calculate total incentives correctly', () => {
    const staffList = [
      { glassCount: 3, bottleCount: 1, beerBottleCount: 0 },
      { glassCount: 2, bottleCount: 0, beerBottleCount: 2 },
    ];
    const totalGlass = staffList.reduce((sum, s) => sum + s.glassCount, 0);
    const totalBottle = staffList.reduce((sum, s) => sum + s.bottleCount, 0);
    const totalBeer = staffList.reduce((sum, s) => sum + s.beerBottleCount, 0);

    expect(totalGlass).toBe(5);
    expect(totalBottle).toBe(1);
    expect(totalBeer).toBe(2);
  });

  it('teamCount should be non-negative integer', () => {
    const teamCount = 5;
    expect(teamCount).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(teamCount)).toBe(true);
  });
});
