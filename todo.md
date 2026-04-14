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

## 현금누적/카드누적 계산 오류 수정

- [x] 매출 기록 페이지 현금누적/카드누적 계산 오류 원인 파악 및 수정

## 대치점 카드누적 계산 오류 수정 (4월 2일 기준)

- [x] DB에서 대치점 4월 데이터 조회하여 오류 원인 파악
- [x] 누적 계산 로직 수정 또는 데이터 보정 (4월 1~3일 cardTotal 직접 수정)

## 날짜 이동 시 없는 출근자 인센티브 중복 생성 버그

- [x] 날짜 이동(A→B→A→B) 시 없는 출근자가 자동 생성되는 버그 수정

## 테이블 기록 총합 계산 버그

- [x] 테이블 번호별 금액 합산 싙합이 잘못 계산되는 원인 파악 (4월 8일 기준 - mixed 누락 문제)
- [x] 싙합 계산 로직 수정 (mixed 제거로 해결)
- [x] 영향받은 날짜 데이터 재보정 (4월 8일 대치점 cashSum/cardSum 수정 및 누적금 연쇄 보정)

## 혼합(mixed) 결제 옵션 제거

- [x] DB에서 전 지점 4월 8일 mixed 항목 → card로 변경 및 cashSum/cardSum 재계산
- [x] DB에서 전 지점 모든 날짜 mixed 항목 → card로 일괄 변경
- [x] 서버 routers.ts에서 mixed enum 제거 및 cashSum/cardSum 계산 로직 수정
- [x] 클라이언트 TableReport.tsx에서 혼합 버튼 제거
- [x] 드리즘 스키마에서 mixed enum 제거 후 db:push

## 직원 인센티브 출근 시간 오후 고정

- [x] TableReport.tsx에서 출근 오전/오후 선택란 제거 및 PM 고정
- [x] emptyIncentive() 기본값 workStartAmPm: 'PM' 확인 (이미 PM으로 설정되어 있음)
- [x] DB 전 지점 staffIncentives의 workStartAmPm 모두 PM으로 보정 (오전 항목 없음 확인)

## 시제 입금 새로고침 시 사라지는 버그

- [x] 4월 8일 cashDeposit DB 저장 여부 확인 (스키마 컨럼 누락 확인)
- [x] 클라이언트 cashDeposit 로드 로직 진단 (serverRecord → record 초기화 시 '' 하드코딩 문제 발견)
- [x] 서버 save mutation에서 cashDeposit 처리 방식 확인 (스키마/routers 모두 수정)
- [x] 버그 수정 (Home.tsx cashDeposit: '' → serverRecord.cashDeposit?.toString() || '')

## 직원 인센티브 통계 페이지 개선

- [x] 서버 API: 직원별 근무 일수, 주간 근무시간, 월 총 근무시간 계산 추가
- [x] 서버 API: 잔추가×5000 + 병추가×10000 + 맥주병×3000 + 영업인센 합산 금액 계산
- [x] 서버 API: 주간 단위(월~일, 4/6~4/12 기준) 근무시간 집계
- [x] 서버 API: 주간 평균 인센티브 금액 계산
- [x] 클라이언트: 직원별 카드 형태로 근무일수/월총근무시간/인센티브금액 표시
- [x] 클라이언트: 주간 단위 근무시간 테이블 표시
- [x] 클라이언트: 주간 평균 인센티브 표시

## 테이블 기록 한글 키보드 우선 설정

- [x] TableReport.tsx 텍스트 입력 필드에 lang="ko" 및 inputMode="text" 속성 추가 (이미 적용되어 있음 확인 - 브라우저 보안정송 한계로 강제 불가)

## 4월 10일 누적금 오류

- [x] 4월 10일 cashTotal/cardTotal DB 값 확인 (대치점 4/6~4/12 전체 누락 확인)
- [x] 서버 누적금 계산 로직 재검토 (클라이언트 값 신뢰 → 서버 재계산으로 배포수정)
- [x] 영향받은 날짜 데이터 보정 (대치점 4/6~4/12 cashTotal/cardTotal 재보정 완료)

## 4월 9일/10일 posStartAmount/posEndAmount 보정

- [x] 대치점 4월 9일 posStartAmount/posEndAmount=0 → 1,099,000으로 보정
- [x] 대치점 4월 10일 posStartAmount/posEndAmount=0 → 1,099,000으로 보정
- [x] 대치점 4월 12일(일요일) posStartAmount/posEndAmount → 1,099,000으로 보정
- [x] 전 지점 posStart/posEnd=0 레코드 없음 확인 완료
- [x] 테스트 33개 전체 통과 확인

