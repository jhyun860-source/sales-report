# SalesDash Google Sheets 자동 저장 기능 구현 현황

**최종 업데이트**: 2026-05-29  
**상태**: 진행 중 (WIP - Work In Progress)

---

## 📋 프로젝트 개요

**목표**: SalesDash 웹앱에서 입력되는 직원 데이터(날짜, 직원명, 매출, 수수료, 순이익 등)를 Google Sheets로 자동 저장하는 시스템 구축

**대상 지점**:
- 대치점: https://docs.google.com/spreadsheets/d/1mmpslP9Tv7hOcHs9hzKoK3O1lhylTeFe2eTfCoPDJKg/edit
- 선릉점: https://docs.google.com/spreadsheets/d/1Er9vn-8Is3f56B_7JfqlxpjnKfGa51WqJHBiI7nQZsE/edit
- 삼성점: https://docs.google.com/spreadsheets/d/17u0sGfvvtK81pS5dumblpuPbFmLbwWHEfKQgar1LN64/edit
- 문정1호점: https://docs.google.com/spreadsheets/d/1aQ9p2VREIz78rLUG8-nsw5wRDHw1tidbtEFGGxGG1II/edit
- **문정2호점 (테스트 대상)**: https://docs.google.com/spreadsheets/d/1-xgoWVDNjmRfld88mdX12Bp8gcSZrsU_/edit

---

## ✅ 완료된 작업

### 1. GitHub 저장소 클론 및 구조 분석
- ✅ 저장소: `https://github.com/jhyun860-source/sales-report`
- ✅ 프로젝트 구조 파악 (React + TypeScript + tRPC + Drizzle ORM)
- ✅ 저장 기능이 있는 페이지 식별: `client/src/pages/TableReport.tsx`

### 2. Google Apps Script (GAS) 생성 및 배포
- ✅ 프로젝트명: `SalesDash-AutoSave`
- ✅ 웹앱 URL: `https://script.google.com/macros/s/AKfycbxZ8v9UvsEKUGRuipvDPwFvdVh3SccEg7NQAjHRGGAUCry8-UEhkD7l62LyrlN7Yq_Vdg/exec`
- ✅ 기능:
  - POST 요청 수신 (`doPost` 함수)
  - 지점별 월별 파일 자동 생성 (`getOrCreateSpreadsheet`)
  - 중복 데이터 방지 로직
  - 에러 로깅 및 응답 반환

### 3. SalesDash 웹앱 소스 코드 수정
- ✅ `client/src/pages/TableReport.tsx` 파일 수정
- ✅ GAS URL을 상수로 정의 (라인 19)
- ✅ 저장 버튼 클릭 시 데이터를 GAS로 전송하는 로직 추가
- ✅ GitHub에 커밋 완료

### 4. 데이터 매핑 로직 설계
- ✅ 임대료: 전날 기록된 금액 자동 참조
- ✅ 주류단가: 웹앱 히스토리 기준 적용
- ✅ 인건비: 점장(204,545원) / 알바(20,000원) 차등 계산
- ✅ 스탭음료: 테이블 기록 하단 잔/병 추가 수량 합산

---

## 🚧 진행 중인 작업

### 1. Apps Script 최종 수정
**상태**: 진행 중
- 기존 시트명 확인: 문정2호점 시트의 첫 번째 탭은 "순수익 계산"
- Apps Script 코드 수정 필요:
  - 시트명을 "순수익 계산"으로 타겟팅
  - 데이터 입력 시 기존 수식/포맷 보존
  - 새 행으로만 데이터 추가 (appendRow 방식)

### 2. 테스트 데이터 입력
**상태**: 대기 중
- 5월 23일~27일 과거 데이터: 웹앱에서 수동 입력 또는 API 호출로 전송
- 5월 28일 테스트: 웹앱에서 직접 입력 후 시트 자동 반영 확인

### 3. GitHub 최종 푸시
**상태**: 대기 중
- 현재 로컬 커밋 완료 (원격 푸시 대기)
- 브라우저 기반 GitHub 편집으로 최종 업데이트 필요

---

## 📝 남은 작업 (우선순위)

### Phase 1: Apps Script 최종 배포
1. Apps Script 코드 재검토
   - 시트명: "순수익 계산" 확인
   - 데이터 컬럼 매핑 확인
   - 에러 처리 강화

2. 새 버전 배포
   - 배포 관리에서 "새 버전" 생성
   - 웹앱 액세스 권한 설정 (모든 사용자)

### Phase 2: 테스트 및 검증
1. 문정2호점 테스트
   - 웹앱에서 5월 28일 데이터 입력
   - '저장하기' 버튼 클릭
   - 구글 시트 "순수익 계산" 탭에 데이터 자동 반영 확인

