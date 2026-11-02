export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0';
  }
  return Number(val).toLocaleString();
}

export function formatKsh(val: number | string | null | undefined): string {
  return `KSh ${formatNumber(val)}`;
}

export function formatDate(val: string | number | Date | null | undefined): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-KE');
  } catch {
    return '—';
  }
}
