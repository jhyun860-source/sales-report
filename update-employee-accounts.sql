-- 직원 계정 추가 및 비밀번호 통일 SQL 스크립트
-- 실행 전 주의: 기존 계정 비밀번호가 변경됩니다.

-- 1. 기존 계정 비밀번호 통일 (1234)
-- bcryptjs로 생성한 '1234' 해시값
-- 아래 해시값은 '1234'를 bcryptjs로 해시한 값입니다:
UPDATE storeAccounts SET passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm' WHERE loginId = 'm1';
UPDATE storeAccounts SET passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm' WHERE loginId = 'm2';
UPDATE storeAccounts SET passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm' WHERE loginId = 'd1';
UPDATE storeAccounts SET passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm' WHERE loginId = 's1';
UPDATE storeAccounts SET passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm' WHERE loginId = 's2';

-- 2. 새로운 직원 계정 추가
-- 선릉점 직원 (branchId=2)
INSERT INTO storeAccounts (loginId, passwordHash, displayName, role, branchId) 
VALUES ('s3', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', '선릉점 직원', 'user', 2)
ON DUPLICATE KEY UPDATE passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', displayName = '선릉점 직원', role = 'user', branchId = 2;

-- 삼성점 직원 (branchId=3)
INSERT INTO storeAccounts (loginId, passwordHash, displayName, role, branchId) 
VALUES ('s4', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', '삼성점 직원', 'user', 3)
ON DUPLICATE KEY UPDATE passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', displayName = '삼성점 직원', role = 'user', branchId = 3;

-- 대치점 직원 (branchId=4)
INSERT INTO storeAccounts (loginId, passwordHash, displayName, role, branchId) 
VALUES ('d2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', '대치점 직원', 'user', 4)
ON DUPLICATE KEY UPDATE passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', displayName = '대치점 직원', role = 'user', branchId = 4;

-- 문정1호점 직원 (branchId=5)
INSERT INTO storeAccounts (loginId, passwordHash, displayName, role, branchId) 
VALUES ('m3', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', '문정1호점 직원', 'user', 5)
ON DUPLICATE KEY UPDATE passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', displayName = '문정1호점 직원', role = 'user', branchId = 5;

-- 문정2호점 직원 (branchId=6)
INSERT INTO storeAccounts (loginId, passwordHash, displayName, role, branchId) 
VALUES ('m4', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', '문정2호점 직원', 'user', 6)
ON DUPLICATE KEY UPDATE passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/KFm', displayName = '문정2호점 직원', role = 'user', branchId = 6;

-- 3. 계정 목록 확인
SELECT id, loginId, displayName, role, branchId FROM storeAccounts ORDER BY id;