## 4월 10일 카드 매출 합계 오류 수정

- [x] 4월 10일 카드 매출 5,510,000 → 5,618,000으로 수정 (워킹 카드 120,000원을 12,000원으로 잘못 입력한 것 수정)
- [x] cardTotal 연쇄 재보정 (4월 10일 44,266,000 / 4월 12일 44,266,000)

## 지출 수정 시 이후 날짜 포스 시작금/마감금 연쇄 업데이트

- [x] 4월 9일~12일 포스 시작금/마감금 정확한 값 파악 및 DB 보정 (10일 posStart=1,029,000/posEnd=939,000 / 12일 posStart=posEnd=939,000)
- [x] 서버 save mutation에서 저장 후 이후 날짜들의 posStartAmount/posEndAmount 연쇄 재계산 로직 추가 (cascadeUpdatePosAmounts)
- [x] 테스트 33개 전체 통과 확인

## 일요일 영업 제외

- [x] 테이블 기록 화면에서 날짜 이동 시 일요일 건너뛰기
- [x] 매출 보고 화면에서 날짜 이동 시 일요일 건너뛰기
- [x] 현재 날짜가 일요일이면 자동으로 전날(토요일)로 이동

## 관리자 페이지 테이블 기록 미표시 버그

- [x] 관리자 대시보드에서 테이블 기록 조회 API 및 프론트 로직 확인 (adminDailyDetail에 tableReports/tableItems 누락)
- [x] 테이블 기록 데이터가 관리자 화면에 표시되도록 수정 (지점별 카드에 테이블 기록 항목 표 추가)

## 관리자 페이지 출근자 인센티브 데이터 표시

- [x] staffIncentives 스키마 확인 (직원명/윉4추/병추/맥주병추/영업인센/근무시간)
- [x] adminDailyDetail API에 staffIncentives 포함 (inArray 조회 추가)
- [x] 관리자 대시보드 테이블 기록 섹션 아래 출근자 인센티브 표 추가 (직원/윉4추/병추/맥주/영업인센, 근무시간 표시)

## 누적금(cashTotal/cardTotal) 연쇄 업데이트 자동화

- [x] 현재 누적금 계산 로직 파악 (cascadeUpdatePosAmounts 참고)
- [x] db.ts에 cascadeUpdateCumulativeAmounts 함수 추가 (일요일 이월/월1일 리셋/일반일 누적 로직 포함)
- [x] routers.ts save mutation 두 곳에 cascadeUpdateCumulativeAmounts 호출 추가
- [x] 테스트 33개 전체 통과 확인

## 저장 후 누적금 즉시 화면 반영

- [x] Home.tsx save mutation onSuccess에서 서버 데이터 refetch/invalidate 추가 (refetchRecord + refetchPrevRecord)
- [x] 저장 후 cashTotal/cardTotal/posStartAmount/posEndAmount가 새로고침 없이 즉시 반영

## 선릉점 4월 1일 → 삼성점 4월 1일 데이터 이동 및 근무시간 체크 기능

- [x] 선를점 4월 1일 데이터(dailySalesRecords, tableReports) 삼성점(branchId=3)으로 이동 (tableItems/staffIncentives는 tableReportId로 연결되어 자동 이동)
- [x] 출근자 인센티브 화면에 오후 8시~새벽 3시(420분) 기준 부족분(-분) 표시 기능 추가 (모든 지점 적용)
- [x] 관리자 화면에도 근무시간 부족분 표시 추가

## 출근자 인센티브 아르바이트/직원 구분 기능

- [x] staffIncentives 스키마에 staffType 콼럼 추가 (enum: 'staff'|'parttime', default: 'staff')
- [x] DB 마이그레이션 (pnpm db:push)
- [x] TableReport.tsx에 직원/아르바 토글 버튼 추가, 직원만 -분/✓ 표시
- [x] AdminDashboard.tsx에 staffType 포함 및 직원만 부족분 표시

## 직원 근무시간 7시간 기준 차이 표시

- [x] TableReport.tsx: 직원 선택 시 근무시간을 +몇분/-몇분/✓로 표시 (7시간=420분 기준)
- [x] AdminDashboard.tsx: 동일하게 직원 근무시간 차이 표시

## 직원 근무시간 7시간 기준 차이 표시

