# SalesDash 정산 시스템 - 통합 테스트 가이드

## 테스트 환경 설정

### 1. 데이터베이스 준비
```bash
# 마이그레이션 실행
DATABASE_URL="mysql://user:password@host:3306/db" pnpm drizzle-kit push

# 또는 직접 SQL 실행
mysql -u user -p db < drizzle/0010_illegal_killraven.sql
```

### 2. 테스트 데이터 준비
기존 `branches` 테이블의 레코드에 새 필드 값 설정:

```sql
UPDATE branches SET 
  monthlyRent = 9000000,
  managementFee = 30000,
  staffDailyWage = 136363,
  partTimeHourlyWage = 10000,
  commissionRate = 0.05,
  hasManager = 1,
  glassUnitPrice = 5000,
  bottleUnitPrice = 10000,
  beerBottleUnitPrice = 3000
WHERE code = 'munjeong2';

UPDATE branches SET hasManager = 0 WHERE code = 'munjeong2';
```

## 테스트 시나리오

### 시나리오 1: 일별 정산 저장 및 계산

**목표**: 점장이 일별 정산을 저장할 때 자동으로 순수익이 계산되는지 확인

**테스트 단계**:

1. **API 호출**: `settlement.saveDailySettlement`
   ```json
   {
     "branchId": 1,
     "date": "2026-05-30",
     "cash": "500000",
     "card": "700000",
     "expenses": [
       { "id": "1", "description": "기타", "amount": "50000" }
     ]
   }
   ```

2. **예상 결과**:
   - `totalRevenue`: 1,200,000 (500,000 + 700,000)
   - `commissionExpense`: 60,000 (1,200,000 × 0.05)
   - `rentExpense`: 203,076 (9,000,000 ÷ 월 영업일수)
   - `managementFeeExpense`: 30,000
   - `staffWageExpense`: 136,363 (1명 × 136,363)
   - `partTimeWageExpense`: 0 (알바 수가 0이면)
   - `liquorCostExpense`: 0 (테이블 기록이 없으면)
   - `staffDrinkExpense`: 0 (테이블 기록이 없으면)
   - `otherExpense`: 50,000
   - `totalExpenses`: 579,439
   - `netProfit`: 620,561 (1,200,000 - 579,439)

3. **검증**:
   - `getDailySettlement` 호출로 저장된 값 확인
   - 계산식이 정확한지 확인

### 시나리오 2: 월 누적 현황 계산

**목표**: 월별 누적 데이터와 비율이 정확하게 계산되는지 확인

**테스트 단계**:

1. **여러 날짜의 정산 저장**:
   - 2026-05-01: 총매출 1,000,000
   - 2026-05-02: 총매출 1,200,000
   - 2026-05-03: 총매출 1,500,000
   - (총 3,700,000)

2. **API 호출**: `settlement.getMonthlySummary`
   ```json
   { "branchId": 1, "year": 2026, "month": 5 }
   ```

3. **예상 결과**:
   - `totalRevenue`: 3,700,000
   - 각 비용 항목의 누적 합계
   - 비율 계산 정확성 확인
     - 예: `commissionExpense` 비율 = (누적 수수료 / 3,700,000) × 100

4. **검증**:
   - 비율 합계가 100%에 가까운지 확인
   - 각 항목의 비율이 0~100 사이인지 확인

### 시나리오 3: 지점 설정 업데이트

**목표**: 관리자가 지점별 고정 비용을 변경할 수 있는지 확인

**테스트 단계**:

1. **API 호출**: `settlement.updateBranchSettings`
   ```json
   {
     "branchId": 1,
     "monthlyRent": "10000000",
     "managementFee": "50000",
     "staffDailyWage": "150000",
     "commissionRate": "0.06"
   }
   ```

2. **검증**:
   - `getBranchSettings` 호출로 변경된 값 확인
   - 이후 저장되는 정산에 새로운 설정이 적용되는지 확인

### 시나리오 4: 오늘/이번달 순수익 조회

**목표**: 대시보드에 표시되는 순수익 값이 정확한지 확인

**테스트 단계**:

1. **API 호출**: `settlement.getTodayNetProfit`
   ```json
   { "branchId": 1 }
   ```

2. **API 호출**: `settlement.getMonthlyNetProfit`
   ```json
   { "branchId": 1 }
   ```

