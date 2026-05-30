# SalesDash 정산 시스템 개편 설계안

## 1. 개요

본 문서는 SalesDash 정산 시스템을 기존 Google Sheets 연동 방식에서 벗어나, 지점별 손익 관리 및 순수익 분석이 가능한 관리자 대시보드 시스템으로 개편하기 위한 설계안을 제시합니다. 사용자 요구사항을 바탕으로 데이터베이스 설계, 핵심 계산 로직, 그리고 관리자 화면 구조를 상세히 설명합니다.

## 2. 데이터베이스 설계

기존 `drizzle/schema.ts` 파일을 분석한 결과, `users`, `branches`, `dailySalesRecords`, `tableReports`, `staffIncentives`, `liquorItems`, `liquorInventories`, `liquorStockMovements` 등 핵심적인 테이블들이 이미 잘 정의되어 있음을 확인했습니다. 이를 기반으로 새로운 요구사항을 충족하기 위한 추가 필드 및 테이블을 제안합니다.

### 2.1. 기존 테이블 활용 및 개선

*   **`branches` 테이블**: 지점별 고정 비용(월 임대료, 관리비, 직원 일급, 알바 시급 등) 설정을 위해 필드를 추가합니다.
    *   `monthlyRent`: `decimal` 타입으로 월 임대료 저장 (예: 9,000,000)
    *   `managementFee`: `decimal` 타입으로 고정 관리비 저장 (예: 30,000)
    *   `staffDailyWage`: `decimal` 타입으로 여직원 일급 저장 (예: 136,363)
    *   `partTimeHourlyWage`: `decimal` 타입으로 여알바 시급 저장 (예: 10,000, 현재 20,000원으로 고정되어 있으나 유연성을 위해 시급으로 변경 고려)
    *   `commissionRate`: `decimal` 타입으로 수수료/주방 비율 저장 (예: 0.05 for 5%)
    *   `hasManager`: `boolean` 타입으로 점장 유무 표시 (문정2호점 특이사항 반영)

*   **`dailySalesRecords` 테이블**: 일별 정산의 최종 계산 결과(순수익, 총매출, 합계 등)를 저장할 필드를 추가하여, 매번 계산하지 않고 빠르게 조회할 수 있도록 합니다.
    *   `totalRevenue`: `decimal` 타입으로 총매출 저장 (cash + card)
    *   `totalExpenses`: `decimal` 타입으로 총 지출 합계 저장
    *   `netProfit`: `decimal` 타입으로 일별 순수익 저장
    *   `commissionExpense`: `decimal` 타입으로 수수료/주방 비용 저장
    *   `rentExpense`: `decimal` 타입으로 일별 임대료 저장
    *   `managementFeeExpense`: `decimal` 타입으로 일별 관리비 저장
    *   `staffWageExpense`: `decimal` 타입으로 여직원 인건비 저장
    *   `partTimeWageExpense`: `decimal` 타입으로 여알바 인건비 저장
    *   `liquorCostExpense`: `decimal` 타입으로 주류/단가 비용 저장
    *   `staffDrinkExpense`: `decimal` 타입으로 스탭음료 비용 저장

*   **`staffIncentives` 테이블**: 스탭음료 단가 정보를 중앙에서 관리할 수 있도록 개선합니다.
    *   `glassUnitPrice`: `decimal` 타입으로 잔추가 단가 저장 (예: 5,000)
    *   `bottleUnitPrice`: `decimal` 타입으로 병추가 단가 저장 (예: 10,000)
    *   `beerBottleUnitPrice`: `decimal` 타입으로 맥주병추가 단가 저장 (예: 3,000)
    *   이 필드들은 `branches` 테이블에 저장하거나, 별도의 `settings` 테이블에 저장하여 전역 설정으로 관리하는 방안도 고려할 수 있습니다. 여기서는 `branches` 테이블에 추가하는 것을 제안합니다.

### 2.2. 새로운 테이블 제안

현재는 추가적인 새 테이블이 필요하지 않으며, 기존 테이블의 확장 및 필드 추가를 통해 요구사항을 충족할 수 있습니다.

## 3. 계산 로직

