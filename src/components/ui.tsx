import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-near-black-ink md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-secondary-neutral-gray md:text-[17px] md:leading-7">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  type = "button",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) {
  const styles = {
    primary:
      "bg-action-blue text-pure-white shadow-[0_2px_8px_rgba(0,113,227,0.2)] hover:opacity-90",
    secondary:
      "bg-surface-container text-near-black-ink hover:bg-surface-container-high",
    danger: "bg-error text-pure-white hover:opacity-90",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition active:scale-[0.98] ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`apple-card ${className}`}>{children}</section>;
}

export function TableCard({
  children,
  paginationSummary,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onPageChange,
  className = "",
}: {
  children: ReactNode;
  paginationSummary?: string;
  currentPage?: number;
  totalPages?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onPageChange?: (page: number) => void;
  className?: string;
}) {
  return (
    <Card className={`min-w-0 overflow-hidden ${className}`}>
      <div className="w-full overflow-x-auto overscroll-x-contain">
        {children}
      </div>
      {paginationSummary || (typeof currentPage === "number" && typeof totalPages === "number") ? (
        <PaginationFooter
          summary={paginationSummary ?? ""}
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={onPrevious}
          onNext={onNext}
          onPageChange={onPageChange}
        />
      ) : null}
    </Card>
  );
}

export function Field({
  label,
  placeholder,
  value,
}: {
  label: string;
  placeholder?: string;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-on-surface-variant">
        {label}
      </span>
      <input
        className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-surface-container-lowest px-4 text-[15px] text-near-black-ink placeholder:text-secondary-neutral-gray"
        placeholder={placeholder}
        defaultValue={value}
      />
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Phiếu tạm"
      ? "bg-amber-50 text-warning ring-amber-200"
      : status === "Đã gộp"
        ? "bg-slate-100 text-on-surface-variant ring-slate-200"
        : status === "Đã thanh toán"
      ? "bg-emerald-50 text-success ring-emerald-200"
      : status === "Đang xử lý"
        ? "bg-blue-50 text-action-blue ring-blue-200"
        : status === "Đang giao"
          ? "bg-zinc-100 text-on-surface-variant ring-zinc-200"
          : "bg-red-50 text-error ring-red-200";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tone}`}
    >
      {status}
    </span>
  );
}

export function PaginationFooter({
  summary,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onPageChange,
}: {
  summary: string;
  currentPage?: number;
  totalPages?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onPageChange?: (page: number) => void;
}) {
  const hasPagination = typeof currentPage === "number" && typeof totalPages === "number";
  const footerAlignment = summary
    ? "sm:flex-row sm:items-center sm:justify-between"
    : "sm:flex-row sm:items-center sm:justify-end";

  return (
    <div
      className={`flex flex-col gap-3 border-t border-soft-border-gray px-6 py-4 text-sm text-secondary-neutral-gray ${footerAlignment}`}
    >
      {summary ? <span>{summary}</span> : null}
      {hasPagination ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={onPrevious}
          onNext={onNext}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onPageChange?: (page: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), safeTotalPages);
  const pageItems = buildPaginationItems(safeCurrentPage, safeTotalPages);

  return (
    <div className="w-full overflow-x-auto">
      <nav
        aria-label="Phân trang"
        className="ml-auto flex w-max min-w-full flex-nowrap items-center justify-end gap-2"
      >
        <PaginationButton
          label="Trang trước"
          disabled={safeCurrentPage <= 1 || !onPrevious}
          onClick={onPrevious}
          icon={<ChevronLeft size={16} />}
        />
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center px-2 text-xs text-secondary-neutral-gray"
            >
              ...
            </span>
          ) : (
            <PaginationButton
              key={item}
              label={`Trang ${item}`}
              active={item === safeCurrentPage}
              onClick={onPageChange ? () => onPageChange(item) : undefined}
            >
              {item}
            </PaginationButton>
          ),
        )}
        <PaginationButton
          label="Trang sau"
          disabled={safeCurrentPage >= safeTotalPages || !onNext}
          onClick={onNext}
          icon={<ChevronRight size={16} />}
        />
      </nav>
    </div>
  );
}

function PaginationButton({
  label,
  children,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  children?: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`focus-ring inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition ${
        active
          ? "bg-action-blue text-pure-white shadow-[0_2px_8px_rgba(0,113,227,0.18)]"
          : "bg-surface-container text-near-black-ink hover:bg-surface-container-high"
      } shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon ?? children}
    </button>
  );
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ] as const;
}