3. **검증**:
   - 오늘 순수익이 오늘 정산의 `netProfit`과 일치하는지 확인
   - 이번달 순수익이 월 누적 현황의 `netProfit`과 일치하는지 확인

### 시나리오 5: 기간별 정산 조회

**목표**: 선택된 기간의 정산 데이터를 정확하게 조회하는지 확인

**테스트 단계**:

1. **API 호출**: `settlement.getSettlementsByDateRange`
   ```json
   {
     "branchId": 1,
     "startDate": "2026-05-01",
     "endDate": "2026-05-31"
   }
   ```

2. **검증**:
   - 반환된 레코드 개수가 예상과 일치하는지 확인
   - 각 레코드의 계산 값이 정확한지 확인
   - 날짜 범위가 정확하게 필터링되는지 확인

### 시나리오 6: 프론트엔드 대시보드

**목표**: 관리자 대시보드가 올바르게 데이터를 표시하는지 확인

**테스트 단계**:

1. **대시보드 접속**: `/settlement`

2. **지점 선택**:
   - 드롭다운에서 지점 선택
   - 선택된 지점의 데이터만 표시되는지 확인

3. **오늘 순수익 카드**:
   - 표시된 값이 API 응답과 일치하는지 확인
   - 통화 형식이 정확한지 확인 (₩ 기호, 천 단위 쉼표)

4. **이번달 누적순수익 카드**:
   - 표시된 값이 API 응답과 일치하는지 확인

5. **날짜 네비게이터**:
   - 이전/다음 버튼으로 날짜 변경 가능한지 확인
   - 일요일이 자동으로 건너뛰어지는지 확인

6. **날짜 필터**:
   - "오늘", "이번주", "이번달" 필터 동작 확인

7. **일별 정산표**:
   - 선택된 날짜의 정산 내역이 표시되는지 확인
   - 모든 비용 항목이 정확하게 표시되는지 확인
   - 직원 수가 정확하게 표시되는지 확인

8. **월 누적 현황**:
   - 누적 총매출과 누적 순수익이 표시되는지 확인
   - 비용 항목별 누적 금액과 비율이 표시되는지 확인

## 엣지 케이스 테스트

### 1. 점장이 없는 지점 (문정2호점)
- `hasManager = 0` 설정
- 정산 저장 시 `staffWageExpense`가 0이어야 함
- 검증: 순수익이 더 높아야 함

### 2. 알바가 없는 경우
- `staffIncentives` 테이블에 `staffType = 'parttime'` 레코드 없음
- `partTimeWageExpense`가 0이어야 함

### 3. 주류 입출고가 없는 경우
- `liquorStockMovements` 테이블에 해당 날짜의 OUT 레코드 없음
- `liquorCostExpense`가 0이어야 함

### 4. 월말 임대료 계산
- 영업일수가 정확하게 계산되는지 확인
- 월별로 다른 영업일수 확인 (2월, 30일 월, 31일 월)

### 5. 데이터 없는 경우
- 정산이 저장되지 않은 날짜 조회
- `getDailySettlement` 결과가 null인지 확인

## 성능 테스트

### 1. 대량 데이터 조회
- 월 누적 현황 조회 시 1000개 이상의 레코드 처리
- 응답 시간 측정 (목표: 1초 이내)

### 2. 동시 요청
- 여러 지점의 정산을 동시에 저장
- 데이터 무결성 확인

## 배포 전 체크리스트

- [ ] 모든 테스트 시나리오 통과
- [ ] 엣지 케이스 처리 확인
- [ ] 성능 테스트 통과
- [ ] 에러 핸들링 확인
- [ ] 로깅 및 모니터링 설정
- [ ] 데이터베이스 백업 계획 수립
- [ ] 롤백 계획 수립

## 문제 해결

### 계산 결과가 예상과 다른 경우
1. `settlementCalculations.ts`의 계산 로직 확인
2. 입력 데이터 (cash, card, expenses) 확인
3. 지점 설정 (monthlyRent, staffDailyWage 등) 확인
4. 테이블 기록 (staffIncentives, liquorStockMovements) 확인

### API 응답이 없는 경우
1. 네트워크 연결 확인
2. 서버 로그 확인
3. 권한 확인 (관리자만 일부 API 접근 가능)

### 프론트엔드에 데이터가 표시되지 않는 경우
1. 브라우저 콘솔 에러 확인
2. 네트워크 탭에서 API 요청/응답 확인
3. 지점 선택 상태 확인
