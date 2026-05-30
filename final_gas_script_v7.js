/**
 * SalesDash - Google Sheets 통합 자동화 스크립트 (V7 - 날짜 매칭 및 행 오프셋 최적화)
 */
const CONFIG = {
  SPREADSHEET_IDS: {
    '대치점': '1mmpslP9Tv7hOcHs9hzKoK3O1lhylTeFe2eTfCoPDJKg',
    '선릉점': '1Er9vn-8Is3f56B_7JfqlxpjnKfGa51WqJHBiI7nQZsE',
    '삼성점': '17u0sGfvvtK81pS5dumblpuPbFmLbwWHEfKQgar1LN64',
    '문정1호점': '1aQ9p2VREIz78rLUG8-nsw5wRDHw1tidbtEFGGxGG1II',
    '문정2호점': '1dvra0EkolFTLWVlDsV-CXh2Oay5iK0HGzRSEb6ouF5M'
  },
  MONTHLY_RENT: { '대치점': 9000000, '삼성점': 6500000, '선릉점': 6500000, '문정1호점': 4500000, '문정2호점': 4500000 },
  FIXED_EXPENSE: { '대치점': 3000000, '삼성점': 600000, '선릉점': 0, '문정1호점': 0, '문정2호점': 0 },
  SALARY: {
    '대치점': { manager: 272727, staff: 136363 },
    '선릉점': { manager: 250000, staff: 136363 },
    '삼성점': { manager: 181818, staff: 159090 },
    '문정1호점': { manager: 204545, staff: 136363 },
    '문정2호점': { manager: 204545, staff: 136363 },
    'parttime': 20000
  }
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    const data = JSON.parse(e.postData.contents);
    const branchName = data.branchName;
    const dateStr = data.date; // "YYYY-MM-DD"
    const date = new Date(dateStr);
    
    const ssId = CONFIG.SPREADSHEET_IDS[branchName];
    if (!ssId) throw new Error("지점 ID를 찾을 수 없습니다: " + branchName);
    
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheets()[0];
    
    // 날짜 매칭 (시트의 "M월 D일" 형식과 비교)
    const targetInfo = findTargetCell(sheet, date);
    if (!targetInfo) throw new Error(dateStr + " 날짜를 시트에서 찾을 수 없습니다.");
    
    const { row, col } = targetInfo;
    
    // 데이터 계산
    const totalSales = data.totalSales || 0;
    const kitchenFee = Math.floor(totalSales * 0.17);
    const businessDays = getBusinessDaysCount(date.getFullYear(), date.getMonth());
    const dailyRent = Math.floor((CONFIG.MONTHLY_RENT[branchName] || 0) / businessDays);
    const dailyFixed = Math.floor((CONFIG.FIXED_EXPENSE[branchName] || 0) / businessDays);
    const rentAndMaintenance = dailyRent + dailyFixed;
    
    let managerSalary = 0;
    const dayOfWeek = date.getDay(); // 0:일, 1:월...
    if (dayOfWeek >= 1 && dayOfWeek <= 5) managerSalary = CONFIG.SALARY[branchName]?.manager || 0;
    
    const staffCount = (data.staffList || []).filter(s => s.staffType === 'staff').length;
    const staffSalary = (staffCount > 0 ? (staffCount - 1) : 0) * (CONFIG.SALARY[branchName]?.staff || 0);
    const totalStaffSalary = managerSalary + staffSalary;
    
    const parttimeCount = (data.staffList || []).filter(s => s.staffType === 'parttime').length;
    const totalParttimeSalary = parttimeCount * CONFIG.SALARY.parttime;
    
    const staffDrinks = (data.liquorList || []).filter(l => l.isStaffDrink).length * 10000; // 예시 단가 1만

    // 시트 기록 (오프셋 적용)
    sheet.getRange(row + 1, col).setValue(kitchenFee);         // 수수료/주방
    sheet.getRange(row + 2, col).setValue(rentAndMaintenance); // 임대료/관리비
    sheet.getRange(row + 3, col).setValue(data.totalExpense || 0); // 총지출
    sheet.getRange(row + 4, col).setValue(data.liquorPrice || 0);  // 주류/단가
    sheet.getRange(row + 7, col).setValue(totalStaffSalary);   // 직원 인건비
    sheet.getRange(row + 8, col).setValue(totalParttimeSalary);// 여알바
    sheet.getRange(row + 9, col).setValue(staffDrinks);        // 스탭음료
    sheet.getRange(row + 10, col).setValue(totalSales);        // 총매출

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data recorded at Row " + row + ", Col " + col })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function findTargetCell(sheet, date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const targetText = month + "월 " + day + "일";
  
  const data = sheet.getDataRange().getValues();
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      let cellValue = data[r][c];
      if (cellValue instanceof Date) {
        if (cellValue.getMonth() + 1 === month && cellValue.getDate() === day) {
          return { row: r + 1, col: c + 1 };
        }
      } else if (typeof cellValue === 'string' && cellValue.includes(targetText)) {
        return { row: r + 1, col: c + 1 };
      }
    }
  }
  return null;
}

function getBusinessDaysCount(year, month) {
  let count = 0;
  let date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    let day = date.getDay();
    if (day !== 0) count++; // 일요일 제외 (월~토 영업)
    date.setDate(date.getDate() + 1);
  }
  return count;
}
