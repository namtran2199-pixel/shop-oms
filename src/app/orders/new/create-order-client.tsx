"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  Minus,
  Plus,
  Printer,
  Save,
  Search,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import { Button, Card } from "@/components/ui";

type ProductOption = {
  id: string;
  name: string;
  price: string;
  note: string;
};

type CartItem = ProductOption & {
  quantity: number;
};

type CustomerSuggestion = {
  id: string;
  name: string;
  phone: string;
  summary: string;
};

function parseCurrency(value: string) {
  return Number(value.replace(/\D/g, ""));
}

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

function isValidVietnamPhone(value: string) {
  return /^0(3|5|7|8|9)\d{8}$/.test(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
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

export function CreateOrderClient() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const response = await fetch("/api/products");
      const payload = (await response.json()) as { data: ProductOption[] };
      setProducts(payload.data);
    }

    loadProducts();
  }, []);

  useEffect(() => {
    const keyword = phone.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!showCustomerSuggestions) return;

      if (keyword.length < 2) {
        setCustomerSuggestions([]);
        setIsSearchingCustomers(false);
        return;
      }

      setIsSearchingCustomers(true);
      const response = await fetch(`/api/customers?search=${encodeURIComponent(keyword)}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        data: { customers: CustomerSuggestion[] };
      };
      setCustomerSuggestions(payload.data.customers.slice(0, 4));
      setIsSearchingCustomers(false);
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [phone, showCustomerSuggestions]);

  const filteredProducts = useMemo(() => {
    const keyword = normalizeSearchText(productSearch);
    if (!keyword) return products.slice(0, 3);
    return products.filter((product) => productMatchesSearch(product, keyword)).slice(0, 3);
  }, [productSearch, products]);
  const hasProductSearch = normalizeSearchText(productSearch).length > 0;

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + parseCurrency(item.price) * item.quantity,
    0,
  );
  const normalizedPhone = normalizePhoneInput(phone);
  const phoneIsValid = normalizedPhone.length === 0 ? false : isValidVietnamPhone(normalizedPhone);
  const shouldShowNewCustomer =
    showCustomerSuggestions &&
    normalizedPhone.length >= 10 &&
    phoneIsValid &&
    !isSearchingCustomers &&
    customerSuggestions.length === 0;

  function addToCart(product: ProductOption) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    if (nextQuantity < 1) return;
    setCart((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, quantity: nextQuantity } : item,
      ),
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  async function createOrder() {
    setSubmitError("");
    if (!isValidVietnamPhone(normalizedPhone)) {
      setPhoneTouched(true);
      setSubmitError("Số điện thoại phải đúng định dạng di động Việt Nam.");
      return;
    }

    if (!customerName.trim()) {
      setSubmitError("Họ và tên là bắt buộc.");
      return;
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        phone: normalizedPhone,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setSubmitError(payload.error ?? "Không thể tạo đơn hàng.");
      return;
    }

    const payload = (await response.json()) as { data: { code: string } };
    router.push(`/orders/${payload.data.code}`);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-5">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
                size={20}
              />
              <input
                className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white pl-10 pr-4"
                placeholder="Tìm sản phẩm để thêm vào giỏ"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </div>
            <div className="mt-3 text-sm text-secondary-neutral-gray">
              {hasProductSearch
                ? filteredProducts.length > 0
                  ? `Tìm thấy ${filteredProducts.length} sản phẩm phù hợp`
                  : `Không tìm thấy sản phẩm cho "${productSearch.trim()}"`
                : "Nhập tên sản phẩm, không dấu hoặc chữ cái đầu để tìm nhanh."}
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="mb-6 grid gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  className="flex w-full items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 text-left transition hover:bg-surface-container"
                  onClick={() => addToCart(product)}
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
            <div className="mb-6 rounded-xl border border-dashed border-soft-border-gray bg-surface-container-low px-6 py-10 text-center">
              <Search className="mx-auto mb-3 text-secondary-neutral-gray" size={20} />
              <p className="font-medium text-on-surface">Không có sản phẩm phù hợp</p>
              <p className="mt-2 text-sm text-secondary-neutral-gray">
                Thử tìm theo tên khác, không dấu hoặc chữ cái đầu.
              </p>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="rounded-xl border border-dashed border-soft-border-gray bg-surface-container-low px-6 py-16 text-center">
              <ShoppingBasket className="mx-auto mb-4 text-secondary-neutral-gray" />
              <h3 className="font-semibold text-on-surface">
                Chưa có sản phẩm nào trong giỏ
              </h3>
              <p className="mt-2 text-sm text-secondary-neutral-gray">
                Bấm vào sản phẩm phía trên để thêm vào đơn hàng.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-soft-border-gray">
              <div className="bg-surface-container-low px-4 py-3 text-sm font-semibold">
                Giỏ hàng
              </div>
              <div className="divide-y divide-soft-border-gray">
                {cart.map((item) => (
                  <div key={item.id} className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_120px_120px_36px] md:items-center">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-secondary-neutral-gray">{item.price}</p>
                    </div>
                    <div className="inline-flex h-9 w-fit items-center rounded-full bg-surface-container">
                      <button
                        className="grid h-9 w-9 place-items-center"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus size={15} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        className="grid h-9 w-9 place-items-center"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(parseCurrency(item.price) * item.quantity)}
                    </p>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-error"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-end text-sm font-medium">
            Tổng số lượng: <span className="ml-1 text-action-blue">{totalQuantity}</span>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-5 text-xl font-semibold">Thông tin khách hàng</h2>
          <div className="grid gap-5">
            <Field
              label="Số điện thoại"
              value={phone}
              onChange={(value) => {
                setPhone(normalizePhoneInput(value));
                setPhoneTouched(true);
                setShowCustomerSuggestions(true);
              }}
              required
            />
            <div className="-mt-3 space-y-2">
              {phoneTouched && phone.length > 0 && !phoneIsValid ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
                  Số điện thoại chưa hợp lệ. Chỉ chấp nhận số di động Việt Nam gồm 10 chữ số.
                </div>
              ) : null}
              {phone.length < 2 ? (
                <div className="text-sm text-secondary-neutral-gray">
                  Nhập ít nhất 2 số để tìm khách hàng hiện có.
                </div>
              ) : null}
              {isSearchingCustomers ? (
                <div className="inline-flex items-center gap-2 text-sm text-secondary-neutral-gray">
                  <LoaderCircle size={16} className="animate-spin" />
                  Đang tìm khách hàng...
                </div>
              ) : null}
            </div>
            {showCustomerSuggestions && customerSuggestions.length > 0 ? (
              <div className="-mt-3 grid gap-2">
                {customerSuggestions.map((customer) => (
                  <button
                    key={customer.id}
                    className="rounded-xl bg-surface-container-low px-4 py-3 text-left transition hover:bg-surface-container"
                    onClick={() => {
                      setPhone(normalizePhoneInput(customer.phone));
                      setCustomerName(customer.name);
                      setCustomerSuggestions([]);
                      setPhoneTouched(true);
                      setShowCustomerSuggestions(false);
                    }}
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
              <div className="-mt-3 rounded-xl border border-dashed border-action-blue/30 bg-blue-50 px-4 py-3 text-sm">
                <span className="font-medium text-action-blue">
                  Không tìm thấy khách hàng hiện có.
                </span>
                <span className="mt-1 block text-on-surface-variant">
                  Đơn hàng này sẽ tạo khách hàng mới với số điện thoại {normalizedPhone}.
                </span>
              </div>
            ) : null}
            <Field label="Họ và tên" value={customerName} onChange={setCustomerName} required />
            {submitError ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
                {submitError}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="h-fit p-6">
          <h2 className="mb-6 text-2xl font-semibold">Tóm tắt đơn hàng</h2>
          <div className="space-y-4 text-sm">
            <Row label="Số sản phẩm" value={`${cart.length}`} />
            <Row label="Tổng số lượng" value={`${totalQuantity}`} />
            <Row label="Tổng tiền hàng" value={formatCurrency(subtotal)} />
            <Row label="Phí giao hàng" value="0đ" />
          </div>
          <div className="my-6 border-t border-soft-border-gray" />
          <Row label="Khách cần trả" value={formatCurrency(subtotal)} strong />
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button variant="secondary">
              <Printer size={17} />
              In tạm tính
            </Button>
            <Button onClick={createOrder}>
              <Save size={17} />
              Lưu đơn
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-on-surface-variant">
        {label}
        {required ? <span className="ml-1 text-error">*</span> : null}
      </span>
      <input
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
