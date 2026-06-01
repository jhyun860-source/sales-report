# DB 자동 백업

매일 KST 00:05에 자동으로 DB 스냅샷이 저장됩니다.

## 파일 구조
- `backups/YYYY-MM-DD.json` : 날짜별 스냅샷
- `backups/latest.json` : 가장 최근 스냅샷
- `backups/index.json` : 백업 목록 (최근 90일)

## 백업 대상 테이블
- dailySalesRecords (매출 기록)
- tableReports / tableItems / staffIncentives (테이블 보고)
- liquorItems / liquorInventories / liquorStockMovements / liquorHiddenItems (주류 재고)
- branches (지점 정보)

## 복구 방법
Claude에게 "YYYY-MM-DD 백업으로 복구해줘" 라고 요청하면 됩니다.
