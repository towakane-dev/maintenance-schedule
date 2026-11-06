import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE = 10;

export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return <div className="pagination"><span>Halaman {page} dari {pages}</span><div><button className="secondary icon-action" disabled={page === 1} aria-label="Halaman sebelumnya" onClick={() => onChange(page - 1)}><ChevronLeft size={15} /></button><button className="secondary icon-action" disabled={page === pages} aria-label="Halaman berikutnya" onClick={() => onChange(page + 1)}><ChevronRight size={15} /></button></div></div>;
}
