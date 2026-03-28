// src/utils/date.ts
// 날짜 관련 유틸리티 함수

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;
export const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'] as const;

/**
 * Date → 'YYYY-MM-DD' 문자열
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 오늘 날짜 문자열
 */
export function today(): string {
  return formatDate(new Date());
}

/**
 * 'YYYY-MM-DD' → Date 객체
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * 날짜에 일수 더하기/빼기
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * 요일 인덱스 (0=일, 1=월, ..., 6=토)
 */
export function getDayIndex(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

/**
 * 요일 이름
 */
export function getDayName(dateStr: string): string {
  return DAY_NAMES[getDayIndex(dateStr)];
}

/**
 * 해당 월의 일수
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 해당 월 1일의 요일 (0=일)
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * 두 날짜 사이의 일수 차이
 */
export function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = parseDate(dateStr1).getTime();
  const d2 = parseDate(dateStr2).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * 같은 주인지 확인 (일요일 시작)
 */
export function isSameWeek(dateStr1: string, dateStr2: string): boolean {
  const d1 = parseDate(dateStr1);
  const d2 = parseDate(dateStr2);
  const startOfWeek = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };
  return startOfWeek(d1).getTime() === startOfWeek(d2).getTime();
}

/**
 * 이번 주 날짜 배열 (일~토)
 */
export function getCurrentWeekDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - dayOfWeek + i);
    dates.push(formatDate(d));
  }
  return dates;
}
