"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { Button, Card } from "@/components/ui";

const CART_STORAGE_KEY = "oms_active_carts";

type ProductOption = {
  id: string;
  name: string;
  price: string;
  note: string;
};

type CartLine = {
  id: string;
  productId: string;
  name: string;
  note: string;
  quantity: number;
  price: string;
  lineTotal: string;
  unitPrice: number;
};

type CartSession = {
  id: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  totalQuantity: number;
  itemCount: number;
  total: number;
  totalLabel: string;
  updatedAtLabel: string;
  items: CartLine[];
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

function formatCartTime(date = new Date()) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
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

function calculateCartTotals(cartItems: CartLine[]) {
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return {
    itemCount: cartItems.length,
    totalQuantity,
    total,
    totalLabel: formatCurrency(total),
  };
}

function hydrateCart(cart: CartSession): CartSession {
  const items = cart.items.map((item) => ({
    ...item,
    quantity: Math.max(1, Math.round(item.quantity)),
    lineTotal: formatCurrency(item.unitPrice * Math.max(1, Math.round(item.quantity))),
  }));

  return {
    ...cart,
    ...calculateCartTotals(items),
    items,
  };
}

function readStoredCarts() {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!rawValue) return [];
    const parsedValue = JSON.parse(rawValue) as CartSession[];
    if (!Array.isArray(parsedValue)) return [];
    return parsedValue.map(hydrateCart);
  } catch {
    return [];
  }
}

