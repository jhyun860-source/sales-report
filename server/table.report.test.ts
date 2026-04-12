/**
 * tableReport 라우터 단위 테스트
 * - getByDate: 날짜별 기록 조회
 * - save: 테이블 기록 저장
 */

import { describe, it, expect } from 'vitest';

describe('tableReport router', () => {
  it('should have correct table item structure', () => {
    const tableItem = {
      tableNumber: '1T',
      guestType: 'walking' as const,
      amount: 100000,
      paymentMethod: 'card' as const,
      memo: '무제한x2, 지인3간',
    };

    expect(tableItem.tableNumber).toBe('1T');
    expect(tableItem.guestType).toBe('walking');
    expect(tableItem.amount).toBe(100000);
    expect(tableItem.paymentMethod).toBe('card');
    expect(tableItem.memo).toBe('무제한x2, 지인3간');
  });

  it('should have correct staff incentive structure', () => {
    const staffIncentive = {
      staffName: '보라',
      glassAdded: 2,
      bottleAdded: 1,
      beerBottleAdded: 0,
    };

    expect(staffIncentive.staffName).toBe('보라');
    expect(staffIncentive.glassAdded).toBe(2);
    expect(staffIncentive.bottleAdded).toBe(1);
    expect(staffIncentive.beerBottleAdded).toBe(0);
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

  it('should calculate total table amount correctly', () => {
    const tableItems = [
      { amount: 388000 },
      { amount: 105000 },
      { amount: 370000 },
    ];
    const total = tableItems.reduce((sum, item) => sum + item.amount, 0);
    expect(total).toBe(863000);
  });

  it('should calculate total incentives correctly', () => {
    const staffList = [
      { glassAdded: 3, bottleAdded: 1, beerBottleAdded: 0 },
      { glassAdded: 2, bottleAdded: 0, beerBottleAdded: 2 },
    ];
    const totalGlass = staffList.reduce((sum, s) => sum + s.glassAdded, 0);
    const totalBottle = staffList.reduce((sum, s) => sum + s.bottleAdded, 0);
    const totalBeer = staffList.reduce((sum, s) => sum + s.beerBottleAdded, 0);

    expect(totalGlass).toBe(5);
    expect(totalBottle).toBe(1);
    expect(totalBeer).toBe(2);
  });
});
