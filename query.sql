SELECT si.staffName, si.staffType, si.glassCount, si.bottleCount, si.beerBottleCount, si.salesIncentive, si.workStart, si.workEnd
FROM staffIncentives si
JOIN tableReports tr ON si.tableReportId = tr.id
WHERE tr.branchId = 3 AND tr.date = '2026-06-08';
