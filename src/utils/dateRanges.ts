export type DateRange = { start: string; end: string; label: string };

function startOfDay(d: Date) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

function endOfDay(d: Date) {
  const t = new Date(d);
  t.setHours(23, 59, 59, 999);
  return t;
}

function isoDate(d: Date) {
  // Return YYYY-MM-DD (no time)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeRange(option: string): DateRange | null {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  switch (option) {
    case 'last_month': {
      const d = new Date(year, month - 1, 1);
      const start = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
      const end = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      return { start: isoDate(start), end: isoDate(end), label: 'Last Month' };
    }
    case 'this_month': {
      const start = startOfDay(new Date(year, month, 1));
      const end = endOfDay(new Date(year, month + 1, 0));
      return { start: isoDate(start), end: isoDate(end), label: 'This Month' };
    }
    case 'next_month': {
      const d = new Date(year, month + 1, 1);
      const start = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
      const end = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      return { start: isoDate(start), end: isoDate(end), label: 'Next Month' };
    }
    case 'last_quarter': {
      const q = Math.floor((month) / 3);
      const startQ = q - 1;
      const startMonth = startQ * 3;
      const start = startOfDay(new Date(year, startMonth, 1));
      const end = endOfDay(new Date(year, startMonth + 3, 0));
      return { start: isoDate(start), end: isoDate(end), label: 'Last Quarter' };
    }
    case 'this_quarter': {
      const q = Math.floor((month) / 3);
      const startMonth = q * 3;
      const start = startOfDay(new Date(year, startMonth, 1));
      const end = endOfDay(new Date(year, startMonth + 3, 0));
      return { start: isoDate(start), end: isoDate(end), label: 'This Quarter' };
    }
    case 'next_quarter': {
      const q = Math.floor((month) / 3);
      const startMonth = (q + 1) * 3;
      const start = startOfDay(new Date(year, startMonth, 1));
      const end = endOfDay(new Date(year, startMonth + 3, 0));
      return { start: isoDate(start), end: isoDate(end), label: 'Next Quarter' };
    }
    case 'last_year': {
      const start = startOfDay(new Date(year - 1, 0, 1));
      const end = endOfDay(new Date(year - 1, 11, 31));
      return { start: isoDate(start), end: isoDate(end), label: 'Last Year' };
    }
    case 'this_year': {
      const start = startOfDay(new Date(year, 0, 1));
      const end = endOfDay(new Date(year, 11, 31));
      return { start: isoDate(start), end: isoDate(end), label: 'This Year' };
    }
    case 'next_year': {
      const start = startOfDay(new Date(year + 1, 0, 1));
      const end = endOfDay(new Date(year + 1, 11, 31));
      return { start: isoDate(start), end: isoDate(end), label: 'Next Year' };
    }
    default:
      return null;
  }
}

export const predefinedOptions: { key: string; label: string }[] = [
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_month', label: 'This Month' },
  { key: 'next_month', label: 'Next Month' },
  { key: 'last_quarter', label: 'Last Quarter' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'next_quarter', label: 'Next Quarter' },
  { key: 'last_year', label: 'Last Year' },
  { key: 'this_year', label: 'This Year' },
  { key: 'next_year', label: 'Next Year' },
];