export function CreateOrderClient() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [carts, setCarts] = useState<CartSession[]>([]);
  const [activeCartId, setActiveCartId] = useState("");
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isLoadingCarts, setIsLoadingCarts] = useState(true);
  const [isSavingCart, setIsSavingCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const cartsRef = useRef<CartSession[]>([]);

  const activeCart = carts.find((cart) => cart.id === activeCartId) ?? null;
  const cart = activeCart?.items ?? [];
  const totalQuantity = activeCart?.totalQuantity ?? 0;
  const subtotal = activeCart?.total ?? 0;
  const normalizedPhone = normalizePhoneInput(phone);
  const phoneIsValid = normalizedPhone.length === 0 ? false : isValidVietnamPhone(normalizedPhone);
  const shouldShowNewCustomer =
    showCustomerSuggestions &&
    normalizedPhone.length >= 10 &&
    phoneIsValid &&
    !isSearchingCustomers &&
    customerSuggestions.length === 0;

  useEffect(() => {
    async function loadInitialData() {
      const productsResponse = await fetch("/api/products");
      const productsPayload = (await productsResponse.json()) as { data: ProductOption[] };
      const storedCarts = readStoredCarts();

      setProducts(productsPayload.data);
      cartsRef.current = storedCarts;
      setCarts(storedCarts);
      if (storedCarts[0]) activateCart(storedCarts[0]);
      setIsLoadingCarts(false);
    }

    loadInitialData().catch(() => {
      setSubmitError("Không thể tải dữ liệu tạo đơn.");
      setIsLoadingCarts(false);
    });
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

      try {
        setIsSearchingCustomers(true);
        const response = await fetch(`/api/customers?search=${encodeURIComponent(keyword)}`, {
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

  const filteredProducts = useMemo(() => {
    const keyword = normalizeSearchText(productSearch);
    if (!keyword) return products.slice(0, 3);
    return products.filter((product) => productMatchesSearch(product, keyword)).slice(0, 3);
  }, [productSearch, products]);
  const hasProductSearch = normalizeSearchText(productSearch).length > 0;

  function persistCarts(nextCarts: CartSession[]) {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCarts));
  }

  function activateCart(nextCart: CartSession) {
    setActiveCartId(nextCart.id);
    setPhone(normalizePhoneInput(nextCart.customer.phone));
    setCustomerName(nextCart.customer.name);
    setPhoneTouched(true);
    setShowCustomerSuggestions(false);
    setCustomerSuggestions([]);
  }

  function updateCarts(updater: (current: CartSession[]) => CartSession[]) {
    setCarts((current) => {
      const nextCarts = updater(current);
      cartsRef.current = nextCarts;
      persistCarts(nextCarts);
      return nextCarts;
    });
  }

  function upsertCart(nextCart: CartSession) {
    updateCarts((current) => {
      const exists = current.some((cartItem) => cartItem.id === nextCart.id);
      if (exists) {
        return current.map((cartItem) => (cartItem.id === nextCart.id ? nextCart : cartItem));
      }
      return [nextCart, ...current];
    });
    activateCart(nextCart);
  }

  function removeCartLocally(cartId: string) {
    updateCarts((current) => current.filter((cartItem) => cartItem.id !== cartId));
    if (activeCartId === cartId) resetCustomerForm();
  }

  function applyLocalCartQuantity(cartId: string, productId: string, quantity: number) {
    updateCarts((current) =>
      current.map((cartItem) => {
        if (cartItem.id !== cartId) return cartItem;

        const existingItem = cartItem.items.find((item) => item.productId === productId);
        const product = products.find((item) => item.id === productId);
        let nextItems = cartItem.items;

        if (quantity <= 0) {
          nextItems = cartItem.items.filter((item) => item.productId !== productId);
        } else if (existingItem) {
          nextItems = cartItem.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity,
                  lineTotal: formatCurrency(item.unitPrice * quantity),
                }
              : item,
          );
        } else if (product) {
          const unitPrice = parseCurrency(product.price);
          nextItems = [
            ...cartItem.items,
            {
              id: `item-${product.id}`,
              productId: product.id,
              name: product.name,
              note: product.note,
              quantity,
              price: product.price,
              lineTotal: formatCurrency(unitPrice * quantity),
              unitPrice,
            },
          ];
        }

        return {
          ...cartItem,
          ...calculateCartTotals(nextItems),
          updatedAtLabel: formatCartTime(),
          items: nextItems,
        };
      }),
    );
  }

  function resetCustomerForm() {
    setActiveCartId("");
    setPhone("");
    setCustomerName("");
    setPhoneTouched(false);
    setCustomerSuggestions([]);
    setShowCustomerSuggestions(false);
    setSubmitError("");
  }

  function openCustomerCart(name = customerName, rawPhone = phone, customerId?: string) {
    setSubmitError("");
    const nextPhone = normalizePhoneInput(rawPhone);

    if (!isValidVietnamPhone(nextPhone)) {
      setPhoneTouched(true);
      setSubmitError("Số điện thoại phải đúng định dạng di động Việt Nam.");
      return;
    }

    if (!name.trim()) {
      setSubmitError("Họ và tên là bắt buộc để mở giỏ.");
      return;
    }

    setIsSavingCart(true);
    const cartId = `cart-${nextPhone}`;
    const existingCart = cartsRef.current.find((cartItem) => cartItem.id === cartId);
    const nextCart: CartSession = hydrateCart({
      id: cartId,
      customer: {
        id: customerId ?? existingCart?.customer.id ?? `local-${nextPhone}`,
        name: name.trim(),
        phone: nextPhone,
      },
      itemCount: existingCart?.itemCount ?? 0,
      totalQuantity: existingCart?.totalQuantity ?? 0,
      total: existingCart?.total ?? 0,
      totalLabel: existingCart?.totalLabel ?? "0đ",
      updatedAtLabel: formatCartTime(),
      items: existingCart?.items ?? [],
    });

    upsertCart(nextCart);
    setIsSavingCart(false);
  }

  function updateCartItem(productId: string, quantity?: number, delta?: number) {
    const currentCart = cartsRef.current.find((cartItem) => cartItem.id === activeCartId) ?? activeCart;
    if (!currentCart) {
      setSubmitError("Chọn hoặc tạo khách hàng trước khi thêm sản phẩm.");
      return;
    }

    setSubmitError("");
    const currentQuantity =
      currentCart.items.find((item) => item.productId === productId)?.quantity ?? 0;
    const nextQuantity =
      typeof quantity === "number" ? quantity : currentQuantity + (delta ?? 1);
    const safeQuantity = Math.max(1, Math.round(nextQuantity));

    applyLocalCartQuantity(currentCart.id, productId, safeQuantity);
  }

  function removeCartItem(productId: string) {
    const currentCart = cartsRef.current.find((cartItem) => cartItem.id === activeCartId) ?? activeCart;
    if (!currentCart) return;

    applyLocalCartQuantity(currentCart.id, productId, 0);
  }

  function deleteCart(cartId: string) {
    const confirmed = window.confirm("Xóa giỏ đang treo của khách này?");
    if (!confirmed) return;

    removeCartLocally(cartId);
  }

  async function checkoutCart() {
    setSubmitError("");
    const currentCart = cartsRef.current.find((cartItem) => cartItem.id === activeCartId) ?? activeCart;
    if (!currentCart) {
      setSubmitError("Chọn khách hàng cần thanh toán.");
      return;
    }

    if (currentCart.items.length === 0) {
      setSubmitError("Giỏ hàng chưa có sản phẩm.");
      return;
    }

    setIsCheckingOut(true);
    const response = await fetch("/api/carts/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: currentCart.customer.name,
        phone: currentCart.customer.phone,
        items: currentCart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setSubmitError(payload.error ?? "Không thể thanh toán giỏ hàng.");
      setIsCheckingOut(false);
      return;
    }

    const payload = (await response.json()) as { data: { code: string } };
    removeCartLocally(currentCart.id);
    router.push(`/orders/${payload.data.code}`);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-6">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Giỏ treo</h2>
              <p className="text-xs text-secondary-neutral-gray">
                {carts.length} khách đang phục vụ
              </p>
            </div>
            <Button variant="secondary" onClick={resetCustomerForm} className="h-9 shrink-0 px-4">
              <UserPlus size={17} />
              Khách mới
            </Button>
          </div>

          {isLoadingCarts ? (
            <div className="inline-flex items-center gap-2 text-sm text-secondary-neutral-gray">
              <LoaderCircle size={16} className="animate-spin" />
              Đang tải giỏ hàng...
            </div>
          ) : carts.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {carts.map((cartItem) => {
                const selected = cartItem.id === activeCartId;
                return (
                  <button
                    key={cartItem.id}
                    className={`relative min-w-[176px] rounded-xl border px-3 py-2.5 pr-8 text-left transition ${
                      selected
                        ? "border-action-blue bg-blue-50"
                        : "border-soft-border-gray bg-white hover:bg-surface-container-low"
                    }`}
                    onClick={() => activateCart(cartItem)}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {cartItem.customer.name}
                        </span>
                        <span className="block truncate text-xs text-secondary-neutral-gray">
                          {cartItem.customer.phone}
                        </span>
                      </span>
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold">
                        {cartItem.totalQuantity}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-action-blue">
                      {cartItem.totalLabel}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-secondary-neutral-gray transition hover:bg-white hover:text-error"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteCart(cartItem.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        deleteCart(cartItem.id);
                      }}
                      aria-label={`Xóa giỏ của ${cartItem.customer.name}`}
                    >
                      <X size={14} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-soft-border-gray bg-surface-container-low px-4 py-5 text-sm text-secondary-neutral-gray">
              Chưa có giỏ treo. Nhập số điện thoại và tên khách để mở giỏ đầu tiên.
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-5">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
                size={20}
              />
              <input
                className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white pl-10 pr-4"
                placeholder={
                  activeCart
                    ? `Thêm sản phẩm cho ${activeCart.customer.name}`
                    : "Chọn khách trước, sau đó tìm sản phẩm"
                }
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
                  className="flex w-full items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 text-left transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!activeCart}
                  onClick={() => updateCartItem(product.id, undefined, 1)}
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
                {activeCart ? "Giỏ này chưa có sản phẩm" : "Chưa chọn khách hàng"}
              </h3>
              <p className="mt-2 text-sm text-secondary-neutral-gray">
                {activeCart
                  ? "Bấm vào sản phẩm phía trên để thêm vào giỏ của khách."
                  : "Mở giỏ cho khách trước để bắt đầu thêm sản phẩm."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-soft-border-gray">
              <div className="flex items-center justify-between bg-surface-container-low px-4 py-3 text-sm font-semibold">
                <span>Giỏ hàng của {activeCart?.customer.name}</span>
                {activeCart ? (
                  <button
                    className="rounded-full p-1 text-secondary-neutral-gray transition hover:bg-white hover:text-error"
                    onClick={() => deleteCart(activeCart.id)}
                    aria-label="Xóa giỏ"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              <div className="divide-y divide-soft-border-gray">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_120px_120px_36px] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-secondary-neutral-gray">{item.price}</p>
                    </div>
                    <div className="inline-flex h-9 w-fit items-center rounded-full bg-surface-container">
                      <button
                        className="grid h-9 w-9 place-items-center"
                        onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                        aria-label={`Giảm số lượng ${item.name}`}
                      >
                        <Minus size={15} />
                      </button>
                      <input
                        className="h-9 w-11 bg-transparent text-center text-sm font-semibold outline-none"
                        inputMode="numeric"
                        min={1}
                        value={item.quantity}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, "");
                          if (!digits) return;
                          const nextQuantity = Math.max(1, Number(digits));
                          updateCartItem(item.productId, nextQuantity);
                        }}
                        onBlur={() => {
                          if (item.quantity < 1) updateCartItem(item.productId, 1);
                        }}
                        aria-label={`Số lượng ${item.name}`}
                      />
                      <button
                        className="grid h-9 w-9 place-items-center"
                        onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                        aria-label={`Tăng số lượng ${item.name}`}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <p className="font-semibold">{item.lineTotal}</p>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-error"
                      onClick={() => removeCartItem(item.productId)}
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
          {activeCart ? (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm">
              <span>
                <span className="font-medium text-action-blue">Đang mở giỏ</span>
                <span className="mt-1 block text-on-surface-variant">
                  {activeCart.customer.name} • {activeCart.customer.phone}
                </span>
              </span>
              <button
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-error transition hover:bg-red-50"
                onClick={() => deleteCart(activeCart.id)}
              >
                Xóa giỏ
              </button>
            </div>
          ) : null}
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
                    onClick={() => openCustomerCart(customer.name, customer.phone, customer.id)}
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
                  Có thể mở giỏ mới cho số điện thoại {normalizedPhone}.
                </span>
              </div>
            ) : null}
            <Field label="Họ và tên" value={customerName} onChange={setCustomerName} required />
            <Button
              variant="secondary"
              onClick={() => openCustomerCart()}
              className="w-full"
            >
              {isSavingCart ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <UsersRound size={17} />
              )}
              {activeCart ? "Cập nhật / mở giỏ" : "Mở giỏ cho khách"}
            </Button>
            {submitError ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
                {submitError}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="h-fit p-6">
          <h2 className="mb-6 text-2xl font-semibold">Tóm tắt thanh toán</h2>
          <div className="space-y-4 text-sm">
            <Row label="Khách hàng" value={activeCart?.customer.name ?? "Chưa chọn"} />
            <Row label="Số sản phẩm" value={`${cart.length}`} />
            <Row label="Tổng số lượng" value={`${totalQuantity}`} />
            <Row label="Tổng tiền hàng" value={formatCurrency(subtotal)} />
          </div>
          <div className="my-6 border-t border-soft-border-gray" />
          <Row label="Khách cần trả" value={formatCurrency(subtotal)} strong />
          <div className="mt-8">
            <Button onClick={() => void checkoutCart()} className="w-full">
              {isCheckingOut ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <CreditCard size={17} />
              )}
              Thanh toán
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
