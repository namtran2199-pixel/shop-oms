"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, TrendingUp } from "lucide-react";
import { Button, Card, PaginationFooter, StatusBadge, TableCard } from "@/components/ui";

type CustomerListItem = {
  id: string;
  name: string;
  phone: string;
  recent: string;
  summary: string;
};

type CustomerHistoryItem = {
  code: string;
  date: string;
  product: string;
  option: string;
  total: string;
  status: string;
};

type SelectedCustomer = {
  id: string;
  name: string;
  totalSpend: string;
  orderCount: string;
  history: CustomerHistoryItem[];
};

type CustomersResponse = {
  customers: CustomerListItem[];
  selectedCustomer: SelectedCustomer | null;
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export function CustomersClient() {
  const [data, setData] = useState<CustomersResponse>({
    customers: [],
    selectedCustomer: null,
    meta: {
      total: 0,
      page: 1,
      pageSize: 5,
      totalPages: 1,
    },
  });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
    params.set("page", String(page));
    params.set("pageSize", "5");
    if (selectedId) params.set("selectedId", selectedId);
    return params.toString();
  }, [page, search, selectedId]);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      setIsLoading(true);
      const url = `/api/customers${query ? `?${query}` : ""}`;
      const apiResponse = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      const payload = (await apiResponse.json()) as { data: CustomersResponse };

      if (active) {
        setData(payload.data);
        setIsLoading(false);
      }
    }

    loadCustomers().catch(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [query]);

  const summary =
    data.meta.total === 0
      ? search
        ? `Không tìm thấy khách hàng cho "${search}"`
        : "Chưa có khách hàng"
      : `${data.meta.total} khách hàng`;

  function normalizePhoneInput(value: string) {
    const normalized = value.replace(/[^\d+]/g, "");
    if (normalized.startsWith("+84")) {
      return "0" + normalized.slice(3, 12);
    }
    if (normalized.startsWith("84")) {
      return "0" + normalized.slice(2, 11);
    }
    return normalized.slice(0, 10);
  }

  async function createCustomer() {
    setCreateError("");
    setIsCreating(true);

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress,
      }),
    });

    const payload = (await response.json()) as {
      data?: { id: string; phone: string };
      error?: string;
    };

    if (!response.ok || !payload.data) {
      setCreateError(payload.error ?? "Không thể tạo khách hàng.");
      setIsCreating(false);
      return;
    }

    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setShowCreateForm(false);
    setSearchInput(payload.data.phone);
    setSearch(payload.data.phone);
    setPage(1);
    setSelectedId(payload.data.id);
    setIsCreating(false);
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[380px_minmax(0,1fr)] xl:gap-8">
      <Card className="min-w-0 overflow-hidden">
        <div className="border-b border-soft-border-gray p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
              size={18}
            />
            <input
              className="focus-ring h-10 w-full rounded-full border border-soft-border-gray bg-white pl-10 pr-4 text-sm"
              placeholder="Tìm tên khách hoặc số điện thoại..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-secondary-neutral-gray">{summary}</p>
            <Button
              variant="secondary"
              className="px-4"
              onClick={() => {
                setShowCreateForm((current) => !current);
                setCreateError("");
              }}
            >
              <Plus size={16} />
              Thêm khách
            </Button>
          </div>
        </div>
        <div className="divide-y divide-soft-border-gray">
          {isLoading ? (
            <div className="px-5 py-6 text-sm text-secondary-neutral-gray">
              Đang tải khách hàng...
            </div>
          ) : null}
          {!isLoading && data.customers.length === 0 ? (
            <div className="px-5 py-6 text-sm text-secondary-neutral-gray">
              Không có khách hàng phù hợp.
            </div>
          ) : null}
          {data.customers.map((customer, index) => (
            <button
              key={customer.phone}
              className={`block w-full px-5 py-4 text-left transition hover:bg-surface-container-low ${
                data.selectedCustomer?.id === customer.id || (!data.selectedCustomer && index === 0)
                  ? "bg-surface-container-low"
                  : "bg-white"
              }`}
              onClick={() => setSelectedId(customer.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-semibold">{customer.name}</p>
                <span className="shrink-0 text-xs text-secondary-neutral-gray">
                  {customer.recent}
                </span>
              </div>
              <p className="mt-1 text-sm text-secondary-neutral-gray">
                {customer.phone}
              </p>
              <p className="mt-2 text-xs text-on-surface-variant">
                {customer.summary}
              </p>
            </button>
          ))}
        </div>
        <PaginationFooter
          summary=""
          currentPage={data.meta.page}
          totalPages={data.meta.totalPages}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() =>
            setPage((current) => Math.min(data.meta.totalPages, current + 1))
          }
          onPageChange={setPage}
        />
      </Card>

      <div className="min-w-0 space-y-6">
        {showCreateForm ? (
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Tạo khách hàng mới</h2>
                <p className="mt-1 text-sm text-secondary-neutral-gray">
                  Lưu nhanh khách hàng để dùng cho tạo đơn và tra cứu lịch sử mua hàng.
                </p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <CustomerField
                label="Họ và tên"
                value={customerName}
                onChange={setCustomerName}
                required
                placeholder="Nhập tên khách hàng"
              />
              <CustomerField
                label="Số điện thoại"
                value={customerPhone}
                onChange={(value) => setCustomerPhone(normalizePhoneInput(value))}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                placeholder="0901234567"
              />
              <CustomerField
                label="Email"
                value={customerEmail}
                onChange={setCustomerEmail}
                placeholder="mail@domain.com"
              />
              <CustomerField
                label="Địa chỉ"
                value={customerAddress}
                onChange={setCustomerAddress}
                placeholder="Nhập địa chỉ"
              />
            </div>
            {createError ? (
              <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
                {createError}
              </div>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                className="sm:min-w-32"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError("");
                }}
              >
                Đóng
              </Button>
              <Button className="sm:min-w-40" onClick={createCustomer}>
                {isCreating ? "Đang lưu..." : "Lưu khách hàng"}
              </Button>
            </div>
          </Card>
        ) : null}

        {!showCreateForm ? (
          <>
            <Card className="p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold leading-tight text-near-black-ink sm:text-[32px]">
                    {data.selectedCustomer?.name ?? "Chưa có khách hàng"}
                  </h1>
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                    <Link
                      href="/orders/new"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-action-blue px-4 text-sm text-white shadow-[0_2px_8px_rgba(0,113,227,0.2)] transition hover:opacity-90 active:scale-[0.98]"
                    >
                      <Plus size={16} />
                      Tạo đơn
                    </Link>
                  </div>
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-2 md:max-w-md">
                  <Metric
                    label="Tổng chi tiêu"
                    value={data.selectedCustomer?.totalSpend ?? "0đ"}
                  />
                  <Metric
                    label="Tổng số đơn"
                    value={data.selectedCustomer?.orderCount ?? "0 đơn"}
                  />
                </div>
              </div>
            </Card>

            <TableCard>
              <div className="border-b border-soft-border-gray px-6 py-5">
                <h2 className="text-2xl font-semibold">Lịch sử đơn hàng</h2>
              </div>
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary-neutral-gray">
                  <tr>
                    <th className="px-6 py-4 font-medium">Mã đơn</th>
                    <th className="px-6 py-4 font-medium">Ngày</th>
                    <th className="px-6 py-4 font-medium">Sản phẩm</th>
                    <th className="px-6 py-4 font-medium">Tổng tiền</th>
                    <th className="px-6 py-4 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-border-gray">
                  {(data.selectedCustomer?.history ?? []).map((item) => (
                    <tr key={item.code}>
                      <td className="px-6 py-5 font-mono text-sm">{item.code}</td>
                      <td className="px-6 py-5 text-secondary-neutral-gray">
                        {item.date}
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-medium">{item.product}</p>
                        <p className="text-sm text-secondary-neutral-gray">
                          {item.option}
                        </p>
                      </td>
                      <td className="px-6 py-5 font-semibold">{item.total}</td>
                      <td className="px-6 py-5">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CustomerField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "tel";
  inputMode?: "text" | "numeric";
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-on-surface-variant">
        {label}
        {required ? <span className="ml-1 text-error">*</span> : null}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        pattern={type === "tel" ? "[0-9]*" : undefined}
        className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4 text-[15px]"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-secondary-neutral-gray">
        <TrendingUp size={16} />
        {label}
      </div>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
