# 매출 일일 보고 TODO

- [x] 기본 매출 입력 UI (현금/카드/지출/POS 시작금/마감금)
- [x] 날짜 이동 기능
- [x] 지출 항목 추가/삭제
- [x] 자동 저장 기능
- [x] 기록 보기 페이지
- [x] Manus 내장 알림 연동 (저장 시 notifyOwner 호출)
- [x] PWA manifest.json 생성 (앱 아이콘, 이름, 테마 설정)
- [x] Service Worker 생성 (푸시 알림 수신 처리)
- [x] VAPID 키 생성 및 서버 환경변수 저장
- [x] 서버: 푸시 구독 저장/삭제 API 구현
- [x] 서버: 저장 시 푸시 알림 발송 API 구현
- [x] 프론트엔드: 푸시 알림 구독 버튼 UI 구현
- [x] 저장 버튼 클릭 시 푸시 알림 발송 연동

## 로그인 및 역할 기반 접근 제어

- [x] DB 스키마: users 테이블에 role(admin/manager) 및 branchId 필드 확인/추가
- [x] DB 스키마: branches 테이블 독립 관리 (지점 추가/삭제)
- [x] DB 스키마: dailySalesRecords를 서버 DB로 저장 (branchId, userId 연결)
- [x] 서버: 매출 기록 저장/조회 API (점장은 본인 지점만)
- [x] 서버: 관리자 전지점 매출 조회 API
- [x] 서버: 사용자 목록/생성/수정/삭제 API (관리자 전용)
- [x] 서버: 지점 목록/생성/수정/삭제 API (관리자 전용)
- [x] 프론트: 로그인 페이지 (미로그인 시 리다이렉트)
- [x] 프론트: 점장 매출 입력 페이지 (본인 지점만 표시)
- [x] 프론트: 관리자 전지점 통합 대시보드
- [x] 프론트: 관리자 사용자/지점 관리 페이지

## 자체 아이디/비밀번호 로그인 시스템

- [x] DB 스키마: storeAccounts 테이블 추가 (loginId, passwordHash, branchId, role)
- [x] 서버: 아이디/비밀번호 로그인 API (bcrypt 해시 검증, JWT 발급)
- [x] 서버: 로그아웃 API
- [x] 서버: 현재 로그인 사용자 조회 API
- [x] 프론트: 로그인 페이지 UI (아이디/비밀번호 입력)
- [x] 프론트: 미로그인 시 로그인 페이지로 리다이렉트
- [x] 프론트: 로그아웃 버튼
- [x] 시드: 5개 지점 계정 생성 (s1/d1/s2/m1/m2 - 선릅/대치/삼성/문정당1/문정당2)
- [x] 시드: 5개 지점 데이터 생성 (branches 테이블)

## PWA 업데이트 알림

- [x] Service Worker 새 버전 감지 로직 구현
- [x] 업데이트 알림 배너 UI 컴포넌트 생성
- [x] App.tsx에 배너 연동

## 계정 정보 변경

- [x] 관리자 아이디 admin → v1, 비밀번호 → 1234 변경
- [x] 대치점(d1) 비밀번호 1224 → 1234 변경
- [x] 관리자 페이지에서 비밀번호 변경 기능 확인

## 모바일 UI 개선

- [x] 헤더: 지점명/알림/기록/저장/로그아웃 버튼 글씨 넘침 해결 - 2줄 구조로 재구성
- [x] 지입 내역 테이블: 2열 레이아웃 → 1열 리스트로 변경하여 가독성 향상
- [x] 전체 폰트 크기 및 여백 모바일 최적화
- [x] 섹션 타이틀 스타일 통일

## 테이블 영업 기록 (TableReport)

- [x] DB 스키마: tableReports 테이블 (날짜, 지점ID, 팀수, 기타사항, 지점신규팁, BAR신규팁)
- [x] DB 스키마: tableItems 테이블 (tableReportId, 테이블번호, 손님구분-워킹/기존, 금액, 결제수단, 메모)
- [x] DB 스키마: staffIncentives 테이블 (tableReportId, 직원명, 잔추가수, 병추가수, 맥주병추가수)
- [x] pnpm db:push 마이그레이션 실행
- [x] 서버 API: tableReport CRUD (create, getByDate, update)
- [x] 서버 API: tableItem CRUD (add, update, delete)
- [x] 서버 API: staffIncentive CRUD (add, update, delete)
- [x] 프론트엔드: /table-report 페이지 생성
- [x] 프론트엔드: 테이블 카드 컴포넌트 (번호, 워킹/기존, 금액, 결제수단, 메모)
- [x] 프론트엔드: 출근자 인센티브 섹션 (직원명, 잔추가, 병추가, 맥주병추가)
- [x] 프론트엔드: 날짜 네비게이터 (Home과 동일 방식)
- [x] 프론트엔드: 헤더에 테이블 기록 버튼 추가
- [x] App.tsx에 /table-report 라우트 등록

