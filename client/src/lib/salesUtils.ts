// 매출 보고 데이터 타입 및 유틸리티 함수
// Design: 장부/영수증 감성 - 실물 양식과 동일한 구조

export interface ExpenseItem {
  id: string;
  description: string;
  amount: string;
}

export interface DailySalesRecord {
  id: string;
  date: string; // YYYY-MM-DD
  posStartAmount: string;
  cash: string;
  card: string;
  expenses: ExpenseItem[];
  posEndAmount: string;
  paymentChangeNote: string;
  paymentChangeDate: string;
  paymentChangeAmount: string;
  // 시제 입금
  cashDeposit: string;
  // 누적 합계 (직접 입력)
  cashTotal: string;
  cardTotal: string;
}

// 숫자 포맷: 1234567 → 1,234,567
export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num) || value === '' || value === null) return '';
  return num.toLocaleString('ko-KR');
}

// 입력값 파싱: "1,234,567" → 1234567
export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  return cleaned === '' ? 0 : parseFloat(cleaned);
}

// 오늘 날짜 YYYY-MM-DD
export function getTodayString(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 날짜 표시 포맷: "2026-04-10" → "2026년 4월 10일"
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const weekday = weekdays[date.getDay()];
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 (${weekday})`;
}

// 요일 반환
export function getDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return weekdays[date.getDay()];
}

// 지출 합계 계산
export function calcExpenseTotal(expenses: ExpenseItem[]): number {
  return expenses.reduce((sum, item) => {
    return sum + parseAmount(item.amount);
  }, 0);
}

// 당일 합계 = 현금 + 카드
export function calcDailyTotal(cash: string, card: string): number {
  return parseAmount(cash) + parseAmount(card);
}

// localStorage 키
const STORAGE_KEY = 'sales_records';
const CURRENT_DATE_KEY = 'sales_current_date';
const LAST_RESET_KEY = 'sales_last_reset_month';

// 매월 1일에 누적값 리셋 여부 확인
export function shouldResetMonthly(): boolean {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const lastReset = localStorage.getItem(LAST_RESET_KEY);
  
  // 오늘이 1일이고, 이번 달에 아직 리셋하지 않았으면 true
  if (today.getDate() === 1 && lastReset !== currentMonth) {
    localStorage.setItem(LAST_RESET_KEY, currentMonth);
    return true;
  }
  return false;
}

// 저장된 기록 불러오기
export function loadRecords(): DailySalesRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 기록 저장
export function saveRecords(records: DailySalesRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 특정 날짜 기록 찾기
export function findRecordByDate(records: DailySalesRecord[], date: string): DailySalesRecord | undefined {
  return records.find(r => r.date === date);
}

// 새 빈 기록 생성
export function createEmptyRecord(date: string): DailySalesRecord {
  return {
    id: `record_${date}_${Date.now()}`,
    date,
    posStartAmount: '',
    cash: '',
    card: '',
    expenses: [{ id: `exp_${Date.now()}`, description: '', amount: '' }],
    posEndAmount: '',
    paymentChangeNote: '',
    paymentChangeDate: '',
    paymentChangeAmount: '',
    cashDeposit: '',
    cashTotal: '',
    cardTotal: '',
  };
}

// 기록 업데이트 또는 추가
export function upsertRecord(records: DailySalesRecord[], record: DailySalesRecord): DailySalesRecord[] {
  const idx = records.findIndex(r => r.date === record.date);
  if (idx >= 0) {
    const updated = [...records];
    updated[idx] = record;
    return updated;
  }
  return [record, ...records];
}

// 날짜 목록 (최신순)
export function getDateList(records: DailySalesRecord[]): string[] {
  return records
    .map(r => r.date)
    .sort((a, b) => b.localeCompare(a));
}

// 현재 편집 날짜 저장/불러오기
export function saveCurrentDate(date: string): void {
  localStorage.setItem(CURRENT_DATE_KEY, date);
}

export function loadCurrentDate(): string {
  return localStorage.getItem(CURRENT_DATE_KEY) || getTodayString();
}

// 누적값 리셋 함수
export function resetMonthlyTotals(records: DailySalesRecord[]): DailySalesRecord[] {
  return records.map(record => ({
    ...record,
    cashTotal: '',
    cardTotal: '',
  }));
}
