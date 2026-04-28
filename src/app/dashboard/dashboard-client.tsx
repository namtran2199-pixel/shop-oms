"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, StatusBadge, TableCard } from "@/components/ui";

type Period = "day" | "month" | "year";

type StatsData = {
  cards: Array<{ label: string; value: string }>;
  chartFilter: {
    period: Period;
    periodLabel: string;
    periodValue: string;
  };
  charts: {
    revenueSeries: Array<{
      label: string;
      revenue: number;
      revenueLabel: string;
      orders: number;
    }>;
    topProductsSeries: Array<{ name: string; quantity: number }>;
    periodRevenue: string;
    periodOrderCount: number;
  };
  recentOrders: Array<{
    code: string;
    customer: string;
    total: string;
    status: string;
    time: string;
  }>;
  topProducts: Array<{ name: string; quantity: number }>;
};

type VietnamDateParts = {
  year: number;
  month: number;
  day: number;
};

const PERIOD_OPTIONS = [
  { value: "day", label: "Ngày" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
] as const;

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_LABELS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

function getVietnamTodayParts(): VietnamDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDayValue(parts: VietnamDateParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function toMonthValue(parts: Pick<VietnamDateParts, "year" | "month">) {
  return `${parts.year}-${pad(parts.month)}`;
}

function toYearValue(year: number) {
  return String(year);
}

function parseDayValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function parseMonthValue(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function getDefaultPeriodValue(period: Period) {
  const today = getVietnamTodayParts();
  if (period === "day") return toDayValue(today);
  if (period === "month") return toMonthValue(today);
  return toYearValue(today.year);
}

function formatPickerValue(period: Period, value: string) {
  if (!value) return "";

  if (period === "day") {
    const { year, month, day } = parseDayValue(value);
    return `${pad(day)}/${pad(month)}/${year}`;
  }

  if (period === "month") {
    const { year, month } = parseMonthValue(value);
    return `Tháng ${month}/${year}`;
  }

  return value;
}

function formatCalendarCaption(year: number, month: number) {
  return `Tháng ${month}/${year}`;
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const cells: Array<number | null> = Array(firstWeekday).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function shiftMonth(year: number, month: number, delta: number) {
  const shifted = new Date(year, month - 1 + delta, 1);
  return {
    year: shifted.getFullYear(),
    month: shifted.getMonth() + 1,
  };
}

function getYearGrid(centerYear: number) {
  const startYear = centerYear - (centerYear % 12);
  return Array.from({ length: 12 }, (_, index) => startYear + index);
}

function PickerShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function PeriodSelect({
  value,
  onChange,
}: {
  value: Period;
  onChange: (next: Period) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const currentLabel = PERIOD_OPTIONS.find((option) => option.value === value)?.label ?? "Ngày";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="focus-ring inline-flex h-12 min-w-[160px] items-center justify-between rounded-full border border-soft-border-gray bg-white px-5 text-left text-[15px] font-medium text-near-black-ink shadow-sm"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{currentLabel}</span>
        <ChevronDown
          size={18}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[180px] rounded-3xl border border-soft-border-gray bg-white p-2 shadow-[0_16px_40px_rgba(24,28,35,0.12)]">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm transition ${
                option.value === value
                  ? "bg-surface-container-low font-semibold text-near-black-ink"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PeriodValuePicker({
  period,
  value,
  onChange,
}: {
  period: Period;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => getVietnamTodayParts(), []);
  const safeValue = value || getDefaultPeriodValue(period);

  const initialMonth = period === "day" ? parseDayValue(safeValue) : today;
  const initialYear = period === "month" ? parseMonthValue(safeValue).year : Number(safeValue) || today.year;

  const [visibleMonth, setVisibleMonth] = useState({
    year: initialMonth.year,
    month: initialMonth.month,
  });
  const [visibleYear, setVisibleYear] = useState(initialYear);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function syncPanelState() {
    if (period === "day") {
      const next = parseDayValue(safeValue);
      setVisibleMonth({ year: next.year, month: next.month });
      return;
    }

    if (period === "month") {
      setVisibleYear(parseMonthValue(safeValue).year);
      return;
    }

    setVisibleYear(Number(safeValue) || today.year);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="focus-ring inline-flex h-12 min-w-[220px] items-center justify-between rounded-full border border-soft-border-gray bg-white px-5 text-left text-[15px] font-medium text-near-black-ink shadow-sm"
        onClick={() =>
          setOpen((current) => {
            const nextOpen = !current;
            if (nextOpen) {
              syncPanelState();
            }
            return nextOpen;
          })
        }
      >
        <span>{formatPickerValue(period, safeValue)}</span>
        <ChevronDown
          size={18}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-[28px] border border-soft-border-gray bg-white p-4 shadow-[0_16px_40px_rgba(24,28,35,0.12)]">
          {period === "day" ? (
            <DayPickerPanel
              value={safeValue}
              visibleMonth={visibleMonth}
              onNavigate={(delta) => setVisibleMonth((current) => shiftMonth(current.year, current.month, delta))}
              onSelect={(nextValue) => {
                onChange(nextValue);
                setOpen(false);
              }}
            />
          ) : null}
          {period === "month" ? (
            <MonthPickerPanel
              value={safeValue}
              visibleYear={visibleYear}
              onNavigate={(delta) => setVisibleYear((current) => current + delta)}
              onSelect={(nextValue) => {
                onChange(nextValue);
                setOpen(false);
              }}
            />
          ) : null}
          {period === "year" ? (
            <YearPickerPanel
              value={safeValue}
              visibleYear={visibleYear}
              onNavigate={(delta) => setVisibleYear((current) => current + delta * 12)}
              onSelect={(nextValue) => {
                onChange(nextValue);
                setOpen(false);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PickerHeader({
  label,
  onPrevious,
  onNext,
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <button
        type="button"
        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-border-gray bg-surface-container-low text-on-surface-variant"
        onClick={onPrevious}
      >
        <ChevronLeft size={16} />
      </button>
      <p className="text-sm font-semibold text-near-black-ink">{label}</p>
      <button
        type="button"
        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-soft-border-gray bg-surface-container-low text-on-surface-variant"
        onClick={onNext}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function DayPickerPanel({
  value,
  visibleMonth,
  onNavigate,
  onSelect,
}: {
  value: string;
  visibleMonth: { year: number; month: number };
  onNavigate: (delta: number) => void;
  onSelect: (value: string) => void;
}) {
  const selected = parseDayValue(value);
  const cells = getMonthGrid(visibleMonth.year, visibleMonth.month);

  return (
    <div>
      <PickerHeader
        label={formatCalendarCaption(visibleMonth.year, visibleMonth.month)}
        onPrevious={() => onNavigate(-1)}
        onNext={() => onNavigate(1)}
      />
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((weekday) => (
          <div
            key={weekday}
            className="flex h-9 items-center justify-center text-xs font-semibold uppercase tracking-wide text-secondary-neutral-gray"
          >
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-10" />;
          }

          const isSelected =
            selected.year === visibleMonth.year &&
            selected.month === visibleMonth.month &&
            selected.day === day;

          return (
            <button
              key={day}
              type="button"
              className={`focus-ring flex h-10 items-center justify-center rounded-2xl text-sm transition ${
                isSelected
                  ? "bg-action-blue font-semibold text-white"
                  : "text-near-black-ink hover:bg-surface-container-low"
              }`}
              onClick={() =>
                onSelect(
                  toDayValue({
                    year: visibleMonth.year,
                    month: visibleMonth.month,
                    day,
                  }),
                )
              }
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthPickerPanel({
  value,
  visibleYear,
  onNavigate,
  onSelect,
}: {
  value: string;
  visibleYear: number;
  onNavigate: (delta: number) => void;
  onSelect: (value: string) => void;
}) {
  const selected = parseMonthValue(value);

  return (
    <div>
      <PickerHeader
        label={`Năm ${visibleYear}`}
        onPrevious={() => onNavigate(-1)}
        onNext={() => onNavigate(1)}
      />
      <div className="grid grid-cols-3 gap-2">
        {MONTH_LABELS.map((monthLabel, index) => {
          const month = index + 1;
          const isSelected = selected.year === visibleYear && selected.month === month;

          return (
            <button
              key={monthLabel}
              type="button"
              className={`focus-ring flex h-12 items-center justify-center rounded-2xl px-2 text-sm transition ${
                isSelected
                  ? "bg-action-blue font-semibold text-white"
                  : "bg-surface-container-low text-near-black-ink hover:bg-surface-container"
              }`}
              onClick={() => onSelect(toMonthValue({ year: visibleYear, month }))}
            >
              {monthLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearPickerPanel({
  value,
  visibleYear,
  onNavigate,
  onSelect,
}: {
  value: string;
  visibleYear: number;
  onNavigate: (delta: number) => void;
  onSelect: (value: string) => void;
}) {
  const selectedYear = Number(value);
  const years = getYearGrid(visibleYear);

  return (
    <div>
      <PickerHeader
        label={`${years[0]} - ${years[years.length - 1]}`}
        onPrevious={() => onNavigate(-1)}
        onNext={() => onNavigate(1)}
      />
      <div className="grid grid-cols-3 gap-2">
        {years.map((year) => (
          <button
            key={year}
            type="button"
            className={`focus-ring flex h-12 items-center justify-center rounded-2xl px-2 text-sm transition ${
              selectedYear === year
                ? "bg-action-blue font-semibold text-white"
                : "bg-surface-container-low text-near-black-ink hover:bg-surface-container"
            }`}
            onClick={() => onSelect(toYearValue(year))}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DashboardClient() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("month");
  const [periodValue, setPeriodValue] = useState(() => getDefaultPeriodValue("month"));

  useEffect(() => {
    async function loadStats() {
      setError("");
      const params = new URLSearchParams({
        period,
      });
      if (periodValue) params.set("periodValue", periodValue);
      const response = await fetch(`/api/stats?${params.toString()}`);
      const payload = (await response.json()) as { data?: StatsData; error?: string };
      if (!response.ok || !payload.data) {
        setError(payload.error ?? "Không thể tải dữ liệu thống kê.");
        return;
      }
      setData(payload.data);
    }

    loadStats().catch(() => {
      setError("Không thể tải dữ liệu thống kê.");
    });
  }, [period, periodValue]);

  if (error) {
    return <div className="text-error">{error}</div>;
  }

  if (!data) {
    return <div className="text-secondary-neutral-gray">Đang tải thống kê...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm text-secondary-neutral-gray">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-near-black-ink">
              {card.value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-secondary-neutral-gray">Bộ lọc biểu đồ</p>
            <h2 className="mt-2 text-xl font-semibold">Doanh thu theo ngày, tháng, năm</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PickerShell label="Kiểu xem">
              <PeriodSelect
                value={period}
                onChange={(nextPeriod) => {
                  setPeriod(nextPeriod);
                  setPeriodValue(getDefaultPeriodValue(nextPeriod));
                }}
              />
            </PickerShell>
            <PickerShell label="Mốc thời gian">
              <PeriodValuePicker
                period={period}
                value={periodValue}
                onChange={setPeriodValue}
              />
            </PickerShell>
          </div>
        </div>
      </Card>

      <div className="grid gap-6">
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Biểu đồ doanh thu</h2>
              <p className="mt-1 text-sm text-secondary-neutral-gray">
                Kỳ đang xem: {data.chartFilter.periodLabel} • {data.charts.periodRevenue} • {data.charts.periodOrderCount} đơn
              </p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.revenueSeries} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip
                  formatter={(value) => [
                    new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ",
                    "Doanh thu",
                  ]}
                  labelFormatter={(label) => `Mốc: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu"
                  stroke="#1a73e8"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TableCard>
          <div className="border-b border-soft-border-gray px-6 py-5">
            <h2 className="text-xl font-semibold">Đơn hàng gần đây</h2>
          </div>
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary-neutral-gray">
              <tr>
                <th className="px-6 py-4 font-medium">Mã đơn</th>
                <th className="px-6 py-4 font-medium">Khách hàng</th>
                <th className="px-6 py-4 font-medium">Tổng tiền</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft-border-gray">
              {data.recentOrders.map((order) => (
                <tr key={order.code}>
                  <td className="px-6 py-5 font-mono text-sm">{order.code}</td>
                  <td className="px-6 py-5 font-medium">{order.customer}</td>
                  <td className="px-6 py-5 font-semibold">{order.total}</td>
                  <td className="px-6 py-5">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-5 text-secondary-neutral-gray">
                    {order.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <Card className="h-fit p-6">
          <h2 className="text-xl font-semibold">Top sản phẩm trong kỳ</h2>
          <p className="mt-1 text-sm text-secondary-neutral-gray">
            Xếp hạng theo số lượng bán ra trong kỳ đang chọn.
          </p>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.topProductsSeries} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [Number(value ?? 0), "Số lượng"]} />
                <Bar dataKey="quantity" name="Số lượng" fill="#1a73e8" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
