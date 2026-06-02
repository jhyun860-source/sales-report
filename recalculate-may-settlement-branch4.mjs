import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'sales_report',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DATABASE_URL?.includes('Amazon RDS') ? { rejectUnauthorized: false } : false,
});

// calculateDailySettlement 함수 (서버 코드에서 가져온 로직)
function calculateDailySettlement(record, branchSettings) {
  const {
    totalRevenue = 0,
    expenses = [],
    staffAttendance = [],
  } = record;

  const {
    monthlyRent = 0,
    managerDailyWage = 0,
    staffDailyWage = 0,
    partTimeHourlyWage = 0,
    commissionRate = 0.17,
  } = branchSettings;

  // 영업인센 (totalRevenue * commissionRate)
  const commissionExpense = Math.round(totalRevenue * commissionRate);

  // 임대료 (월 임대료 / 30)
  const rentExpense = Math.round(monthlyRent / 30);

  // 지출 항목 합계
  let expenseTotal = 0;
  let liquorCostExpense = 0;
  let staffDrinkExpense = 0;
  let otherExpense = 0;

  if (Array.isArray(expenses)) {
    expenses.forEach(exp => {
      const amount = parseInt(exp.amount) || 0;
      if (exp.category === 'liquor') {
        liquorCostExpense += amount;
      } else if (exp.category === 'staffDrink') {
        staffDrinkExpense += amount;
      } else {
        otherExpense += amount;
      }
      expenseTotal += amount;
    });
  }

  // 직원 인건비 계산
  let staffWageExpense = 0;
  let partTimeWageExpense = 0;
  let managerWageExpense = 0;

  if (Array.isArray(staffAttendance)) {
    staffAttendance.forEach(att => {
      const hours = parseInt(att.hours) || 0;
      if (att.staffType === 'manager') {
        managerWageExpense += managerDailyWage;
      } else if (att.staffType === 'staff') {
        staffWageExpense += staffDailyWage;
      } else if (att.staffType === 'parttime') {
        partTimeWageExpense += hours * partTimeHourlyWage;
      }
    });
  }

  // 총 지출
  const totalExpenses = commissionExpense + rentExpense + expenseTotal + staffWageExpense + managerWageExpense + partTimeWageExpense;

  // 순수익
  const netProfit = totalRevenue - totalExpenses;

  return {
    commissionExpense,
    rentExpense,
    managementFeeExpense: 0,
    staffWageExpense,
    managerWageExpense,
    partTimeWageExpense,
    liquorCostExpense,
    staffDrinkExpense,
    otherExpense,
    totalExpenses,
    netProfit,
  };
}

async function recalculateSettlement() {
  const connection = await pool.getConnection();

  try {
    // 1. branchSettings 조회
    const [branchSettingsRows] = await connection.query(
      'SELECT * FROM branchSettings WHERE branchId = ?',
      [4]
    );

    if (branchSettingsRows.length === 0) {
      console.error('❌ 지점 설정을 찾을 수 없습니다.');
      process.exit(1);
    }

    const branchSettings = branchSettingsRows[0];
    console.log('✓ 지점 설정 로드:', branchSettings);

    // 2. 2026년 5월 dailySalesRecords 조회
    const [records] = await connection.query(
      `SELECT * FROM dailySalesRecords 
       WHERE branchId = 4 AND YEAR(date) = 2026 AND MONTH(date) = 5
       ORDER BY date ASC`,
      []
    );

    console.log(`\n✓ 조회된 레코드 수: ${records.length}개`);

    if (records.length === 0) {
      console.log('처리된 레코드 수: 0');
      process.exit(0);
    }

    // 3. 각 레코드 재계산 및 UPDATE
    let totalNetProfit = 0;
    let updatedCount = 0;

    for (const record of records) {
      try {
        // expenses와 staffAttendance JSON 파싱
        let expenses = [];
        let staffAttendance = [];

        try {
          if (record.expenses && typeof record.expenses === 'string') {
            expenses = JSON.parse(record.expenses);
          } else if (Array.isArray(record.expenses)) {
            expenses = record.expenses;
          }
        } catch (e) {
          console.warn(`⚠ ${record.date} expenses 파싱 실패:`, e.message);
        }

        try {
          if (record.staffAttendance && typeof record.staffAttendance === 'string') {
            staffAttendance = JSON.parse(record.staffAttendance);
          } else if (Array.isArray(record.staffAttendance)) {
            staffAttendance = record.staffAttendance;
          }
        } catch (e) {
          console.warn(`⚠ ${record.date} staffAttendance 파싱 실패:`, e.message);
        }

        // 재계산
        const settlement = calculateDailySettlement(
          {
            totalRevenue: record.totalRevenue || 0,
            expenses,
            staffAttendance,
          },
          branchSettings
        );

        // UPDATE 실행
        await connection.query(
          `UPDATE dailySalesRecords 
           SET commissionExpense = ?,
               rentExpense = ?,
               managementFeeExpense = ?,
               staffWageExpense = ?,
               managerWageExpense = ?,
               partTimeWageExpense = ?,
               liquorCostExpense = ?,
               staffDrinkExpense = ?,
               otherExpense = ?,
               totalExpenses = ?,
               netProfit = ?
           WHERE id = ?`,
          [
            settlement.commissionExpense,
            settlement.rentExpense,
            settlement.managementFeeExpense,
            settlement.staffWageExpense,
            settlement.managerWageExpense,
            settlement.partTimeWageExpense,
            settlement.liquorCostExpense,
            settlement.staffDrinkExpense,
            settlement.otherExpense,
            settlement.totalExpenses,
            settlement.netProfit,
            record.id,
          ]
        );

        totalNetProfit += settlement.netProfit;
        updatedCount++;

        console.log(`✓ ${record.date}: 순수익 ${settlement.netProfit.toLocaleString('ko-KR')}원`);
      } catch (err) {
        console.error(`❌ ${record.date} 처리 중 오류:`, err.message);
      }
    }

    console.log(`\n✅ 정산 재계산 완료`);
    console.log(`처리된 레코드 수: ${updatedCount}개`);
    console.log(`월 순수익 합계: ${totalNetProfit.toLocaleString('ko-KR')}원`);

    process.exit(0);
  } catch (err) {
    console.error('❌ 오류 발생:', err.message);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

recalculateSettlement();
