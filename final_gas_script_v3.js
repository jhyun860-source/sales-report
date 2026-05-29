/**
 * SalesDash - Google Sheets 통합 자동화 스크립트 (기존 시트 대응 버전)
 */
const CONFIG = {
  TEMPLATE_IDS: {
    '대치점': '1mmpslP9Tv7hOcHs9hzKoK3O1lhylTeFe2eTfCoPDJKg',
    '선릉점': '1Er9vn-8Is3f56B_7JfqlxpjnKfGa51WqJHBiI7nQZsE',
    '삼성점': '17u0sGfvvtK81pS5dumblpuPbFmLbwWHEfKQgar1LN64',
    '문정1호점': '1aQ9p2VREIz78rLUG8-nsw5wRDHw1tidbtEFGGxGG1II',
    '문정2호점': '1-xgoWVDNjmRfld88mdX12Bp8gcSZrsU_'
  },
  STAFF_SALARY: { '점장': 204545, '알바': 20000 }
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const branchName = data.branchName || '문정2호점';
    const dateStr = data.date || Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd");
    const date = new Date(dateStr);
    const monthStr = Utilities.formatDate(date, "GMT+9", "yyyy-MM");
    
    const fileName = branchName + " " + monthStr;
    let spreadsheet = getOrCreateSpreadsheet(fileName, branchName);
    
    // 기존 시트 이름인 "순수익 계산"을 사용합니다.
    let sheet = spreadsheet.getSheetByName("순수익 계산") || spreadsheet.getSheets()[0];
    
    // 데이터 입력 (기존 시트 구조에 맞춰 appendRow)
    sheet.appendRow([
      dateStr,
      branchName,
      data.totalSales || 0,
      data.cashSales || 0,
      data.cardSales || 0,
      data.rent || 0,
      data.liquorPrice || 0,
      data.staffSalary || 0,
      data.staffDrink || 0,
      data.netProfit || 0,
      new Date()
    ]);

    return ContentService.createTextOutput(JSON.stringify({result: 'success'})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({result: 'error', error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSpreadsheet(fileName, branchName) {
  const files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  } else {
    const templateId = CONFIG.TEMPLATE_IDS[branchName];
    const templateFile = DriveApp.getFileById(templateId);
    const newFile = templateFile.makeCopy(fileName);
    return SpreadsheetApp.open(newFile);
  }
}
