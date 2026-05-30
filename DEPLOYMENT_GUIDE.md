# SalesDash 정산 시스템 - 배포 안내서

## 배포 환경 정보

**배포 URL**: `https://salesdash-ij7wc357.manus.space/`  
**API 엔드포인트**: `/api/trpc`  
**플랫폼**: Manus WebDev (Express + React + Drizzle ORM)

## 배포 전 체크리스트

### 1. 데이터베이스 마이그레이션
배포 환경의 데이터베이스에 새로운 스키마를 적용해야 합니다.

```bash
# 마이그레이션 파일 확인
ls drizzle/0010_*.sql

# 배포 서버에서 마이그레이션 실행
# (Manus WebDev 환경에서 자동으로 실행되거나, 수동으로 실행 필요)
DATABASE_URL="mysql://..." pnpm drizzle-kit push
```

**마이그레이션 내용**:
- `branches` 테이블에 9개 필드 추가 (지점별 고정 비용 설정)
- `dailySalesRecords` 테이블에 12개 필드 추가 (일별 정산 결과 저장)

### 2. 코드 배포
모든 코드 변경사항이 깃허브에 커밋되었습니다.

```bash
# 최신 커밋 확인
git log --oneline -5

# 주요 변경사항
- server/settlementRouter.ts (새로운 API 라우터)
- server/_core/settlementCalculations.ts (계산 로직)
- client/src/pages/SettlementDashboard.tsx (관리자 대시보드)
- drizzle/0010_illegal_killraven.sql (DB 마이그레이션)
```

### 3. 환경 변수 확인
배포 환경에서 다음 환경 변수가 설정되어 있는지 확인하세요:

```bash
# 필수 환경 변수
DATABASE_URL=mysql://user:password@host:3306/database
NODE_ENV=production
PORT=3000

# 선택 환경 변수 (기존)
OWNER_OPEN_ID=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

## 배포 프로세스

### 1단계: 빌드
```bash
cd /home/ubuntu/sales-report
pnpm install
pnpm build
```

**빌드 결과**:
- `dist/public/` - 프론트엔드 정적 파일
- `dist/index.js` - 백엔드 서버 번들

### 2단계: 데이터베이스 마이그레이션
```bash
# 배포 환경에서 실행
DATABASE_URL="mysql://..." pnpm drizzle-kit push
```

### 3단계: 서버 시작
```bash
NODE_ENV=production node dist/index.js
```

**서버 시작 로그**:
```
Server running on http://localhost:3000/
```

## 배포 후 검증

### 1. 프론트엔드 접속 확인
```bash
curl https://salesdash-ij7wc357.manus.space/
# 응답: HTML 페이지 (로그인 화면)
```

### 2. API 엔드포인트 확인
```bash
# tRPC API 테스트
curl -X POST https://salesdash-ij7wc357.manus.space/api/trpc/storeAccount.branchList?batch=1 \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{}}}'
```

### 3. 정산 API 확인
```bash
# 새로운 정산 API 테스트
curl -X POST https://salesdash-ij7wc357.manus.space/api/trpc/settlement.getTodayNetProfit?batch=1 \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"branchId":1}}}'
```

## 배포 후 초기 설정

### 1. 지점별 고정 비용 설정
관리자가 각 지점의 고정 비용을 설정해야 합니다.

**API 호출**:
```bash
curl -X POST https://salesdash-ij7wc357.manus.space/api/trpc/settlement.updateBranchSettings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "branchId": 1,
    "monthlyRent": "9000000",
    "managementFee": "30000",
    "staffDailyWage": "136363",
    "partTimeHourlyWage": "10000",
    "commissionRate": "0.05",
    "hasManager": 1,
    "glassUnitPrice": "5000",
    "bottleUnitPrice": "10000",
    "beerBottleUnitPrice": "3000"
  }'