2. 과거 데이터 백필(Backfill)
   - 5월 23일~27일 데이터를 시트에 채우기
   - 각 날짜별 정확한 금액 매핑

### Phase 3: 다른 지점 확장
1. 각 지점별 시트 구조 확인
   - 대치점, 선릉점, 삼성점, 문정1호점 시트 분석
   - 각 시트의 첫 번째 탭 이름 확인

2. 지점별 GAS 설정
   - 각 지점의 Spreadsheet ID를 Apps Script에 매핑
   - 웹앱에서 지점 선택 시 올바른 시트로 라우팅

### Phase 4: 월별 자동 파일 분리 (선택사항)
- 매월 1일 자동으로 새 파일 생성
- 기존 파일 구조 복사
- 데이터 자동 라우팅

---

## 🔧 기술 스택

| 항목 | 기술 |
|------|------|
| 웹앱 | React + TypeScript + Vite |
| 백엔드 | tRPC + Node.js |
| 데이터베이스 | Drizzle ORM + MySQL |
| 자동화 | Google Apps Script |
| 저장소 | Google Sheets |
| 버전 관리 | GitHub |

---

## 📌 주요 파일 및 URL

### GitHub
- **저장소**: https://github.com/jhyun860-source/sales-report
- **수정 파일**: `client/src/pages/TableReport.tsx`
- **커밋 메시지**: "WIP: Google Sheets 자동 저장 기능 구현 중"

### Google Apps Script
- **프로젝트**: SalesDash-AutoSave
- **웹앱 URL**: https://script.google.com/macros/s/AKfycbxZ8v9UvsEKUGRuipvDPwFvdVh3SccEg7NQAjHRGGAUCry8-UEhkD7l62LyrlN7Yq_Vdg/exec
- **코드 파일**: `/home/ubuntu/final_gas_script_v3.js` (로컬)

### 웹앱
- **URL**: https://salesdash-ij7wc357.manus.space
- **테스트 지점**: 문정2호점 (branchId=5)

---

## 🔑 주요 설정값

```javascript
// GAS URL (TableReport.tsx에 하드코딩됨)
const GAS_URL = "https://script.google.com/macros/s/AKfycbxZ8v9UvsEKUGRuipvDPwFvdVh3SccEg7NQAjHRGGAUCry8-UEhkD7l62LyrlN7Yq_Vdg/exec";

// 인건비 기준 (Apps Script)
STAFF_SALARY: {
  '점장': 204545,
  '알바': 20000
}

// 문정2호점 시트 정보
- 시트 ID: 1-xgoWVDNjmRfld88mdX12Bp8gcSZrsU_
- 타겟 탭: "순수익 계산"
- 데이터 추가 방식: appendRow (새 행 추가)
```

---

## 📊 데이터 흐름

```
웹앱 (TableReport.tsx)
    ↓
[저장하기 버튼 클릭]
    ↓
데이터 수집 (날짜, 지점, 매출 등)
    ↓
POST 요청 → GAS URL로 전송
    ↓
Google Apps Script (doPost)
    ↓
[지점별 월별 파일 확인/생성]
    ↓
"순수익 계산" 시트에 appendRow로 데이터 추가
    ↓
Google Sheets 자동 업데이트
```

---

## ⚠️ 주의사항

1. **시트 구조 보존**: 기존 수식/포맷 절대 수정 금지
2. **중복 방지**: 동일 날짜 데이터 중복 저장 방지
3. **에러 로깅**: 저장 실패 시 로그 기록
4. **권한 설정**: GAS 웹앱은 "모든 사용자" 액세스 권한 필요
5. **지점 매핑**: 각 지점별 Spreadsheet ID 정확히 매핑

---

## 🎯 다음 단계 (이어서 작업할 때)

1. **Apps Script 최종 배포**
   - 시트명 "순수익 계산" 확인 후 배포
   - 배포 URL 변경 없음 (기존 URL 유지)

2. **웹앱 테스트**
   - 5월 28일 데이터 입력 후 저장
   - 구글 시트에서 자동 반영 확인

3. **과거 데이터 입력**
   - 5월 23일~27일 데이터 웹앱에서 입력
   - 또는 backfill 스크립트로 일괄 입력

4. **다른 지점 확장**
   - 각 지점 시트 구조 확인
   - GAS에 지점별 Spreadsheet ID 추가
   - 웹앱 지점 선택 시 올바른 시트로 라우팅

---

## 📞 문의 및 참고

- **GitHub 저장소**: https://github.com/jhyun860-source/sales-report
- **웹앱**: https://salesdash-ij7wc357.manus.space
- **작업 환경**: Manus 샌드박스 (Ubuntu 22.04)
- **로컬 작업 디렉토리**: `/home/ubuntu/sales-report`

---

**작성일**: 2026-05-29  
**작성자**: Manus Auto  
**상태**: WIP (진행 중)
