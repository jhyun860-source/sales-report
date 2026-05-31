-- ============================================================
-- SalesDash 지점별 초기 설정값 세팅 스크립트
-- 마누스 샌드박스에서 실행: mysql 접속 후 실행하거나
-- drizzle-kit push 후 아래 Node.js 스크립트로 실행
-- ============================================================

-- branches 테이블에 지점별 설정값 UPDATE
-- (지점은 이미 등록되어 있으므로 UPDATE 사용)

-- 지점 이름으로 UPDATE (id를 모를 경우)
UPDATE branches SET
  monthlyRent = 9000000,
  managementFee = 0,
  staffDailyWage = 136363,
  partTimeHourlyWage = 20000,
  commissionRate = 0.17,
  hasManager = 1,
  managerDailyWage = 272727,
  glassUnitPrice = 5000,
  bottleUnitPrice = 10000,
  beerBottleUnitPrice = 3000
WHERE name = '대치점';

UPDATE branches SET
  monthlyRent = 6500000,
  managementFee = 0,
  staffDailyWage = 136363,
  partTimeHourlyWage = 20000,
  commissionRate = 0.17,
  hasManager = 1,
  managerDailyWage = 250000,
  glassUnitPrice = 5000,
  bottleUnitPrice = 10000,
  beerBottleUnitPrice = 3000
WHERE name = '선릉점';

UPDATE branches SET
  monthlyRent = 6500000,
  managementFee = 0,
  staffDailyWage = 159090,
  partTimeHourlyWage = 20000,
  commissionRate = 0.17,
  hasManager = 1,
  managerDailyWage = 181818,
  glassUnitPrice = 5000,
  bottleUnitPrice = 10000,
  beerBottleUnitPrice = 3000
WHERE name = '삼성점';

UPDATE branches SET
  monthlyRent = 4500000,
  managementFee = 0,
  staffDailyWage = 136363,
  partTimeHourlyWage = 20000,
  commissionRate = 0.17,
  hasManager = 1,
  managerDailyWage = 204545,
  glassUnitPrice = 5000,
  bottleUnitPrice = 10000,
  beerBottleUnitPrice = 3000
WHERE name = '문정1호점';

UPDATE branches SET
  monthlyRent = 4500000,
  managementFee = 30000,
  staffDailyWage = 136363,
  partTimeHourlyWage = 20000,
  commissionRate = 0.17,
  hasManager = 0,
  managerDailyWage = 0,
  glassUnitPrice = 5000,
  bottleUnitPrice = 10000,
  beerBottleUnitPrice = 3000
WHERE name = '문정2호점';

-- 확인 쿼리
SELECT name, monthlyRent, managementFee, staffDailyWage, partTimeHourlyWage, 
       hasManager, managerDailyWage, glassUnitPrice
FROM branches
ORDER BY name;
