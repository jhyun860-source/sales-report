# 매출 일일 보고 앱 디자인 아이디어

## Idea A: 실용적 업무 도구 스타일 (Business Utility)
<response>
<text>
**Design Movement**: 실용적 비즈니스 도구 + 한국 POS 시스템 감성
**Core Principles**:
- 빠른 입력을 위한 큰 터치 타겟
- 숫자 가독성 최우선 (모노스페이스 폰트)
- 흰 배경에 짙은 회색 텍스트로 명확한 대비
- 섹션별 명확한 구분선

**Color Philosophy**: 흰 배경(#FFFFFF), 포인트 컬러 진한 남색(#1E3A5F), 합계 강조 오렌지(#E8640C)
**Layout Paradigm**: 단일 스크롤 페이지, 섹션별 카드 구분
**Signature Elements**: 두꺼운 테이블 테두리, 숫자 우측 정렬, 원화 기호 강조
**Interaction Philosophy**: 탭 순서 최적화, 숫자 키패드 자동 호출
**Animation**: 합계 업데이트 시 숫자 카운트업 효과
**Typography System**: Noto Sans KR (본문) + 숫자는 D2Coding 모노스페이스
</text>
<probability>0.08</probability>
</response>

## Idea B: 클린 모바일 앱 스타일 (Clean Mobile)
<response>
<text>
**Design Movement**: iOS/Android 네이티브 앱 감성의 웹앱
**Core Principles**:
- 카드 기반 섹션 구분
- 부드러운 그림자와 둥근 모서리
- 입력 완료 시 시각적 피드백
- 하단 고정 저장 버튼

**Color Philosophy**: 밝은 회색 배경(#F5F5F7), 흰 카드, 파란 포인트(#007AFF)
**Layout Paradigm**: 카드 스택 레이아웃, 섹션별 접기/펼치기
**Signature Elements**: 부드러운 그림자, 파란 포인트 버튼, 입력 포커스 하이라이트
**Interaction Philosophy**: 스와이프 제스처, 햅틱 피드백 시뮬레이션
**Animation**: 카드 슬라이드인, 숫자 변경 시 fade
**Typography System**: Noto Sans KR 전용, 숫자는 Tabular nums
</text>
<probability>0.07</probability>
</response>

## Idea C: 영수증/장부 감성 (Receipt Ledger)
<response>
<text>
**Design Movement**: 실물 장부/영수증 감성의 디지털 변환
**Core Principles**:
- 실물 양식과 유사한 레이아웃으로 친숙함
- 세로줄 표 구조 유지
- 날짜 헤더 강조
- 지출 내역 동적 추가/삭제

**Color Philosophy**: 크림색 배경(#FAFAF7), 짙은 먹색 텍스트(#1A1A1A), 포인트 붉은색(#C0392B)
**Layout Paradigm**: 실물 양식 모방 레이아웃, 상단 날짜 → 매출 표 → 지출 내역 → 결제변경
**Signature Elements**: 표 테두리 스타일, 손글씨 느낌의 헤더 폰트, 합계 행 강조
**Interaction Philosophy**: 직관적 탭 이동, 지출 행 추가 버튼
**Animation**: 새 행 추가 시 슬라이드다운, 합계 실시간 업데이트
**Typography System**: Noto Serif KR (헤더) + Noto Sans KR (본문)
</text>
<probability>0.09</probability>
</response>

## 선택: Idea C - 영수증/장부 감성
실물 양식과 유사한 레이아웃으로 점장들이 기존 종이 양식에서 자연스럽게 전환할 수 있도록 설계
