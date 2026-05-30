# SalesDash 정산 시스템 개편 - 개발 진행 상황

## 프로젝트 개요
기존 Google Sheets 연동 방식에서 벗어나, 지점별 손익 관리 및 순수익 분석이 가능한 관리자 대시보드 시스템으로 개편

## 완료된 작업

### 1. 데이터베이스 설계 및 스키마 확장
**파일**: `drizzle/schema.ts`, `drizzle/0010_illegal_killraven.sql`

#### `branches` 테이블 확장
- `monthlyRent`: 월 임대료 (decimal)
- `managementFee`: 월 관리비 (decimal)
- `staffDailyWage`: 여직원 일급 (decimal)
- `partTimeHourlyWage`: 여알바 시급 (decimal)
- `commissionRate`: 수수료/주방 비율 (decimal, 기본값 0.05)
- `hasManager`: 점장 유무 (int, 1=있음, 0=없음)
- `glassUnitPrice`: 잔추가 단가 (decimal, 기본값 5000)
- `bottleUnitPrice`: 병추가 단가 (decimal, 기본값 10000)
- `beerBottleUnitPrice`: 맥주병추가 단가 (decimal, 기본값 3000)

#### `dailySalesRecords` 테이블 확장
- `totalRevenue`: 총매출 (decimal)
- `commissionExpense`: 수수료/주방 비용 (decimal)
- `rentExpense`: 일별 임대료 (decimal)
- `managementFeeExpense`: 일별 관리비 (decimal)
- `staffWageExpense`: 여직원 인건비 (decimal)
- `partTimeWageExpense`: 여알바 인건비 (decimal)
- `liquorCostExpense`: 주류/단가 비용 (decimal)
- `staffDrinkExpense`: 스탭음료 비용 (decimal)
- `otherExpense`: 기타 비용 (decimal)
- `totalExpenses`: 총 지출 (decimal)
- `netProfit`: 순수익 (decimal)
- `staffCount`: 여직원 수 (int)
- `partTimeCount`: 여알바 수 (int)

### 2. 백엔드 계산 로직 구현
**파일**: `server/_core/settlementCalculations.ts`

#### 구현된 함수
- `getBusinessDaysInMonth()`: 월별 영업일수 계산 (월~토, 일요일 제외)
- `calculateDailyRent()`: 일별 임대료 계산
- `getStaffCounts()`: 직원 수 조회 (정규직/알바)
- `calculateStaffDrinkExpense()`: 스탭음료 비용 계산
- `calculateLiquorCostExpense()`: 주류/단가 비용 계산
- `calculateOtherExpenses()`: 기타 비용 합계
- `calculateDailySettlement()`: 일별 정산 결과 전체 계산
- `calculateMonthlySummary()`: 월 누적 현황 계산 (비율 포함)

### 3. 백엔드 API 라우터 구현
**파일**: `server/settlementRouter.ts`

#### 구현된 API 엔드포인트
- `settlement.getBranchSettings`: 지점 설정 조회
- `settlement.updateBranchSettings`: 지점 설정 업데이트 (관리자만)
- `settlement.getDailySettlement`: 일별 정산 조회
- `settlement.saveDailySettlement`: 일별 정산 저장 (자동 계산 포함)
- `settlement.getMonthlySummary`: 월 누적 현황 조회
- `settlement.getSettlementsByDateRange`: 기간별 정산 조회
- `settlement.getTodayNetProfit`: 오늘 순수익 조회
- `settlement.getMonthlyNetProfit`: 이번 달 누적 순수익 조회
- `settlement.getAllBranchesTodayNetProfit`: 모든 지점의 오늘 순수익 조회

### 4. 프론트엔드 관리자 대시보드 구현
**파일**: `client/src/pages/SettlementDashboard.tsx`

#### 구현된 기능
- 지점 선택 드롭다운
- 오늘 순수익 카드 (1순위)
- 이번달 누적순수익 카드 (1순위)
- 날짜 네비게이터 (이전/다음 버튼)
- 날짜 필터 (오늘, 이번주, 이번달)
- 일별 정산표 (1순위)
  - 총매출, 순수익 표시
  - 비용 항목별 상세 내역
  - 직원 수 표시
- 월 누적 현황 (2순위)
  - 누적 총매출, 누적 순수익
  - 비용 항목별 누적 금액 및 비율

### 5. 라우팅 및 통합
**파일**: `client/src/App.tsx`, `server/routers.ts`

