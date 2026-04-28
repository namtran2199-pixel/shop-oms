"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, ChevronDown, LoaderCircle, Printer, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, StatusBadge, TableCard } from "@/components/ui";
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

type MergeCandidate = {
  code: string;
  customer: string;
  phone: string;
  total: string;
  totalValue: number;
  status: string;
  time: string;
  itemCount: number;
  itemsSummary: string;
  groupKey: string;
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
    pageSize: 10,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedPrintableOrderIds, setSelectedPrintableOrderIds] = useState<string[]>([]);
  const [printableOrders, setPrintableOrders] = useState<OrderDetail[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState("");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSearchInput, setMergeSearchInput] = useState("");
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeCandidates, setMergeCandidates] = useState<MergeCandidate[]>([]);
  const [selectedMergeCodes, setSelectedMergeCodes] = useState<string[]>([]);
  const [isLoadingMergeCandidates, setIsLoadingMergeCandidates] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");

  const visibleOrderIds = orders.map((order) => order.id);
  const printableOrderIds = orders
    .filter((order) => canPrintOrder(order))
    .map((order) => order.id);
  const selectedPrintableCount = selectedPrintableOrderIds.length;
  const hasSelectedAllVisible =
    visibleOrderIds.length > 0 && visibleOrderIds.every((id) => selectedOrderIds.includes(id));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMergeSearch(mergeSearchInput.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [mergeSearchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "Tất cả") params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", "20");
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

  useEffect(() => {
    if (!showMergeModal) return;
    let active = true;

    async function loadMergeCandidates() {
      setIsLoadingMergeCandidates(true);
      setMergeError("");
      const params = new URLSearchParams();
      if (mergeSearch) params.set("search", mergeSearch);
      const response = await fetch(`/api/orders/merge${params.toString() ? `?${params}` : ""}`);
      const payload = (await response.json()) as { data: MergeCandidate[]; error?: string };

      if (!active) return;
      if (!response.ok) {
        setMergeCandidates([]);
        setMergeError(payload.error ?? "Không thể tải phiếu tạm để gộp.");
        setIsLoadingMergeCandidates(false);
        return;
      }

      setMergeCandidates(payload.data);
      setSelectedMergeCodes((current) =>
        current.filter((code) => payload.data.some((item) => item.code === code)),
      );
      setIsLoadingMergeCandidates(false);
    }

    loadMergeCandidates().catch(() => {
      if (!active) return;
      setMergeCandidates([]);
      setMergeError("Không thể tải phiếu tạm để gộp.");
      setIsLoadingMergeCandidates(false);
    });

    return () => {
      active = false;
    };
  }, [mergeSearch, showMergeModal]);

  async function deleteOrder(code: string) {
    const confirmed = window.confirm(`Xóa đơn hàng ${code}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/orders/${code}`, { method: "DELETE" });
    if (!response.ok) return;

    setOrders((current) => current.filter((order) => order.id !== code));
    setSelectedOrderIds((current) => current.filter((id) => id !== code));
    setSelectedPrintableOrderIds((current) => current.filter((id) => id !== code));
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
    if (selectedPrintableOrderIds.length === 0 || isPrinting) return;
    void loadPrintableOrders(selectedPrintableOrderIds);
  }

  function printSingleOrder(code: string) {
    if (isPrinting) return;
    void loadPrintableOrders([code]);
  }

  function toggleSelectedOrder(code: string) {
    const targetOrder = orders.find((order) => order.id === code);
    const isPrintable = targetOrder ? canPrintOrder(targetOrder) : false;

    setSelectedOrderIds((current) =>
      current.includes(code) ? current.filter((id) => id !== code) : [...current, code],
    );
    setSelectedPrintableOrderIds((current) => {
      if (current.includes(code)) {
        return current.filter((id) => id !== code);
      }

      if (!isPrintable) {
        return current;
      }

      return [...current, code];
    });
  }

  function toggleSelectAllPrintable() {
    setSelectedOrderIds((current) => {
      if (hasSelectedAllVisible) {
        return current.filter((id) => !visibleOrderIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleOrderIds]));
    });
    setSelectedPrintableOrderIds((current) => {
      if (hasSelectedAllVisible) {
        return current.filter((id) => !printableOrderIds.includes(id));
      }

      return Array.from(new Set([...current, ...printableOrderIds]));
    });
  }

  function processSelectedOrders() {
    if (selectedOrderIds.length === 0) return;

    const params = new URLSearchParams({
      batch: selectedOrderIds.join(","),
    });
    router.push(`/orders/${selectedOrderIds[0]}?${params.toString()}`);
  }

  function openMergeModal() {
    setShowMergeModal(true);
    setMergeSearchInput(searchInput.trim());
    setMergeSearch(searchInput.trim());
    setSelectedMergeCodes([]);
    setMergeError("");
  }

  function closeMergeModal() {
    if (isMerging) return;
    setShowMergeModal(false);
    setSelectedMergeCodes([]);
    setMergeError("");
  }

  function toggleMergeOrder(code: string) {
    const target = mergeCandidates.find((item) => item.code === code);
    if (!target) return;

    const selectedGroupKey = selectedMergeCodes[0]
      ? mergeCandidates.find((item) => item.code === selectedMergeCodes[0])?.groupKey
      : null;

    if (selectedGroupKey && selectedGroupKey !== target.groupKey && !selectedMergeCodes.includes(code)) {
      return;
    }

    setSelectedMergeCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  async function mergeSelectedDrafts() {
    if (selectedMergeCodes.length < 2 || isMerging) return;

    setIsMerging(true);
    setMergeError("");
    const response = await fetch("/api/orders/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderCodes: selectedMergeCodes }),
    });
    const payload = (await response.json()) as { data?: { code: string }; error?: string };

    if (!response.ok || !payload.data) {
      setMergeError(payload.error ?? "Không thể gộp phiếu tạm.");
      setIsMerging(false);
      return;
    }

    setShowMergeModal(false);
    setIsMerging(false);
    router.push(`/orders/${payload.data.code}`);
  }

  const selectedMergeItems = mergeCandidates.filter((item) => selectedMergeCodes.includes(item.code));
  const selectedMergeTotal = selectedMergeItems.reduce((sum, item) => sum + item.totalValue, 0);
  const selectedMergeGroupKey = selectedMergeItems[0]?.groupKey ?? null;
  const visibleMergeCandidates = selectedMergeGroupKey
    ? mergeCandidates.filter((item) => item.groupKey === selectedMergeGroupKey)
    : mergeCandidates;

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
        <div className="mb-8 space-y-5">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="secondary"
              className={selectedPrintableCount === 0 || isPrinting ? "opacity-60" : ""}
              onClick={printSelectedOrders}
            >
              {isPrinting ? <LoaderCircle size={17} className="animate-spin" /> : <Printer size={17} />}
              In đã chọn ({selectedPrintableCount})
            </Button>
            <Button
              variant="secondary"
              className={selectedOrderIds.length === 0 ? "opacity-60" : ""}
              onClick={processSelectedOrders}
            >
              Xử lý đặt hàng ({selectedOrderIds.length})
            </Button>
            <Button variant="secondary" onClick={openMergeModal}>
              Gộp phiếu
            </Button>
            <Link href="/orders/new">
              <Button>Tạo đơn</Button>
            </Link>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
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
                    className={`grid min-h-12 w-full place-items-center transition hover:bg-surface-container ${visibleOrderIds.length > 0
                      ? "text-action-blue"
                      : "cursor-not-allowed text-secondary-neutral-gray opacity-50"
                      }`}
                    onClick={toggleSelectAllPrintable}
                    aria-label="Chọn tất cả đơn trên trang"
                    disabled={visibleOrderIds.length === 0}
                  >
                    <span className="grid h-5 w-5 place-items-center rounded border border-mid-border-gray bg-white">
                      {hasSelectedAllVisible ? <CheckSquare size={16} /> : null}
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
                      <button
                        className="grid h-full min-h-[88px] w-full place-items-center text-action-blue transition hover:bg-surface-container"
                        aria-label={`Chọn đơn ${order.id}`}
                        onClick={() => toggleSelectedOrder(order.id)}
                        title="Chọn đơn để xử lý hàng loạt"
                      >
                        <span className="grid h-5 w-5 place-items-center rounded border border-mid-border-gray bg-white">
                          {isSelected ? <CheckSquare size={16} /> : null}
                        </span>
                      </button>
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
      {showMergeModal ? (
        <div className="fixed inset-0 z-50 bg-black/35 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-5xl items-center justify-center">
            <Card className="max-h-[85vh] w-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-soft-border-gray px-6 py-5">
                <div>
                  <h2 className="text-2xl font-semibold">Gộp phiếu tạm</h2>
                  <p className="mt-1 text-sm text-secondary-neutral-gray">
                    Chọn các phiếu tạm cùng khách hoặc cùng số điện thoại trong 7 ngày gần nhất.
                  </p>
                </div>
                <button
                  className="rounded-full p-2 text-secondary-neutral-gray transition hover:bg-surface-container hover:text-near-black-ink"
                  onClick={closeMergeModal}
                  aria-label="Đóng modal gộp phiếu"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="border-b border-soft-border-gray px-6 py-4">
                <div className="relative max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
                    size={18}
                  />
                  <input
                    className="focus-ring h-10 w-full rounded-full border border-soft-border-gray bg-surface-container-lowest pl-10 pr-4 text-sm"
                    placeholder="Tìm theo mã phiếu, tên khách, số điện thoại..."
                    value={mergeSearchInput}
                    onChange={(event) => setMergeSearchInput(event.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-[50vh] overflow-auto">
                {isLoadingMergeCandidates ? (
                  <div className="px-6 py-10 text-sm text-secondary-neutral-gray">
                    Đang tải phiếu tạm đủ điều kiện gộp...
                  </div>
                ) : mergeCandidates.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <p className="font-medium text-on-surface">
                      Không có phiếu tạm nào khác để gộp.
                    </p>
                    <p className="mt-2 text-sm text-secondary-neutral-gray">
                      Hệ thống chỉ hiển thị các phiếu tạm cùng khách hoặc cùng số điện thoại trong 7 ngày gần nhất.
                    </p>
                  </div>
                ) : (
                  <table className="w-full min-w-[920px] text-left">
                    <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary-neutral-gray">
                      <tr>
                        <th className="w-16 px-6 py-4 font-medium">Chọn</th>
                        <th className="px-6 py-4 font-medium">Mã phiếu</th>
                        <th className="px-6 py-4 font-medium">Thời gian</th>
                        <th className="px-6 py-4 font-medium">Khách hàng</th>
                        <th className="px-6 py-4 font-medium">Số điện thoại</th>
                        <th className="px-6 py-4 font-medium">Sản phẩm</th>
                        <th className="px-6 py-4 font-medium">Tạm tính</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft-border-gray">
                      {visibleMergeCandidates.map((order) => {
                        const isSelected = selectedMergeCodes.includes(order.code);

                        return (
                          <tr key={order.code} className="bg-white">
                            <td className="px-6 py-4">
                              <button
                                className="grid h-5 w-5 place-items-center rounded border border-mid-border-gray bg-white text-action-blue"
                                onClick={() => toggleMergeOrder(order.code)}
                                aria-label={`Chọn phiếu ${order.code} để gộp`}
                              >
                                {isSelected ? <CheckSquare size={16} /> : null}
                              </button>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm">{order.code}</td>
                            <td className="px-6 py-4 text-secondary-neutral-gray">{order.time}</td>
                            <td className="px-6 py-4 font-medium">{order.customer}</td>
                            <td className="px-6 py-4 text-secondary-neutral-gray">{order.phone}</td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-secondary-neutral-gray">{order.itemsSummary}</p>
                              <p className="mt-1 text-xs text-on-surface-variant">
                                {order.itemCount} sản phẩm
                              </p>
                            </td>
                            <td className="px-6 py-4 font-semibold">{order.total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="flex flex-col gap-3 border-t border-soft-border-gray px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-secondary-neutral-gray">
                  {selectedMergeCodes.length > 0 ? (
                    <span>
                      Đã chọn {selectedMergeCodes.length} phiếu • Tổng tạm tính {formatCurrency(selectedMergeTotal)}
                    </span>
                  ) : (
                    <span>Chọn ít nhất 2 phiếu cùng khách để gộp.</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={closeMergeModal}>
                    Đóng
                  </Button>
                  <Button
                    className={selectedMergeCodes.length < 2 || isMerging ? "opacity-60" : ""}
                    onClick={mergeSelectedDrafts}
                  >
                    {isMerging ? "Đang gộp..." : "Gộp phiếu"}
                  </Button>
                </div>
              </div>
              {mergeError ? (
                <div className="border-t border-soft-border-gray bg-red-50 px-6 py-3 text-sm text-error">
                  {mergeError}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}

function canPrintOrder(order: OrderRow) {
  return order.status !== "Phiếu tạm" && order.status !== "Đã gộp";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}