사용자 요구사항에 따라 일별 정산 및 월 누적 현황 계산 로직을 정의합니다.

### 3.1. 일별 정산 계산식

1.  **총매출 (Total Revenue)**:
    *   `dailySalesRecords.cash` + `dailySalesRecords.card`

2.  **수수료/주방 (Commission Expense)**:
    *   `총매출` × `branches.commissionRate`

3.  **임대료 (Rent Expense)**:
    *   `branches.monthlyRent` ÷ `해당 월 영업일수(월~토)`
    *   `해당 월 영업일수`는 특정 월의 월요일부터 토요일까지의 일수를 계산하여 동적으로 산출합니다.

4.  **관리비 (Management Fee Expense)**:
    *   `branches.managementFee`

5.  **여직원 (Staff Wage Expense)**:
    *   `staffIncentives` 테이블에서 `staffType`이 'staff'인 직원의 수를 집계 × `branches.staffDailyWage`
    *   단, `branches.hasManager`가 `false`인 지점(예: 문정2호점)은 점장 인건비 계산에서 제외합니다.

6.  **여알바 (Part-time Wage Expense)**:
    *   `staffIncentives` 테이블에서 `staffType`이 'parttime'인 알바의 수를 집계 × `branches.partTimeHourlyWage` (시급) × `평균 근무 시간`
    *   `staffIncentives`에 `workStart`, `workEnd` 필드가 있으므로, 이를 활용하여 실제 근무 시간을 계산하고 시급을 곱하는 방식으로 변경합니다. (현재는 `알바수 × 20,000`으로 고정되어 있으나, 시급 기반 계산으로 유연성 확보)

7.  **스탭음료 (Staff Drink Expense)**:
    *   `staffIncentives` 테이블에서 `glassCount` × `branches.glassUnitPrice`
    *   `staffIncentives` 테이블에서 `bottleCount` × `branches.bottleUnitPrice`
    *   `staffIncentives` 테이블에서 `beerBottleCount` × `branches.beerBottleUnitPrice`
    *   위 세 가지 항목의 합계

8.  **주류/단가 (Liquor Cost Expense)**:
    *   `liquorStockMovements` 테이블에서 해당 날짜의 `type`이 'OUT'인 기록들의 `totalCost` 합계

9.  **기타비용 (Other Expenses)**:
    *   `dailySalesRecords.expenses` JSON 필드에 저장된 항목들의 `amount` 합계

10. **합계 (Total Expenses)**:
    *   `수수료/주방` + `임대료` + `관리비` + `여직원` + `여알바` + `스탭음료` + `주류/단가` + `기타비용`

11. **순수익 (Net Profit)**:
    *   `총매출` - `합계`

### 3.2. 월 누적 계산식

*   **월 누적 순수익**: 해당 월의 1일부터 현재까지의 모든 일별 `netProfit` 합산
*   **월 누적 현황 (비율)**:
    *   각 비용 항목의 월 누적 금액 ÷ `월 누적 총매출` × 100
    *   `월 누적 총매출`은 해당 월의 1일부터 현재까지의 모든 일별 `totalRevenue` 합산

### 3.3. 자동 누적 방식

점장이 일별 정산을 저장할 때, `dailySalesRecords` 테이블에 계산된 `totalRevenue`, `totalExpenses`, `netProfit` 및 각 비용 항목을 저장합니다. 월 누적 값은 관리자 대시보드에서 조회 시, 해당 월의 모든 일별 기록을 합산하여 동적으로 계산합니다.

## 4. 관리자 화면 구조

관리자 대시보드는 사용자가 지점별 손익 현황을 직관적으로 파악하고 분석할 수 있도록 구성합니다.

### 4.1. 전체 레이아웃

*   **상단 헤더**: 로고, 관리 메뉴 (지점 관리, 계정 관리 등), 로그아웃 버튼
*   **좌측 사이드바 (또는 드롭다운)**: 지점 선택 메뉴 (대치점, 삼성점, 선릉점, 문정1호점, 문정2호점)
*   **메인 콘텐츠 영역**: 선택된 지점의 데이터 및 필터링 결과 표시