- 정산 대시보드 라우트 추가: `/settlement`
- `settlementRouter` 를 `appRouter`에 통합

### 6. 빌드 및 배포 준비
- 프로젝트 빌드 성공 (경고 제외)
- 깃허브 커밋 완료

## 아직 구현되지 않은 기능

### 1. Excel 다운로드 (3순위)
- 선택된 지점과 기간에 대한 정산 데이터를 Excel 파일로 다운로드
- 파일 형식: `[지점명]_[YYYY]_[MM].xlsx`

### 2. 고급 필터링
- 커스텀 날짜 범위 선택 (캘린더 컴포넌트)
- 여러 지점 동시 비교

### 3. 차트 및 시각화
- 월 누적 현황 파이 차트
- 비용 추이 라인 차트
- 지점별 비교 차트

### 4. 지점 설정 UI
- 관리자가 지점별 고정 비용을 설정할 수 있는 화면
- 현재는 API만 구현됨

## 기술 스택

### 백엔드
- **Framework**: Express + tRPC
- **Database**: MySQL + Drizzle ORM
- **Language**: TypeScript

### 프론트엔드
- **Framework**: React 19 + Vite
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS + oklch color system
- **Router**: Wouter

## 배포 방법

### 로컬 개발
```bash
cd /home/ubuntu/sales-report
pnpm install
pnpm build
pnpm start
```

### 데이터베이스 마이그레이션
```bash
DATABASE_URL="mysql://user:password@host:3306/db" pnpm drizzle-kit push
```

## 다음 단계

1. **Excel 다운로드 기능** 구현 (3순위)
2. **지점 설정 관리 UI** 구현
3. **차트 및 시각화** 추가
4. **성능 최적화** (대량 데이터 조회 시)
5. **테스트 작성** (단위 테스트, 통합 테스트)
6. **배포** (Manus WebDev 또는 클라우드)

## 주요 설계 결정사항

### 1. 계산 결과 저장
- 일별 정산 결과를 `dailySalesRecords` 테이블에 저장하여 조회 성능 최적화
- 점장이 정산을 저장할 때 자동으로 계산하여 저장

### 2. 영업일수 계산
- 월요일~토요일만 영업일로 간주 (일요일 제외)
- 임대료를 영업일수로 나누어 일별 임대료 계산

### 3. 직원 인건비
- `branches.hasManager` 필드로 점장 유무 표시
- 점장이 없는 지점(문정2호점)은 점장 인건비 계산 제외

### 4. 스탭음료 단가
- `branches` 테이블에 저장하여 지점별로 다른 단가 설정 가능
- 기본값: 잔추가 5,000원, 병추가 10,000원, 맥주병추가 3,000원

## 파일 구조

```
sales-report/
├── drizzle/
│   ├── schema.ts (DB 스키마 정의)
│   ├── 0010_illegal_killraven.sql (마이그레이션)
│   └── meta/ (Drizzle 메타데이터)
├── server/
│   ├── _core/
│   │   └── settlementCalculations.ts (계산 로직)
│   ├── settlementRouter.ts (API 라우터)
│   └── routers.ts (메인 라우터)
├── client/src/
│   ├── pages/
│   │   └── SettlementDashboard.tsx (관리자 대시보드)
│   └── App.tsx (라우팅)
├── design_proposal.md (설계안)
└── DEVELOPMENT_STATUS.md (이 파일)
```

## 주의사항

- 데이터베이스 마이그레이션 후 기존 `branches` 레코드에 새 필드의 기본값이 자동으로 설정됨
- 점장이 정산을 저장할 때마다 자동으로 순수익이 계산되므로, 기존 데이터는 수동으로 재계산 필요
- 월 누적 현황은 조회 시 동적으로 계산되므로, 대량의 레코드가 있을 경우 성능 최적화 필요

## 문제 해결

### 빌드 실패
- `parseStoreCookie` 함수를 `settlementRouter.ts`에 복사하여 해결
- 향후 이 함수를 공유 유틸리티로 분리 권장

### 깃허브 푸시 실패
- GitHub 인증 토큰 필요
- `manus-config` 를 통해 GitHub 커넥터 설정 필요

## 문의 및 지원

- 설계안: `design_proposal.md` 참고
- 계산 로직: `server/_core/settlementCalculations.ts` 참고
- API 문서: `server/settlementRouter.ts` 의 주석 참고
