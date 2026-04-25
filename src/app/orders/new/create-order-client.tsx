"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  LoaderCircle,
  Minus,
  PackagePlus,
  Plus,
  Search,
  ShoppingBasket,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button, Card, StatusBadge } from "@/components/ui";

type ProductOption = {
  id: string;
  name: string;
  price: string;
  note: string;
};

type DraftLine = {
  productId: string;
  name: string;
  note: string;
  quantity: number;
  unitPrice: number;
};

type CustomerSuggestion = {
  id: string;
  name: string;
  phone: string;
  summary: string;
};

type TempOrder = {
  id: string;
  customer: string;
  phone: string;
  total: string;
  status: string;
  time: string;
  items: string;
};

type ExtraCharge = {
  id: string;
  name: string;
  amount: number;
};

function parseCurrency(value: string) {
  return Number(value.replace(/\D/g, ""));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function normalizePhoneInput(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  if (normalized.startsWith("+84")) return `0${normalized.slice(3, 12)}`;
  if (normalized.startsWith("84")) return `0${normalized.slice(2, 11)}`;
  return normalized.slice(0, 10);
}

function isValidVietnamPhone(value: string) {
  return /^0(3|5|7|8|9)\d{8}$/.test(value);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function getInitialSearchText(value: string) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
}

function productMatchesSearch(product: ProductOption, keyword: string) {
  const normalizedName = normalizeSearchText(product.name);
  const normalizedNote = normalizeSearchText(product.note);
  const initials = getInitialSearchText(product.name);

  return (
    normalizedName.includes(keyword) ||
    normalizedNote.includes(keyword) ||
    initials.startsWith(keyword)
  );
}

export function CreateOrderClient({ initialPhone = "" }: { initialPhone?: string }) {
  const router = useRouter();
  const normalizedInitialPhone = normalizePhoneInput(initialPhone);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [phone, setPhone] = useState(normalizedInitialPhone);
  const [customerName, setCustomerName] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(Boolean(normalizedInitialPhone));
  const [productSearch, setProductSearch] = useState("");
  const [draftItems, setDraftItems] = useState<DraftLine[]>([]);
  const [tempOrders, setTempOrders] = useState<TempOrder[]>([]);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [selectedExtraCharges, setSelectedExtraCharges] = useState<string[]>([]);
  const [selectedTempOrders, setSelectedTempOrders] = useState<string[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingTempOrders, setIsLoadingTempOrders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const normalizedPhone = normalizePhoneInput(phone);
  const phoneIsValid = normalizedPhone.length > 0 && isValidVietnamPhone(normalizedPhone);
  const subtotal = draftItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalQuantity = draftItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedExtraChargeTotal = extraCharges
    .filter((charge) => selectedExtraCharges.includes(charge.id))
    .reduce((sum, charge) => sum + charge.amount, 0);
  const keyword = normalizeSearchText(productSearch);
  const filteredProducts = useMemo(() => {
    if (!keyword) return products.slice(0, 3);
    return products.filter((product) => productMatchesSearch(product, keyword)).slice(0, 3);
  }, [keyword, products]);

  useEffect(() => {
    async function loadInitialData() {
      const [productsResponse, settingsResponse] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/settings"),
      ]);
      const productsPayload = (await productsResponse.json()) as { data: ProductOption[] };
      const settingsPayload = (await settingsResponse.json()) as {
        data: { extraCharges?: ExtraCharge[] } | null;
      };
      setProducts(productsPayload.data);
      setExtraCharges(settingsPayload.data?.extraCharges ?? []);
      setIsLoadingProducts(false);
    }

    loadInitialData().catch(() => {
      setSubmitError("Không thể tải dữ liệu tạo phiếu.");
      setIsLoadingProducts(false);
    });
  }, []);

  useEffect(() => {
    const keywordValue = phone.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!showCustomerSuggestions || keywordValue.length < 2) {
        setCustomerSuggestions([]);
        setIsSearchingCustomers(false);
        return;
      }

      try {
        setIsSearchingCustomers(true);
        const response = await fetch(`/api/customers?search=${encodeURIComponent(keywordValue)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          data: { customers: CustomerSuggestion[] };
        };
        setCustomerSuggestions(payload.data.customers.slice(0, 4));
        setIsSearchingCustomers(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setIsSearchingCustomers(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [phone, showCustomerSuggestions]);

  useEffect(() => {
    if (!phoneIsValid) return;
    let active = true;

    async function load() {
      setIsLoadingTempOrders(true);
      const data = await fetchTempOrders(normalizedPhone);
      if (!active) return;
      setTempOrders(data);
      setSelectedTempOrders((current) =>
        current.filter((code) => data.some((order) => order.id === code)),
      );
      setIsLoadingTempOrders(false);
    }

    load().catch(() => {
      if (active) setIsLoadingTempOrders(false);
    });

    return () => {
      active = false;
    };
  }, [normalizedPhone, phoneIsValid]);

  async function fetchTempOrders(phoneValue: string) {
    const params = new URLSearchParams({
      search: phoneValue,
      status: "Phiếu tạm",
      page: "1",
      pageSize: "20",
    });
    const response = await fetch(`/api/orders?${params.toString()}`);
    const payload = (await response.json()) as { data: TempOrder[] };
    return payload.data;
  }

  function selectCustomer(customer: CustomerSuggestion) {
    setCustomerName(customer.name);
    setPhone(normalizePhoneInput(customer.phone));
    setPhoneTouched(true);
    setShowCustomerSuggestions(false);
    setCustomerSuggestions([]);
  }

  function updateDraftItem(product: ProductOption, quantity: number) {
    const safeQuantity = Math.max(0, Math.round(quantity));
    setDraftItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (safeQuantity <= 0) return current.filter((item) => item.productId !== product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: safeQuantity } : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          note: product.note,
          quantity: safeQuantity,
          unitPrice: parseCurrency(product.price),
        },
      ];
    });
  }

  function updateDraftQuantity(productId: string, quantity: number) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    updateDraftItem(product, quantity);
  }

  function resetDraft() {
    setDraftItems([]);
    setProductSearch("");
    setSubmitError("");
  }

  async function saveTempOrder() {
    setSubmitError("");

    if (!customerName.trim()) {
      setSubmitError("Họ và tên khách hàng là bắt buộc.");
      return;
    }

    if (!phoneIsValid) {
      setPhoneTouched(true);
      setSubmitError("Số điện thoại phải đúng định dạng di động Việt Nam.");
      return;
    }

    if (draftItems.length === 0) {
      setSubmitError("Chưa có sản phẩm để lưu phiếu tạm.");
      return;
    }

    setIsSaving(true);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: customerName.trim(),
        phone: normalizedPhone,
        temporary: true,
        items: draftItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setSubmitError(payload.error ?? "Không thể lưu phiếu tạm.");
      setIsSaving(false);
      return;
    }

    resetDraft();
    const nextTempOrders = await fetchTempOrders(normalizedPhone);
    setTempOrders(nextTempOrders);
    setSelectedTempOrders((current) =>
      current.filter((code) => nextTempOrders.some((order) => order.id === code)),
    );
    setIsSaving(false);
  }

  async function mergeSelectedOrders() {
    setSubmitError("");
    if (selectedTempOrders.length < 1) {
      setSubmitError("Chọn ít nhất 1 phiếu tạm để chốt đơn.");
      return;
    }

    setIsMerging(true);
    const response = await fetch("/api/orders/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderCodes: selectedTempOrders,
        extraChargeIds: selectedExtraCharges,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setSubmitError(payload.error ?? "Không thể chốt phiếu tạm.");
      setIsMerging(false);
      return;
    }

    const payload = (await response.json()) as { data: { code: string } };
    router.push(`/orders/${payload.data.code}`);
  }

  const shouldShowNewCustomer =
    showCustomerSuggestions &&
    phoneIsValid &&
    !isSearchingCustomers &&
    customerSuggestions.length === 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-8">
      <div className="space-y-5 md:space-y-6">
        <Card className="p-4 md:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold md:text-xl">Thông tin khách hàng</h2>
            <p className="mt-1 text-sm text-secondary-neutral-gray">
              Gõ tên và số điện thoại để lưu phiếu tạm cho khách.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Số điện thoại"
              value={phone}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              onChange={(value) => {
                const nextPhone = normalizePhoneInput(value);
                setPhone(nextPhone);
                setPhoneTouched(true);
                setShowCustomerSuggestions(true);
                if (!isValidVietnamPhone(nextPhone)) {
                  setTempOrders([]);
                  setSelectedTempOrders([]);
                }
              }}
              required
            />
            <Field label="Họ và tên" value={customerName} onChange={setCustomerName} required />
          </div>

          <div className="mt-4 space-y-2">
            {phoneTouched && phone.length > 0 && !phoneIsValid ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
                Số điện thoại chưa hợp lệ. Chỉ chấp nhận số di động Việt Nam gồm 10 chữ số.
              </div>
            ) : null}
            {isSearchingCustomers ? (
              <div className="inline-flex items-center gap-2 text-sm text-secondary-neutral-gray">
                <LoaderCircle size={16} className="animate-spin" />
                Đang tìm khách hàng...
              </div>
            ) : null}
            {showCustomerSuggestions && customerSuggestions.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {customerSuggestions.map((customer) => (
                  <button
                    key={customer.id}
                    className="rounded-xl bg-surface-container-low px-4 py-3 text-left transition hover:bg-surface-container"
                    onClick={() => selectCustomer(customer)}
                  >
                    <span className="block font-medium">{customer.name}</span>
                    <span className="text-sm text-secondary-neutral-gray">
                      {customer.phone} • {customer.summary}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {shouldShowNewCustomer ? (
              <div className="rounded-xl border border-dashed border-action-blue/30 bg-blue-50 px-4 py-3 text-sm">
                <span className="font-medium text-action-blue">
                  Không tìm thấy khách hàng hiện có.
                </span>
                <span className="mt-1 block text-on-surface-variant">
                  Khi lưu phiếu tạm, hệ thống sẽ tạo khách mới với số {normalizedPhone}.
                </span>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold md:text-xl">Sản phẩm đang đặt</h2>
            <div className="relative mt-4">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
                size={20}
              />
              <input
                className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white pl-10 pr-4"
                placeholder="Tìm sản phẩm để thêm vào phiếu"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
            <div className="mt-3 text-sm text-secondary-neutral-gray">
              {keyword
                ? filteredProducts.length > 0
                  ? `Tìm thấy ${filteredProducts.length} sản phẩm phù hợp`
                  : `Không tìm thấy sản phẩm cho "${productSearch.trim()}"`
                : "Search hỗ trợ không dấu và chữ cái đầu, ví dụ ats cho áo thun size."}
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="inline-flex items-center gap-2 text-sm text-secondary-neutral-gray">
              <LoaderCircle size={16} className="animate-spin" />
              Đang tải sản phẩm...
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="mb-6 grid gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  className="flex w-full items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 text-left transition hover:bg-surface-container"
                  onClick={() => updateDraftItem(product, 1)}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{product.name}</span>
                    <span className="text-sm text-secondary-neutral-gray">{product.note}</span>
                  </span>
                  <span className="ml-4 shrink-0 font-semibold text-action-blue">
                    {product.price}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-dashed border-soft-border-gray bg-surface-container-low px-5 py-8 text-center md:px-6 md:py-10">
              <Search className="mx-auto mb-3 text-secondary-neutral-gray" size={20} />
              <p className="font-medium text-on-surface">Không có sản phẩm phù hợp</p>
            </div>
          )}

          {draftItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-soft-border-gray bg-surface-container-low px-5 py-10 text-center md:px-6 md:py-14">
              <ShoppingBasket className="mx-auto mb-4 text-secondary-neutral-gray" />
              <h3 className="font-semibold text-on-surface">Phiếu tạm chưa có sản phẩm</h3>
              <p className="mt-2 text-sm text-secondary-neutral-gray">
                Chọn sản phẩm phía trên để thêm vào phiếu đang nhập.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-soft-border-gray">
              <div className="flex items-center justify-between bg-surface-container-low px-4 py-3 text-sm font-semibold">
                <span>Phiếu đang nhập</span>
                <button
                  className="rounded-full p-1 text-secondary-neutral-gray transition hover:bg-white hover:text-error"
                  onClick={resetDraft}
                  aria-label="Xóa sản phẩm đang nhập"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="divide-y divide-soft-border-gray">
                {draftItems.map((item) => (
                  <div
                    key={item.productId}
                    className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_120px_120px_36px] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-secondary-neutral-gray">
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <div className="inline-flex h-9 w-fit items-center rounded-full bg-surface-container">
                      <button
                        className="grid h-9 w-9 place-items-center"
                        onClick={() => updateDraftQuantity(item.productId, item.quantity - 1)}
                        aria-label={`Giảm số lượng ${item.name}`}
                      >
                        <Minus size={15} />
                      </button>
                      <input
                        className="h-9 w-11 bg-transparent text-center text-sm font-semibold outline-none"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, "");
                          if (!digits) return;
                          updateDraftQuantity(item.productId, Math.max(1, Number(digits)));
                        }}
                        aria-label={`Số lượng ${item.name}`}
                      />
                      <button
                        className="grid h-9 w-9 place-items-center"
                        onClick={() => updateDraftQuantity(item.productId, item.quantity + 1)}
                        aria-label={`Tăng số lượng ${item.name}`}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-error"
                      onClick={() => updateDraftQuantity(item.productId, 0)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-5 md:space-y-6">
        <Card className="p-4 md:p-6">
          <h2 className="mb-5 text-lg font-semibold md:text-xl">Tóm tắt phiếu đang nhập</h2>
          <div className="space-y-4 text-sm">
            <Row label="Khách hàng" value={customerName || "Chưa nhập"} />
            <Row label="Số điện thoại" value={normalizedPhone || "Chưa nhập"} />
            <Row label="Số sản phẩm" value={`${draftItems.length}`} />
            <Row label="Tổng số lượng" value={`${totalQuantity}`} />
            <Row label="Tổng tiền hàng" value={formatCurrency(subtotal)} strong />
          </div>
          <div className="mt-8">
            <Button onClick={() => void saveTempOrder()} className="w-full">
              {isSaving ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <PackagePlus size={17} />
              )}
              Lưu phiếu tạm
            </Button>
          </div>
          {submitError ? (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
              {submitError}
            </div>
          ) : null}
        </Card>

        <Card className="p-4 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold md:text-xl">Phiếu tạm của khách</h2>
              <p className="mt-1 text-sm text-secondary-neutral-gray">
                Chọn 1 phiếu để chốt đơn, hoặc chọn nhiều phiếu cùng SĐT để gộp khi chuẩn bị ship.
              </p>
            </div>
            <Button
              variant="secondary"
              className="h-9 shrink-0 px-4"
              onClick={() => {
                setPhone("");
                setCustomerName("");
                setPhoneTouched(false);
                setSelectedTempOrders([]);
                setTempOrders([]);
              }}
            >
              <UserPlus size={16} />
              Khách mới
            </Button>
          </div>

          {isLoadingTempOrders ? (
            <div className="inline-flex items-center gap-2 text-sm text-secondary-neutral-gray">
              <LoaderCircle size={16} className="animate-spin" />
              Đang tải phiếu tạm...
            </div>
          ) : tempOrders.length > 0 ? (
            <div className="space-y-3">
              {tempOrders.map((order) => {
                const checked = selectedTempOrders.includes(order.id);
                return (
                  <button
                    key={order.id}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      checked
                        ? "border-action-blue bg-blue-50"
                        : "border-soft-border-gray bg-white hover:bg-surface-container-low"
                    }`}
                    onClick={() =>
                      setSelectedTempOrders((current) =>
                        current.includes(order.id)
                          ? current.filter((code) => code !== order.id)
                          : [...current, order.id],
                      )
                    }
                  >
                    <span className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-mono text-sm">{order.id}</span>
                      <StatusBadge status={order.status} />
                    </span>
                    <span className="block font-semibold">{order.total}</span>
                    <span className="mt-1 block text-sm text-secondary-neutral-gray">
                      {order.time} • {order.items || "Chưa có sản phẩm"}
                    </span>
                  </button>
                );
	              })}
              {extraCharges.length > 0 ? (
                <div className="rounded-xl bg-surface-container-low p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold">Thu khác</p>
                    <span className="text-sm font-semibold text-action-blue">
                      {formatCurrency(selectedExtraChargeTotal)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {extraCharges.map((charge) => {
                      const checked = selectedExtraCharges.includes(charge.id);
                      return (
                        <label
                          key={charge.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <input
                              className="h-4 w-4 accent-[var(--action-blue)]"
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setSelectedExtraCharges((current) =>
                                  event.target.checked
                                    ? [...current, charge.id]
                                    : current.filter((id) => id !== charge.id),
                                )
                              }
                            />
                            <span className="min-w-0 truncate">{charge.name}</span>
                          </span>
                          <span className="shrink-0 font-semibold">
                            {formatCurrency(charge.amount)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <Button
                className="mt-2 w-full"
                onClick={() => void mergeSelectedOrders()}
              >
                {isMerging ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <CheckSquare size={17} />
                )}
                {selectedTempOrders.length <= 1
                  ? "Chốt phiếu tạm"
                  : `Gộp ${selectedTempOrders.length} phiếu tạm`}
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-soft-border-gray bg-surface-container-low px-4 py-6 text-sm text-secondary-neutral-gray md:px-5 md:py-8">
              {phoneIsValid
                ? "Khách này chưa có phiếu tạm nào."
                : "Nhập hoặc chọn khách để xem các phiếu tạm đang mở."}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-semibold" : "text-secondary-neutral-gray"}>
        {label}
      </span>
      <span className={strong ? "text-right text-lg font-semibold" : "text-right font-medium"}>
        {value}
      </span>
    </div>
  );
}
