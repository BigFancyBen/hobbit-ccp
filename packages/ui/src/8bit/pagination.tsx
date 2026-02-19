import { cn } from "../lib/utils";

import "../styles/retro.css";

function PixelChevronLeft({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <rect x="6" y="0" width="3" height="3" fill="currentColor" />
      <rect x="3" y="3" width="3" height="3" fill="currentColor" />
      <rect x="0" y="6" width="3" height="3" fill="currentColor" />
      <rect x="3" y="9" width="3" height="3" fill="currentColor" />
      <rect x="6" y="12" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

function PixelChevronRight({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className}>
      <rect x="3" y="0" width="3" height="3" fill="currentColor" />
      <rect x="6" y="3" width="3" height="3" fill="currentColor" />
      <rect x="9" y="6" width="3" height="3" fill="currentColor" />
      <rect x="6" y="9" width="3" height="3" fill="currentColor" />
      <rect x="3" y="12" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex items-center justify-center gap-2 retro", className)}
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="p-2 disabled:opacity-30 hover:bg-accent/50 active:translate-y-0.5 transition-transform touch-manipulation"
      >
        <PixelChevronLeft />
      </button>

      <span className="text-xs text-muted-foreground min-w-[4rem] text-center">
        {page} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="p-2 disabled:opacity-30 hover:bg-accent/50 active:translate-y-0.5 transition-transform touch-manipulation"
      >
        <PixelChevronRight />
      </button>
    </nav>
  );
}

export { Pagination };
