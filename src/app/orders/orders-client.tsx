"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, ChevronDown, LoaderCircle, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, StatusBadge, TableCard } from "@/components/ui";
import { PrintableReceipt, type OrderDetail } from "./[id]/order-detail-client";

type OrderRow = {
  id: string;
  customer: string;
  phone: string;
  total: string;
  status: string;
  time: string;
  items: string;
};

type OrdersResponse = {
  data: OrderRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export function OrdersClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 5,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [printableOrders, setPrintableOrders] = useState<OrderDetail[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState("");

  const printableOrderIds = orders
    .filter((order) => canPrintOrder(order))
    .map((order) => order.id);
  const selectedPrintableCount = selectedOrderIds.length;
  const hasSelectedAllPrintable =
    printableOrderIds.length > 0 && printableOrderIds.every((id) => selectedOrderIds.includes(id));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "Tất cả") params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", "5");
    return params.toString();
  }, [page, search, status]);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setIsLoading(true);
      const response = await fetch(`/api/orders${query ? `?${query}` : ""}`);
      const payload = (await response.json()) as OrdersResponse;
      if (active) {
        setOrders(payload.data);
        setMeta(payload.meta);
        setIsLoading(false);
      }
    }

    loadOrders().catch(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [query]);

  async function deleteOrder(code: string) {
    const confirmed = window.confirm(`Xóa đơn hàng ${code}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/orders/${code}`, { method: "DELETE" });
    if (!response.ok) return;

    setOrders((current) => current.filter((order) => order.id !== code));
    setSelectedOrderIds((current) => current.filter((id) => id !== code));
    setMeta((current) => ({
      ...current,
      total: Math.max(0, current.total - 1),
    }));
  }

  async function loadPrintableOrders(codes: string[]) {
    setPrintError("");
    setIsPrinting(true);

    try {
      const response = await fetch("/api/orders/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });
      const payload = (await response.json()) as { data?: OrderDetail[]; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải đơn để in.");
      }
      setPrintableOrders(payload.data);
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : "Không thể tải đơn để in.");
      setIsPrinting(false);
    }
  }

  function printSelectedOrders() {
    if (selectedOrderIds.length === 0 || isPrinting) return;
    void loadPrintableOrders(selectedOrderIds);
  }

  function printSingleOrder(code: string) {
    if (isPrinting) return;
    void loadPrintableOrders([code]);
  }

  function toggleSelectedOrder(code: string) {
    setSelectedOrderIds((current) =>
      current.includes(code) ? current.filter((id) => id !== code) : [...current, code],
    );
  }

  function toggleSelectAllPrintable() {
    setSelectedOrderIds((current) => {
      if (hasSelectedAllPrintable) {
        return current.filter((id) => !printableOrderIds.includes(id));
      }

      return Array.from(new Set([...current, ...printableOrderIds]));
    });
  }

  useEffect(() => {
    if (printableOrders.length === 0) return;

    const timer = window.setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 0);

    const handleAfterPrint = () => setPrintableOrders([]);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printableOrders]);

  return (
    <>
      {printableOrders.length > 0 ? (
        <div className="print-batch" aria-hidden="true">
          {printableOrders.map((order) => (
            <PrintableReceipt key={order.code} order={order} />
          ))}
        </div>
      ) : null}
      <div className="screen-only">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
              size={20}
            />
            <input
              className="focus-ring h-10 w-full rounded-full border border-soft-border-gray bg-surface-container-lowest pl-10 pr-4 text-[15px]"
              placeholder="Tìm số điện thoại, tên khách, mã đơn..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              className={selectedPrintableCount === 0 || isPrinting ? "opacity-60" : ""}
              onClick={printSelectedOrders}
            >
              {isPrinting ? <LoaderCircle size={17} className="animate-spin" /> : <Printer size={17} />}
              In đã chọn ({selectedPrintableCount})
            </Button>
            <Link href="/orders/new">
              <Button>Tạo đơn</Button>
            </Link>
            <label className="flex items-center gap-3 text-sm text-on-surface-variant">
              Trạng thái:
              <span className="relative inline-flex">
                <select
                  className="focus-ring h-10 min-w-36 appearance-none rounded-full border border-soft-border-gray bg-white py-0 pl-5 pr-10 text-sm font-medium text-on-surface shadow-[0_2px_8px_rgba(24,28,35,0.04)] transition hover:border-mid-border-gray"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                >
                  <option>Tất cả</option>
                  <option>Phiếu tạm</option>
                  <option>Đã thanh toán</option>
                  <option>Đang xử lý</option>
                  <option>Đang giao</option>
                  <option>Đã hủy</option>
                  <option>Đã gộp</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
                  size={16}
                  strokeWidth={2}
                />
              </span>
            </label>
          </div>
        </div>
        {printError ? (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
            {printError}
          </div>
        ) : null}

        <TableCard
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
          onPageChange={setPage}
        >
        <table className="w-full min-w-[960px] text-left">
          <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary-neutral-gray">
            <tr>
              <th className="w-16 p-0 font-medium">
                <button
                  className="grid min-h-12 w-full place-items-center text-action-blue transition hover:bg-surface-container"
                  onClick={toggleSelectAllPrintable}
                  aria-label="Chọn tất cả đơn có thể in trên trang"
                >
                  <span className="grid h-5 w-5 place-items-center rounded border border-mid-border-gray bg-white">
                    {hasSelectedAllPrintable ? <CheckSquare size={16} /> : null}
                  </span>
                </button>
              </th>
              <th className="px-6 py-4 font-medium">Mã đơn</th>
              <th className="px-6 py-4 font-medium">Khách hàng</th>
              <th className="px-6 py-4 font-medium">Số điện thoại</th>
              <th className="px-6 py-4 font-medium">Tổng tiền</th>
              <th className="px-6 py-4 font-medium">Trạng thái</th>
              <th className="px-6 py-4 font-medium">Thời gian</th>
              <th className="px-6 py-4 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soft-border-gray">
            {isLoading ? (
              <tr>
                <td className="px-6 py-8 text-secondary-neutral-gray" colSpan={8}>
                  Đang tải đơn hàng...
                </td>
              </tr>
            ) : null}
            {orders.map((order) => {
              const canPrint = canPrintOrder(order);
              const isSelected = selectedOrderIds.includes(order.id);

              return (
                <tr key={order.id} className="group bg-white transition hover:bg-surface-container-low">
                  <td className="p-0">
                    {canPrint ? (
                      <button
                        className="grid h-full min-h-[88px] w-full place-items-center text-action-blue transition hover:bg-surface-container"
                        aria-label={`Chọn đơn ${order.id}`}
                        onClick={() => toggleSelectedOrder(order.id)}
                      >
                        <span className="grid h-5 w-5 place-items-center rounded border border-mid-border-gray bg-white">
                          {isSelected ? <CheckSquare size={16} /> : null}
                        </span>
                      </button>
                    ) : null}
                  </td>
                  <td
                    className="cursor-pointer px-6 py-5 font-mono text-sm text-near-black-ink"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    {order.id}
                  </td>
                  <td
                    className="cursor-pointer px-6 py-5"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <p className="font-medium">{order.customer}</p>
                    {order.items ? (
                      <p className="mt-1 max-w-64 truncate text-sm text-secondary-neutral-gray">
                        {order.items}
                      </p>
                    ) : null}
                  </td>
                  <td
                    className="cursor-pointer px-6 py-5 text-secondary-neutral-gray"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    {order.phone}
                  </td>
                  <td
                    className="cursor-pointer px-6 py-5 font-semibold"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    {order.total}
                  </td>
                  <td className="cursor-pointer px-6 py-5" onClick={() => router.push(`/orders/${order.id}`)}>
                    <StatusBadge status={order.status} />
                  </td>
                  <td
                    className="cursor-pointer px-6 py-5 text-secondary-neutral-gray"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    {order.time}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-3 text-secondary-neutral-gray">
                      {canPrint ? (
                        <button
                          className="hover:text-action-blue"
                          onClick={(event) => {
                            event.stopPropagation();
                            printSingleOrder(order.id);
                          }}
                          aria-label={`In đơn ${order.id}`}
                        >
                          <Printer size={18} />
                        </button>
                      ) : null}
                      <button
                        className="hover:text-error"
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteOrder(order.id);
                        }}
                        aria-label={`Xóa đơn ${order.id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </TableCard>
      </div>
    </>
  );
}

function canPrintOrder(order: OrderRow) {
  return order.status !== "Phiếu tạm" && order.status !== "Đã gộp";
}