- [x] TableReport.tsx: 직원 선택 시 근무시간을 +몇분/-몇분/✓로 표시 (7시간=420분 기준, 아르바이트는 실제 시간 표시)
- [x] AdminDashboard.tsx: 동일하게 직원 근무시간 차이 표시

## 선릉점 4월 1일 카드 매출 수정

- [x] 선릉점 4월 1일 카드 항목 확인 및 100,000원 차이 원인 파악 (수정 불필요 - 현재 2,454,000원 유지)
- [x] DB 수정 및 cardTotal 연쇄 재보정 (수정 없음)

## 선릉점 4월 3일 이후 누적금/포스 시작금/마감금 누락 버그

- [x] 선릉점 4월 1일~이후 dailySalesRecords 전체 확인 (4월 2~4일 cashTotal/cardTotal/posStart/posEnd 모두 0)
- [x] cashTotal/cardTotal/posStartAmount/posEndAmount 누락 원인 파악 및 DB 보정 (4월 2~4일 연쇄 보정 완료)

## 전 지점 4월 데이터 정합성 검사

- [x] 전 지점 4월 dailySalesRecords 전수 조회 (cashTotal/cardTotal/posStart/posEnd 이상 감지)
- [x] 이상 데이터 원인 분석 및 보정값 계산
- [x] DB 보정 실행 (대치점 4월 11~12일, 선릉점 4월 6~7일 보정 완료 / 삼성점 사용자 확인 대기)
- [x] 선릉점 4월 6일 이후 cashTotal/cardTotal/posStart/posEnd 연쇄 보정 (4월 6일 cardTotal=9,873,000 / 4월 7일 13,893,000 / posStart/posEnd=35,000)
- [x] 삼성점 4월 1일 포스 시작금 확인 후 cashTotal/cardTotal/posStart/posEnd 연쇄 보정 (64,000원 확인 완료)

## 전 지점 4월 데이터 정밀 정합성 검사 (2차)

- [x] 전 지점 cashTotal/cardTotal/posStart/posEnd 연쇄 계산 검증 스크립트 실행 (선를점 4/7~4/10 21,000원 차이 및 삼성점 4/13 포스 시작금 오류 발견 및 보정)
- [x] 오류 항목 보정값 계산 및 DB 업데이트 (자동 보정 스크립트 11개 항목 보정 완료)

## 선릉점 4월 9일 이후 누적금 누락 근본 원인 수정

- [x] 선릅점 4월 9일 이후 데이터 확인 및 누락 원인 분석
- [x] computeCumulativesForDate 함수 추가 및 save mutation 수정 (중간 날짜 누락 보정 포함)
- [x] 선릅점 4월 8~9일 DB 보정 (cardTotal: 18,290,000 / 22,309,000)
- [x] TypeScript 오류 3건 해결 (cashDeposit 타입 불일치 - tsc 통과 확인)

## 직원 월간 근무 시간 +/- 통계

- [x] staffIncentives 데이터 구조 및 workStart/workEnd 파악
- [x] 서버: staffIncentiveStats 프로시저에 알바 제외 필터 및 workDiffMinutes/standardMinutes 추가
- [x] 프론트엔드: 직원 카드에 +/- 시간 배너 및 전체 합계 카드에 +/- 시간 합계 표시 추가

## 매출 수정 시 이후 날짜 누적금 자동 연쇄 업데이트

- [x] save mutation에서 현금/카드 변경 시 cascadeUpdateCumulativeAmounts 호출 보장 (이미 구현 완료)
- [x] 선를점 4월 6~7일 현금 누적금 불일치 DB 보정 (이전 보정 완료)

## 누적금 오류 근본 해결 (전면 개선)

- [x] computeCumulativesForDate: 이전 레코드 없어도 해당 달 전체 스캔으로 정확한 누적금 계산 (이미 구현 완료)
- [x] cascadeUpdateCumulativeAmounts: 중간 날짜 누락 포함 완전 연쇄 재계산 (이미 구현 완료)
- [x] 전 지점 4월 누적금 일괄 재계산 DB 보정 스크립트 실행 (이전 보정 완료)

## 매출 수정 시 이후 날짜 자동 연쇄 업데이트 근본 해결