```

**지점별 설정 예시**:

| 지점 | 월 임대료 | 관리비 | 여직원 일급 | 여알바 시급 | 점장 유무 |
|------|---------|--------|----------|-----------|---------|
| 대치점 | 9,000,000 | 30,000 | 136,363 | 10,000 | O |
| 삼성점 | 6,500,000 | 30,000 | 136,363 | 10,000 | O |
| 선릉점 | 6,500,000 | 30,000 | 136,363 | 10,000 | O |
| 문정1호점 | 4,500,000 | 30,000 | 136,363 | 10,000 | O |
| 문정2호점 | 4,500,000 | 30,000 | 0 | 10,000 | X |

### 2. 관리자 대시보드 접속
```
https://salesdash-ij7wc357.manus.space/settlement
```

## 주요 API 엔드포인트

### 정산 관련 API

| 엔드포인트 | 메서드 | 설명 |
|----------|--------|------|
| `settlement.getBranchSettings` | GET | 지점 설정 조회 |
| `settlement.updateBranchSettings` | POST | 지점 설정 업데이트 |
| `settlement.getDailySettlement` | GET | 일별 정산 조회 |
| `settlement.saveDailySettlement` | POST | 일별 정산 저장 |
| `settlement.getMonthlySummary` | GET | 월 누적 현황 조회 |
| `settlement.getSettlementsByDateRange` | GET | 기간별 정산 조회 |
| `settlement.getTodayNetProfit` | GET | 오늘 순수익 조회 |
| `settlement.getMonthlyNetProfit` | GET | 이번 달 누적 순수익 조회 |
| `settlement.getAllBranchesTodayNetProfit` | GET | 모든 지점의 오늘 순수익 조회 |

## 문제 해결

### 마이그레이션 실패
**증상**: `DATABASE_URL is required` 오류
**해결**: 배포 환경에서 `DATABASE_URL` 환경 변수 설정 확인

### API 응답 없음
**증상**: `/api/trpc/...` 요청이 응답 없음
**해결**: 
1. 서버가 정상 실행 중인지 확인
2. 네트워크 연결 확인
3. 서버 로그 확인

### 정산 계산 오류
**증상**: 순수익 계산이 예상과 다름
**해결**:
1. 지점 설정이 올바르게 저장되었는지 확인
2. `settlementCalculations.ts`의 계산 로직 검증
3. 테스트 가이드 참고 (`TESTING_GUIDE.md`)

## 롤백 계획

마이그레이션 실패 시 이전 버전으로 롤백:

```bash
# 이전 커밋으로 되돌리기
git revert f361382

# 또는 특정 커밋으로 리셋
git reset --hard d83e807

# 데이터베이스 롤백 (마이그레이션 파일 삭제)
rm drizzle/0010_illegal_killraven.sql
```

## 성능 최적화

### 1. 캐싱 설정
월 누적 현황은 조회 시 동적으로 계산되므로, 대량의 데이터가 있을 경우 캐싱 권장:

```typescript
// 예시: Redis 캐싱
const cacheKey = `settlement:${branchId}:${year}:${month}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const summary = await calculateMonthlySummary(branchId, year, month);
await redis.set(cacheKey, JSON.stringify(summary), 'EX', 3600);
return summary;
```

### 2. 데이터베이스 인덱싱
```sql
-- 조회 성능 개선
CREATE INDEX idx_daily_sales_branch_date ON dailySalesRecords(branchId, date);
CREATE INDEX idx_daily_sales_date ON dailySalesRecords(date);
```

## 모니터링

### 로그 확인
```bash
# 서버 로그
tail -f /var/log/salesdash/server.log

# 에러 로그
tail -f /var/log/salesdash/error.log
```

### 메트릭 수집
- 일별 API 호출 수
- 평균 응답 시간
- 데이터베이스 쿼리 시간

## 지원

문제 발생 시:
1. `DEVELOPMENT_STATUS.md` 확인
2. `TESTING_GUIDE.md`의 테스트 시나리오 실행
3. 서버 로그 및 데이터베이스 상태 확인
4. 깃허브 이슈 등록

## 다음 단계

1. **Excel 다운로드 기능** (3순위)
   - 정산 데이터를 Excel 파일로 내보내기
   - 파일명: `[지점명]_[YYYY]_[MM].xlsx`

2. **지점 설정 관리 UI**
   - 관리자가 웹 UI에서 고정 비용 설정
   - 현재는 API만 제공

3. **차트 및 시각화**
   - 월 누적 현황 파이 차트
   - 비용 추이 라인 차트
   - 지점별 비교 차트

4. **성능 최적화**
   - 대량 데이터 조회 시 캐싱
   - 데이터베이스 인덱싱
