import { addMonths, format, formatDistanceToNow, isPast } from 'date-fns';

export function addServiceInterval(date: Date, months: number): Date {
  return addMonths(date, months);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy HH:mm');
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isOverdue(date: Date | string): boolean {
  return isPast(new Date(date));
}