## TableReport 개선

- [x] DB: staffIncentives 테이블에 salesIncentive(금액), workStart(시작시간), workEnd(종료시간) 컈럼 추가
- [x] DB: tableReports 테이블에 cashAmount, cardAmount 컈럼 추가 (팀수 옆 현금/카드)
- [x] UI: 팀수 옆에 현금 금액 / 카드 금액 입력 추가
- [x] UI: 직원 인센티브에 영업인센(금액) 입력 칸 추가
- [x] UI: 직원 인센티브에 근무 시간(시작~종료) 입력 추가
- [x] UI: 신규손님 팁 섹션 제거

## TableReport 개선 2차

- [x] DB: staffIncentives에 salesIncentive, workStart, workEnd 컈럼 ALTER TABLE로 추가
- [x] DB: tableReports에서 branchNewGuestTip, barNewGuestTip 제거 (cashAmount, cardAmount는 이미 추가됨)
- [x] 서버: tableReport.upsert 저장 시 현금 테이블 합산 → dailySalesRecords.cash 자동 업데이트
- [x] 서버: tableReport.upsert 저장 시 카드 테이블 합산 → dailySalesRecords.card 자동 업데이트
- [x] UI: 직원 인센티브에 영업인센(금액) 입력 칸 추가
- [x] UI: 직원 인센티브에 근무 시간(시작~종료) 입력 추가
- [x] UI: 신규손님 팁 섹션 제거
- [x] UI: TypeScript 오류 해결 (branchNewGuestTip/barNewGuestTip 제거)

## 메모 형광펜 밑줄 기능

- [x] TableReport 메모 입력창에 형광펜 밑줄 토글 버튼 추가 (선택한 텍스트에 형광펜 스타일 적용)
- [x] 형광펜 색상: 노란색 기본, 초록색/파란색/분홍색 선택 가능
- [x] DB: tableItems.memo 컬럼을 HTML 마크업 저장 가능하도록 text 타입 유지 확인
- [x] 메모 표시 시 형광펜 스타일 렌더링

## 직원별 월간 인센티브 통계 페이지

- [x] 서버 API: staffIncentives 월별 집계 쿼리 (직원명별 잔추가/병추가/맥주병추가/영업인센 합계)
- [x] 프론트엔드: /staff-incentive 페이지 생성 (월 선택 + 직원별 합계 테이블)
- [x] 프론트엔드: 전달 기준 월 자동 선택 (월초에 전달 데이터 확인)
- [x] App.tsx에 /staff-incentive 라우트 등록
- [x] 헤더 또는 관리자 메뉴에 인센티브 통계 링크 추가

## MemoEditor 재작성 (textarea 기반)

- [x] contentEditable 제거, textarea 기반으로 전환
- [x] 플레이스홀더 클릭 시 자동 제거 (표준 placeholder 속성 사용)
- [x] 입력 중 글씨 사라지지 않도록 안정적 상태 관리
- [x] 형광펜: 텍스트 선택 후 색상 클릭 시 mark 태그 삽입 및 표시

## 인센티브 자동 인원 추가 버그 수정

- [x] 날짜 변경 시 incentives useEffect가 중복 실행되어 빈 항목 추가되는 문제 수정
- [x] 서버 데이터 로드 시 incentives 데이터 덮어쓰기 방지

## 매출 보고 결제 변경사항 제거

- [x] Home.tsx에서 결제 변경사항 섬션 UI 제거
- [x] DB 스키마에서 관련 필드 제거 (필요 시)
- [x] 저장/로드 API에서 결제 변경사항 필드 제거

## 근무시간 UI 변경

- [x] 시작/종료 각각 오전/오후 토글 버튼 추가
- [x] 시간 입력을 type="time" → type="text" 직접 입력으로 변경
- [x] 오전/오후 선택 + 시간 직접 입력 조합으로 총 근무시간 자동 계산

## 테이블 기록 ↔ 매출 기록 날짜 동기화

- [x] TableReport와 Home(DailySales)이 동일한 localStorage 키 'selectedDate' 사용
- [x] 테이블 기록에서 날짜 변경 시 매출 기록에도 반영
- [x] 매출 기록에서 날짜 변경 시 테이블 기록에도 반영

## 한글 입력 우선 설정

- [x] MemoEditor contentEditable에 lang="ko" 및 inputMode="text" 설정
- [x] 전체 페이지 html lang="ko" 확인
- [x] 모바일에서 한글 키보드 기본 표시

## 버그 수정 (3차)

- [x] 테이블 기록 저장 안 되는 문제 수정
- [x] 형광펜 두 번 눌러야 칠해지는 문제 수정