- [x] save mutation에서 cascadeUpdateCumulativeAmounts catch {} → catch (e) { console.error } 로 수정
- [x] 프론트엔드 저장 후 utils.storeSales.invalidate() 추가 (이후 날짜 화면 갱신)
- [x] computeCumulativesForDate 전체 달 스캔 방식으로 재작성 (이전 레코드 의존 제거)
- [x] cascadeUpdateCumulativeAmounts도 computeCumulativesForDate 기반으로 재작성
- [x] 선릉점 4월 1일 cash→card 수정 및 연쇄 재계산 완료 (전체 ✓ 검증)
- [x] computeCumulativesForDate/cascadeUpdateCumulativeAmounts Vitest 회귀 테스트 추가 (server/cumulative.test.ts 9개 테스트 전체 통과)

## 관리자 페이지 지점 선택 새로고침 버그

- [x] 관리자 페이지 지점 선택 상태 유지 로직 파악 (새로고침 시 대치점으로 초기화되는 원인)
- [x] 선택된 지점을 localStorage에 유지하도록 수정 (저장/복원 완료)
- [x] 관리자 페이지 테이블 기록 전 지점 안 보이는 원인 파악 및 수정 (adminDailyDetail 두 번 정의 문제 해결, hasTableData 조건 완화)

## 인센티브 통계 알바생 미표시 버그

- [x] staffIncentiveStats 프로시저에서 알바(parttime) 필터링 로직 확인 (원인: staffType='staff' 하드코딩 필터)
- [x] 알바생도 통계에 표시되도록 수정 (알바 도움말 배지, 근무시간 기준은 직원만 적용, 전 지점 동일 적용)

## 인센티브 통계 지점 필터 버그

- [x] StaffIncentiveStats에서 branchId 전달 로직 파악 (원인: branchId를 쿼리에 전혀 전달 안 함)
- [x] Home.tsx에서 인센티브 통계 이동 시 URL 파라미터로 branchId 전달, StaffIncentiveStats에서 URL 파라미터 읽어 쿼리에 전달

## 관리자 로그인 시 테이블 기록 미표시 버그

- [x] adminDailyDetail 프로시저에서 tableReport 조회 로직 확인 (원인: storeAccount 쿠키만 확인, Manus OAuth 관리자 차단)
- [x] adminDailyDetail/adminSummary에 Manus OAuth 관리자(ctx.user.role==='admin')도 허용하도록 수정

## 관리자 선릉점 테이블 기록 여전히 안 보이는 버그 (재확인)

- [x] AdminDashboard에서 선를점 선택 시 tableReport 데이터 실제 반환 여부 확인 (관리자 테이블 기록 접근 전면 수정으로 해결)
- [x] adminDailyDetail 두 번째 정의(adminProcedure)도 OAuth 관리자 허용 여부 확인 (이전 수정 완료)

## 관리자 테이블 기록 접근 전면 수정

- [x] Home.tsx 테이블 버튼 클릭 시 selectedBranchId를 URL 파라미터로 전달
- [x] tableReport.getByDate 서버 프로시저에서 관리자가 branchId 직접 지정 가능하도록 수정
- [x] TableReport.tsx에서 URL 파라미터 branchId를 읽어 쿼리에 전달 (관리자 모드)

## 삼성점 누적금/포스 시작금/마감금 전혀 안 넘어가는 버그

- [x] 삼성점 4월 dailySalesRecords 전체 조회 (cashTotal/cardTotal/posStart/posEnd 상태 확인)
- [x] 누락 원인 파악 (4/1 cashTotal=0, 4/10 cardTotal=0, posStart/posEnd 전부 0 - 초기값 미설정)
- [x] 보정값 계산 및 DB 업데이트 (4/1~4/10 cashTotal/cardTotal/posStart/posEnd 전부 보정)
- [x] 삼성점 포스 시작금 64,000원 초기값 설정 및 이후 날짜 연쇄 보정 완료

## 포스기 주문내역 사진 AI 자동 분석 기능

- [x] 서버: S3 이미지 업로드 + LLM Vision으로 현금/카드 금액 추출 tRPC 프로시저 구현 (storeSales.analyzeImage)
- [x] 프론트엔드: 매출 입력 화면에 카메라/파일 업로드 버튼 추가
- [x] 프론트엔드: AI 분석 결과(현금/카드/지출항목)를 폼에 자동 체우기
- [x] 프론트엔드: 분석 중 로딩 상태 및 에러 처리
- [x] 분석 결과 확인 후 수정 가능하도록 UI 구성 (자동 체우기 후 수동 수정 가능)

## 누적금액 미표시 + 주문메모 저장 + 사진 AI 기능 이동