### 4.2. 메인 대시보드 (선택된 지점 기준)

#### 4.2.1. 최상단 카드 (1순위)

*   **오늘 순수익 카드**: 현재 날짜의 선택된 지점 순수익 표시
    *   예시: `오늘 순수익 ₩401,198`
*   **이번달 누적순수익 카드**: 현재 월의 선택된 지점 누적 순수익 표시
    *   예시: `5월 누적순수익 ₩3,572,710`

#### 4.2.2. 날짜별 조회 필터

*   **필터 옵션**: 오늘, 이번주, 이번달, 기간선택 (캘린더 컴포넌트)
*   **날짜 네비게이터**: 이전/다음 날짜로 이동하는 버튼 (일요일은 건너뛰기)

#### 4.2.3. 일별 정산표 (1순위)

선택된 지점과 날짜에 대한 상세 정산 내역을 표 형태로 표시합니다.

| 항목           | 금액 (₩)    | 비고         |
| :------------- | :---------- | :----------- |
| 총매출         | 1,200,000   |              |
| 수수료/주방    | 204,000     |              |
| 임대료         | 203,076     |              |
| 관리비         | 30,000      |              |
| 주류/단가      | 180,000     |              |
| 여직원         | 272,726     | (2명)        |
| 여알바         | 40,000      | (2명)        |
| 스탭음료       | 29,000      | 잔추가 2잔, 병추가 1병, 맥주병추가 3병 |
| 기타비용       | 50,000      |              |
| **합계**       | **978,802** |              |
| **순수익**     | **221,198** |              |

#### 4.2.4. 월 누적 현황 (2순위)

선택된 지점의 월별 누적 현황을 파이 차트 또는 막대 차트와 함께 표시합니다. 각 항목의 누적 금액과 총매출 대비 비율을 보여줍니다.

*   **총매출**: ₩34,699,000 (100%)
*   **주류/단가**: ₩6,346,500 (18%)
*   **여직원**: ₩14,727,136 (42%)
*   **임대료**: ₩4,153,824 (12%)
*   **수수료/주방**: ₩5,898,830 (17%)
*   **직원 인센티브**: ₩1,902,000 (5%) - (현재 `staffIncentives`의 `salesIncentive`를 활용)
*   **기타지출**: ₩0 (0%)
*   **누적순수익**: ₩3,572,710 (10%)

#### 4.2.5. 비용 분석 (2순위)

월 누적 현황과 유사하게, 비용 항목들을 중심으로 상세 분석을 제공합니다. (월 누적 현황에 포함될 수 있음)

#### 4.2.6. Excel 다운로드 (3순위)

*   선택된 지점과 기간에 대한 정산 데이터를 Excel 파일로 다운로드하는 기능.
*   파일 형식: `[지점명]_[YYYY]_[MM].xlsx` (예: `문정2호점_2026_05.xlsx`)
*   기존 구글시트 양식과 최대한 유사하게 구현.

## 5. 개발 진행 계획

설계안에 따라 다음 단계로 개발을 진행합니다.

1.  **DB 스키마 업데이트**: `branches` 및 `dailySalesRecords` 테이블에 제안된 필드 추가.
2.  **백엔드 API 구현**: 일별 정산 데이터 저장/조회/수정 및 월별 누적 데이터 집계를 위한 API 개발.
3.  **프론트엔드 개발**: 관리자 대시보드 UI 구현 (지점 선택, 날짜 필터, 오늘/월별 순수익 카드, 일별 정산표, 월 누적 현황).
4.  **통합 테스트**: 각 기능의 연동 및 계산 로직의 정확성 검증.
5.  **Excel 다운로드 기능 구현**: 최종 단계에서 Excel 파일 생성 및 다운로드 기능 추가.

## 6. 결론

제안된 설계안은 SalesDash 정산 시스템의 핵심 목표인 '지점별 손익 관리 및 순수익 분석 시스템 구축'을 달성하기 위한 구체적인 방안을 제시합니다. 기존 시스템의 강점을 활용하고 새로운 요구사항을 반영하여 효율적이고 정확한 관리자 대시보드를 구현할 수 있을 것으로 기대합니다.
