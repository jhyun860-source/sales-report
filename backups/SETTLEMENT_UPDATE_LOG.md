# 5월 2026 정산 데이터 최종 업데이트

## 업데이트 날짜
2026-06-04

## 변경사항

### 1. 영업인센(Sales Incentive) 반영
전지점 5월 영업인센을 `staffIncentives` 테이블에서 조회하여 `dailySalesRecords`의 `salesIncentiveExpense` 컬럼에 반영

#### 지점별 5월 영업인센 합계
- **선릉점 (Branch 1)**: 19,500원
- **대치점 (Branch 2)**: 144,450원
- **삼성점 (Branch 3)**: 1,245,100원
- **문정1호점 (Branch 4)**: 0원
- **문정2호점 (Branch 5)**: 0원
- **전체 합계**: 1,409,050원

### 2. 총지출(totalExpenses) 재계산
다음 항목들을 모두 포함하여 계산:
- commissionExpense (수수료)
- rentExpense (임차료)
- managementFeeExpense (관리비)
- staffWageExpense (직원 급여)
- managerWageExpense (점장 급여)
- partTimeWageExpense (아르바이트 급여)
- liquorCostExpense (주류 원가)
- staffDrinkExpense (직원 음료)
- **salesIncentiveExpense (영업인센)** ← 새로 추가
- otherExpense (기타 지출)

### 3. 순이익(netProfit) 재계산
`netProfit = totalRevenue - totalExpenses`

## 최종 5월 정산 현황

| 지점 | 레코드수 | 영업인센 | 총지출 | 순이익 |
|------|---------|---------|--------|--------|
| 선릉점 | 26 | 19,500 | 36,293,243 | 18,723,357 |
| 대치점 | 26 | 144,450 | 51,518,300 | 9,508,700 |
| 삼성점 | 26 | 1,245,100 | 33,526,266 | 3,927,734 |
| 문정1호점 | 26 | 0 | 33,875,699 | 3,848,301 |
| 문정2호점 | 26 | 0 | 8,331,692 | -231,692 |

## SQL 쿼리 실행 내용

```sql
-- 1. 영업인센 반영
UPDATE dailySalesRecords d
SET d.salesIncentiveExpense = (
  SELECT COALESCE(SUM(CAST(COALESCE(si.salesIncentive, '0') AS SIGNED)), 0)
  FROM staffIncentives si
  JOIN tableReports tr ON si.tableReportId = tr.id
  WHERE tr.branchId = d.branchId AND tr.date = d.date
)
WHERE d.branchId IN (1,2,3,4,5)
AND d.date BETWEEN '2026-05-01' AND '2026-05-31';

-- 2. 총지출 재계산
UPDATE dailySalesRecords d
SET d.totalExpenses = d.commissionExpense + d.rentExpense + d.managementFeeExpense
    + d.staffWageExpense + d.managerWageExpense + d.partTimeWageExpense
    + d.liquorCostExpense + d.staffDrinkExpense + d.salesIncentiveExpense + d.otherExpense
WHERE d.branchId IN (1,2,3,4,5)
AND d.date BETWEEN '2026-05-01' AND '2026-05-31';

-- 3. 순이익 재계산
UPDATE dailySalesRecords d
SET d.netProfit = d.totalRevenue - d.totalExpenses
WHERE d.branchId IN (1,2,3,4,5)
AND d.date BETWEEN '2026-05-01' AND '2026-05-31';
```

## 데이터 무결성 확인
✅ 전지점 5월 130개 레코드 업데이트 완료
✅ 영업인센 데이터 반영 확인
✅ 총지출 및 순이익 재계산 완료
