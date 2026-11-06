export type CsvRow = (string | number | undefined | null)[];

export function toCsv(rows: CsvRow[]): string {
  return rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\ufeff${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
