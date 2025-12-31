import { format, isToday, isTomorrow, parseISO } from 'date-fns';

/**
 * Check if a date string or Date object represents today
 * @param date - Date string (yyyy-MM-dd) or Date object
 * @returns true if the date is today
 */
export function isTodayDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isToday(dateObj);
}

/**
 * Check if a date string or Date object represents tomorrow
 * @param date - Date string (yyyy-MM-dd) or Date object
 * @returns true if the date is tomorrow
 */
export function isTomorrowDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isTomorrow(dateObj);
}

/**
 * Check if a date string or Date object is in the future (not today or tomorrow)
 * Used for "upcoming" jobs that are beyond tomorrow
 * @param date - Date string (yyyy-MM-dd) or Date object
 * @returns true if the date is in the future and not today or tomorrow
 */
export function isUpcomingDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(dateObj);
  dateOnly.setHours(0, 0, 0, 0);
  
  return dateOnly > today && !isToday(dateObj) && !isTomorrow(dateObj);
}

/**
 * Format a job date consistently across the application
 * Returns "Tomorrow" for tomorrow's date, otherwise formats as "EEE, d MMM" (e.g., "Mon, 5 Feb")
 * @param date - Date string (yyyy-MM-dd) or Date object
 * @returns Formatted date string
 */
export function formatJobDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isTomorrow(dateObj)) {
    return 'Tomorrow';
  }
  
  return format(dateObj, 'EEE, d MMM');
}