- [x] 매출 입력 화면 사진 분석 버튼 제거
- [x] 테이블 기록 주문메모에 사진 AI 분석 기능 이동 (tableReport.analyzeOrderMemo 프로시저 + 카메라 버튼 UI)
- [x] 주문메모 저장 버그 수정 (memo 필드도 scheduleAutoSave 트리거)
- [x] 누적금액 미표시 버그 수정 (batchSave/upsert에서 cascadeUpdateCumulativeAmounts 호출)

## 누적금 0 표시 + 지점명 미표시 버그 (4/14 재확인)

- [x] DB에서 실제 4월 13일~14일 cashTotal/cardTotal 값 확인 (대치점/삼성점 정상, 선릅점 4/11까지만 존재)
- [x] 테이블 기록 저장 시 cascadeUpdateCumulativeAmounts 실제 호출 여부 확인 (이미 구현됨)
- [x] Home.tsx 헤더 지점명 표시 로직 확인 (정상 - localStorage 토큰 인증 전환으로 해결)
- [x] 누적금 0 원인 수정 (모바일 Chrome 쿠키 차단 문제 해결 + 선릅점 posStart/posEnd 보정)

## 모바일 쿠키 차단 문제 → localStorage 토큰 인증 전환

- [x] 서버: parseStoreCookie에서 Authorization 헤더 Bearer 토큰도 파싱하도록 수정
- [x] 서버: loginWithPassword 응답에 token 필드 추가
- [x] 프론트: loginWithPassword 성공 시 token을 localStorage에 저장
- [x] 프론트: trpc client에서 모든 요청에 Authorization 헤더 추가
- [x] 프론트: 로그아웃 시 localStorage 토큰 삭제

## 포스기 사진 AI 분석 - 이전 기록 참고 형광펜 + 금액 자동 계산

- [x] 서버: analyzeOrderMemo에 branchId/date 파라미터 추가 (이전 기록 조회용)
- [x] 서버: 해당 지점 최근 60일 tableItems 메모에서 형광펜 패턴(직원명/주류명) 추출
- [x] 서버: 형광펜 패턴을 LLM 프롬프트에 포함하여 형광펜 HTML + 금액 계산
- [x] 서버: 응답에 memo(HTML), amount(숫자) 반환
- [x] 프론트: analyzeOrderMemo 호출 시 branchId/date 전달
- [x] 프론트: 분석 결과 amount가 있으면 해당 아이템 금액 자동 입력

## 사진 AI 분석 메모 형식 개선 + 대치점 지점명/매출현황 버그

- [x] 대치점 storeMe 응답에서 branchId/branch 정상 반환 여부 확인 (정상 확인)
- [x] Home.tsx에서 selectedBranchId/myBranches 로딩 타이밍 버그 확인 및 수정 (myBranches 유효성 검사 로직 추가)
- [x] analyzeOrderMemo: x1 → (1) 형식으로 변환, 괄호 끝까지 형광펜 적용
- [x] analyzeOrderMemo: 이미지에서 각 항목 금액 파악 후 합산 → amount 자동 입력

## 대치점 지점명/매출현황 미표시 버그 재조사 (4/14)

- [x] useStoreAuth 훈에서 storeMe 응답 파싱 로직 확인
- [x] Home.tsx myBranches 계산 로직 재확인
- [x] 브라우저 콘솔 오류 및 네트워크 요청 확인 (서버 응답 정상)
- [x] 근본 원인 수정: selectedBranchId 렌더링시 직접 계산 + staleTime 제거

## 테이블 기록 사진 분석 - 무제한 형광펜 제외

- [x] analyzeOrderMemo 프롬프트에서 "무제한" 단어는 노란 형광펜 적용 제외 규칙 추가 (블랙리스트 필터 + 프롬프트 명시)

## 테이블 기록 합치기 기능 (분할 결제 대응)

- [x] DB 스키마 및 tableItems 구조 파악
- [x] 서버: tableReport.mergeItems 프로시저 추가 (A+B 합치기 - 메모 합산, 금액 합산, B 삭제, 누적금 재계산)
- [x] 프론트엔드: 테이블 카드 헤더에 합치기 아이콘 버튼 추가
- [x] 프론트엔드: 2단계 선택 방식 (첫 번째 누르면 대상 선택, 두 번째 누르면 합치기 실행)
- [x] 프론트엔드: window.confirm으로 합치기 전 금액/메모 미리보기 확인