## TableReport 워킹/기존 → 워킹/손님이름 변경

- [x] guestType 타입에서 'regular' 제거, 'named'(지명) 추가
- [x] 워킹/기존 토글 버튼 → 워킹/지명 토글 버튼으로 변경
- [x] 지명 선택 시 손님 이름 입력 필드 표시
- [x] guestName 필드 DB 스키마 추가 및 마이그레이션
- [x] 저장/로드 시 guestName 포함

## 출근자 인센티브 근무시간 자동 계산

- [x] 근무 시작/종료 시간 입력 (time picker)
- [x] 시작~종료 기준 총 근무시간 자동 계산 (시간 분 표시)
- [x] 자정 넘어서 근무 시 (예: 22시~03시) 정상 계산

## MemoEditor 순수 textarea 전환

- [x] 세그먼트 방식 완전 제거
- [x] 일반 textarea로 입력 (한국어 IME 완전 호환)
- [x] 형광펜은 저장 후 표시 전용으로 분리

## 버그 수정 (2차)

- [x] 메모 세그먼트 로직: 이상한 글자 생성 / 지워지지 않는 문제 수정
- [x] 날짜 localStorage 저장 앱 환경에서 동작 확인
- [x] 새로고침 시 업데이트 알림 (서비스 워커 업데이트 대화상자)

## TableReport 날짜 새로고침 후 유지

- [x] 선택한 날짜를 localStorage에 저장
- [x] 페이지 로드 시 localStorage에서 날짜 복원 (없으면 오늘 날짜)

## MemoEditor 모바일/PC 호환 재설계

- [x] contentEditable 제거, textarea 기반으로 전환 (모바일 IME 호환)
- [x] 세그먼트 방식: 텍스트를 세그먼트 배열로 관리, 각 세그먼트는 텍스트+색상 정보 보유
- [x] 색상 선택 후 입력하는 내용은 해당 색상 세그먼트로 저장
- [x] 표시: 세그먼트를 스팸으로 렌더링
- [x] 텍스트 입력 시 전체 재렌더링 (입력 중 새 세그먼트 생성)

## 형광펜 방식 변경 (색상 선택 후 입력 시 자동 적용)

- [x] MemoEditor: 색상 팔레트 항상 표시 (선택 전: 회색, 선택 후: 해당 색상 하이라이트)
- [x] 색상 선택 시 이후 입력하는 텍스트에 자동으로 mark 태그 적용
- [x] 색상 선택 해제 (다시 클릭) 시 일반 텍스트 모드로 복귀
- [x] 기존 HTML 데이터 유지 (저장된 형광펜 표시)

## 메모 글씨 사라지는 문제 근본 수정

- [x] TableReport: staleTime=Infinity, refetchOnWindowFocus=false 설정
- [x] useEffect 의존성에서 currentDate 제거, loadedDateRef로 날짜별 로드 제어
- [x] 메모 입력 시 자동저장 트리거 안 함 (수동 저장만)
- [x] 자동저장 딜레이 2초 → 5초로 증가

## MemoEditor 버그 수정

- [x] 플레이스홀더 텍스트와 입력 글씨 겹침 문제 수정
- [x] 형광펜 버튼 클릭 시 텍스트 사라지는 문제 수정 (selection 유실 방지)
- [x] 형광펜 색상 적용 안 되는 문제 수정

## 결제 변경사항 서버/API 완전 제거

- [x] server/routers.ts storeSales.save (publicProcedure) - paymentChange 필드 제거
- [x] server/routers.ts storeSales.save (protectedProcedure) - paymentChange 필드 제거
- [x] server/routers.ts storeSales.notify - paymentChange 필드 제거
- [x] server/routers.ts tableReport.upsert - upsertDailySalesRecord 호출에서 paymentChange 제거
- [x] client/src/pages/Home.tsx - createEmptyLocalRecord, 서버 데이터 로드, 저장 함수에서 paymentChange 제거

## 테이블 기록 중복/데이터 변경 버그 수정

- [x] 매출 기록 저장 후 테이블 기록 이동 시 테이블 항목 중복 생성 문제 수정
- [x] 테이블 기록 이동 시 금액/데이터 변경 문제 수정
- [x] tableReport.upsert 호출 시 기존 테이블 항목 덮어쓰기 방지

## 저장 속도 개선

- [x] 서버: tableItems 배치 upsert API 구현 (항목별 순차 호출 → 한 번에 처리)
- [x] 서버: staffIncentives 배치 upsert API 구현
- [x] 클라이언트: 테이블 항목/인센티브 저장을 batchSave 단일 호출로 변경
- [x] 서버: batchSave 내부 Promise.all로 항목/인센티브 병렬 처리
- [x] 클라이언트: 저장 중 isSaving 상태 추가 (스피너 + 비활성화 + 중복 저장 방지)
