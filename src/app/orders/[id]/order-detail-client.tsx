"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, Phone, Printer, Search, Trash2 } from "lucide-react";
import { Button, Card, PageHeader, StatusBadge } from "@/components/ui";

export type OrderDetail = {
  code: string;
  createdAtIso: string;
  createdAtLabel: string;
  receiptLongDateLabel: string;
  store: { name: string; phone: string; qrCodeImageUrl: string | null };
  customer: { name: string; email: string | null; phone: string; address?: string | null };
  subtotal: string;
  subtotalValue: number;
  shippingFee: string;
  shippingFeeValue: number;
  tax: string;
  taxValue: number;
  total: string;
  totalValue: number;
  extraChargeTotal: number;
  extraCharges: Array<{ name: string; amount: number; amountLabel: string }>;
  paymentMethod: string;
  shippingMethod: string;
  shippingAddress: string;
  status: string;
  statusCode: string;
  sourceCodes: string[];
  mergedIntoCode: string | null;
  items: Array<{
    productId: string;
    name: string;
    detail: string;
    sku: string;
    qty: number;
    originalUnitPrice: number;
    unitPrice: number;
    lineTotal: number;
    price: string;
  }>;
};

type ProductOption = {
  id: string;
  name: string;
  price: string;
  note: string;
};

type EditableOrderItem = {
  productId: string;
  name: string;
  detail: string;
  sku: string;
  qty: number;
  unitPrice: number;
};

declare global {
  interface Window {
    AndroidPrinter?: {
      isAvailable?: () => boolean;
      printReceipt?: (payload: string) => boolean;
    };
  }
}

export function OrderDetailClient({ code }: { code: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [draftItems, setDraftItems] = useState<EditableOrderItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      const response = await fetch(`/api/orders/${code}`);
      const payload = (await response.json()) as { data: OrderDetail };
      setOrder(payload.data);
    }

    loadOrder();
  }, [code]);

  const productKeyword = normalizeSearchText(productSearch);
  const filteredProducts = useMemo(() => {
    if (!productKeyword) return products.slice(0, 5);
    return products.filter((product) => productMatchesSearch(product, productKeyword)).slice(0, 5);
  }, [productKeyword, products]);

  async function ensureProductsLoaded() {
    if (products.length > 0 || isLoadingProducts) return;

    setIsLoadingProducts(true);
    try {
      const response = await fetch("/api/products?pageSize=all");
      const payload = (await response.json()) as { data: ProductOption[] };
      setProducts(payload.data);
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function startEditingDraft() {
    if (!order || order.status !== "Phiếu tạm") return;

    setDraftItems(
      order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        detail: item.detail,
        sku: item.sku,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
    );
    setEditError("");
    setProductSearch("");
    setIsEditingDraft(true);
    await ensureProductsLoaded();
  }

  function cancelEditingDraft() {
    setIsEditingDraft(false);
    setDraftItems([]);
    setEditError("");
    setProductSearch("");
  }

  function addProductToDraft(product: ProductOption) {
    const unitPrice = parseCurrency(product.price);
    setDraftItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          detail: product.note,
          sku: product.id.slice(-8).toUpperCase(),
          qty: 1,
          unitPrice,
        },
      ];
    });
    setProductSearch("");
  }

  function updateDraftQuantity(productId: string, qty: number) {
    const safeQty = Math.max(1, Math.round(qty) || 1);
    setDraftItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, qty: safeQty } : item)),
    );
  }

  function updateDraftUnitPrice(productId: string, unitPrice: number) {
    const safeUnitPrice = Math.max(0, Math.round(unitPrice) || 0);
    setDraftItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, unitPrice: safeUnitPrice } : item,
      ),
    );
  }

  function removeDraftItem(productId: string) {
    setDraftItems((current) => current.filter((item) => item.productId !== productId));
  }

  async function saveDraftChanges() {
    if (!order || draftItems.length === 0 || isSavingDraft) {
      if (draftItems.length === 0) setEditError("Phiếu tạm phải có ít nhất 1 sản phẩm.");
      return;
    }

    setIsSavingDraft(true);
    setEditError("");

    const response = await fetch(`/api/orders/${order.code}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: draftItems.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
          unitPrice: item.unitPrice,
        })),
      }),
    });

    const payload = (await response.json()) as { data?: OrderDetail; error?: string };

    if (!response.ok || !payload.data) {
      setEditError(payload.error ?? "Không thể cập nhật phiếu tạm.");
      setIsSavingDraft(false);
      return;
    }

    setOrder(payload.data);
    setIsEditingDraft(false);
    setDraftItems([]);
    setProductSearch("");
    setIsSavingDraft(false);
  }

  function printOrder() {
    if (!order) return;

    const androidPayload = {
      staffName: "Nhân viên",
      order: {
        id: order.code,
        orderNumber: order.code,
        status: "PAID",
        paymentMethod: order.paymentMethod,
        paymentStatus: "PAID",
        totalAmount: order.totalValue,
        subtotalAmount: order.subtotalValue,
        shippingFee: order.shippingFeeValue,
        shippingMethod: order.shippingMethod,
        storeName: order.store.name,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerAddress: order.shippingAddress !== "Chưa có địa chỉ" ? order.shippingAddress : null,
        qrCodeImageUrl: order.store.qrCodeImageUrl,
        createdAt: order.createdAtIso,
        extraCharges: order.extraCharges.map((charge) => ({
          name: charge.name,
          amount: charge.amount,
        })),
        items: order.items.map((item) => ({
          quantity: item.qty,
          unitPrice: item.unitPrice,
          sugarLevel: "",
          iceLevel: "",
          itemTotal: item.lineTotal,
          productVariant: {
            id: item.sku || item.name,
            size: "",
            product: { name: item.name },
          },
          toppings: [],
        })),
      },
    };

    if (window.AndroidPrinter?.printReceipt) {
      const didDispatch = window.AndroidPrinter.printReceipt(JSON.stringify(androidPayload));
      if (didDispatch) return;
    }

    window.print();
  }

  if (!order) {
    return <div className="text-secondary-neutral-gray">Đang tải đơn hàng...</div>;
  }

  const canPrint = order.status !== "Đã gộp";
  const editingSubtotal = draftItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

  return (
    <>
      <PrintableReceipt order={order} />
      <div className="screen-only">
        <PageHeader
          title={`Đơn hàng #${order.code}`}
          description={`Được tạo lúc ${order.createdAtLabel}`}
          actions={
            <>
              {order.status === "Phiếu tạm" ? (
                isEditingDraft ? (
                  <>
                    <Button variant="secondary" onClick={cancelEditingDraft}>
                      Hủy sửa
                    </Button>
                    <Button onClick={saveDraftChanges}>
                      {isSavingDraft ? "Đang lưu..." : "Lưu phiếu"}
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => void startEditingDraft()}>
                    Sửa phiếu
                  </Button>
                )
              ) : null}
              {canPrint ? (
                <Button variant="secondary" onClick={printOrder}>
                  <Printer size={17} />
                  In đơn
                </Button>
              ) : null}
            </>
          }
        />
        <Card className="mb-6 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2">
                <StatusBadge status={order.status} />
              </div>
              {order.status === "Phiếu tạm" ? (
                <p className="text-sm text-secondary-neutral-gray">
                  Phiếu này chưa phải bill cuối. Khi chuẩn bị ship, hãy chốt phiếu này hoặc gộp
                  cùng các phiếu tạm khác của khách rồi mới in bill.
                </p>
              ) : null}
              {order.mergedIntoCode ? (
                <p className="text-sm text-secondary-neutral-gray">
                  Phiếu này đã được gộp vào{" "}
                  <Link className="font-medium text-action-blue" href={`/orders/${order.mergedIntoCode}`}>
                    {order.mergedIntoCode}
                  </Link>
                  .
                </p>
              ) : null}
              {order.sourceCodes.length > 0 ? (
                <p className="text-sm text-secondary-neutral-gray">
                  Đơn này được tạo do gộp các phiếu: {order.sourceCodes.join(", ")}.
                </p>
              ) : null}
            </div>
            {order.status === "Phiếu tạm" ? (
              <Link href={`/orders/new?phone=${encodeURIComponent(order.customer.phone)}`}>
                <Button variant="secondary">Chốt / gộp phiếu</Button>
              </Link>
            ) : null}
          </div>
        </Card>
        <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {isEditingDraft ? "Chỉnh sửa phiếu tạm" : "Sản phẩm đã đặt"}
              </h2>
              <span className="rounded-full bg-surface-container px-3 py-1 text-sm">
                {isEditingDraft ? draftItems.length : order.items.length} sản phẩm
              </span>
            </div>
            {isEditingDraft ? (
              <div className="space-y-5">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-neutral-gray"
                    size={18}
                  />
                  <input
                    className="focus-ring h-10 w-full rounded-full border border-soft-border-gray bg-surface-container-lowest pl-10 pr-4 text-[15px]"
                    placeholder="Tìm để thêm sản phẩm..."
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                  />
                </div>
                {productSearch.trim() ? (
                  <div className="rounded-2xl border border-soft-border-gray bg-surface-container-low p-3">
                    {isLoadingProducts ? (
                      <p className="text-sm text-secondary-neutral-gray">Đang tải sản phẩm...</p>
                    ) : filteredProducts.length > 0 ? (
                      <div className="space-y-2">
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left hover:bg-surface-container"
                            onClick={() => addProductToDraft(product)}
                          >
                            <span>
                              <span className="block font-medium">{product.name}</span>
                              <span className="text-sm text-secondary-neutral-gray">
                                {product.note || "Không có ghi chú"}
                              </span>
                            </span>
                            <span className="font-semibold">{product.price}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-secondary-neutral-gray">
                        Không tìm thấy sản phẩm phù hợp.
                      </p>
                    )}
                  </div>
                ) : null}
                {editError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
                    {editError}
                  </div>
                ) : null}
                <div className="space-y-4">
                  {draftItems.map((item) => (
                    <div
                      key={item.productId}
                      className="rounded-xl border border-soft-border-gray bg-surface-container-low p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="mt-1 text-sm text-secondary-neutral-gray">{item.detail}</p>
                          <p className="mt-2 font-mono text-xs text-on-surface-variant">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <button
                          className="rounded-full p-2 text-secondary-neutral-gray hover:bg-white hover:text-error"
                          onClick={() => removeDraftItem(item.productId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <label className="block">
                          <span className="mb-2 block text-sm text-secondary-neutral-gray">
                            Số lượng
                          </span>
                          <input
                            className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4"
                            inputMode="numeric"
                            value={String(item.qty)}
                            onChange={(event) =>
                              updateDraftQuantity(item.productId, Number(event.target.value))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm text-secondary-neutral-gray">
                            Đơn giá
                          </span>
                          <input
                            className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4"
                            inputMode="numeric"
                            value={formatCurrencyInput(item.unitPrice)}
                            onChange={(event) =>
                              updateDraftUnitPrice(
                                item.productId,
                                Number(event.target.value.replace(/\D/g, "")),
                              )
                            }
                          />
                        </label>
                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-sm text-secondary-neutral-gray">Thành tiền</p>
                          <p className="mt-1 text-lg font-semibold">
                            {formatDisplayCurrency(item.unitPrice * item.qty)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {draftItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-soft-border-gray px-4 py-8 text-center text-secondary-neutral-gray">
                      Phiếu tạm chưa có sản phẩm. Tìm và thêm sản phẩm để tiếp tục.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {order.items.map((item) => (
                  <div
                    key={item.sku || item.name}
                    className="flex gap-4 rounded-xl bg-surface-container-low p-4"
                  >
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white text-action-blue" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="mt-1 text-sm text-secondary-neutral-gray">{item.detail}</p>
                      <p className="mt-2 font-mono text-xs text-on-surface-variant">
                        SKU: {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-secondary-neutral-gray">SL: {item.qty}</p>
                      {item.unitPrice !== item.originalUnitPrice ? (
                        <p className="mt-2 text-sm text-secondary-neutral-gray line-through">
                          {formatDisplayCurrency(item.originalUnitPrice)}
                        </p>
                      ) : null}
                      <p className="mt-2 font-semibold">{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 font-semibold">Khách hàng</h2>
              <p className="font-semibold">{order.customer.name}</p>
              <Info icon={<Mail size={18} />} label="Thư điện tử" value={order.customer.email ?? "Chưa có email"} />
              <Info icon={<Phone size={18} />} label="Số điện thoại" value={order.customer.phone} />
              <Info icon={<TruckIcon />} label="Loại giao" value={order.shippingMethod} />
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 font-semibold">Tóm tắt thanh toán</h2>
              <Summary
                label={`Tạm tính (${isEditingDraft ? draftItems.length : order.items.length} sản phẩm)`}
                value={isEditingDraft ? formatDisplayCurrency(editingSubtotal) : order.subtotal}
              />
              {order.extraCharges.map((charge) => (
                <Summary key={charge.name} label={charge.name} value={charge.amountLabel} />
              ))}
              <div className="my-4 border-t border-soft-border-gray" />
              <Summary
                label="Tổng cộng"
                value={
                  isEditingDraft
                    ? formatDisplayCurrency(
                        editingSubtotal + order.shippingFeeValue + order.taxValue + order.extraChargeTotal,
                      )
                    : order.total
                }
                strong
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export function PrintableReceipt({ order }: { order: OrderDetail }) {
  return (
    <section className="print-receipt" aria-hidden="true">
      <h1>{order.store.name}</h1>
      <p className="receipt-date">{order.receiptLongDateLabel}</p>

      <div className="receipt-qr">
        <p className="receipt-qr-label">Quét mã chuyển khoản:</p>
        {order.store.qrCodeImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="receipt-qr-image"
            src={order.store.qrCodeImageUrl}
            alt="QR chuyển khoản"
            loading="eager"
          />
        ) : (
          <div className="receipt-qr-placeholder">{order.code}</div>
        )}
      </div>

      <div className="receipt-customer">
        <p>
          <strong>Khách hàng:</strong> {order.customer.name}
        </p>
        <p>
          <strong>Sđt:</strong> {order.customer.phone}
        </p>
        {order.shippingAddress !== "Chưa có địa chỉ" ? (
          <p>
            <strong>Địa chỉ:</strong> {order.shippingAddress}
          </p>
        ) : null}
        {order.shippingMethod !== "Chưa chọn" ? (
          <p>
            <strong>Loại giao:</strong> {order.shippingMethod}
          </p>
        ) : null}
      </div>

      <div className="receipt-line" />
      <div className="receipt-row receipt-head">
        <span>Đơn giá</span>
        <span>Số lượng</span>
        <span>Thành tiền</span>
      </div>
      <div className="receipt-line" />

      <div className="receipt-items">
        {order.items.map((item) => (
          <div className="receipt-item" key={item.sku || item.name}>
            <p className="receipt-item-name">{item.name}</p>
            {item.detail ? <p>{item.detail}</p> : null}
            <div className="receipt-row">
              <span className="inline-flex items-center gap-2">
                {item.unitPrice !== item.originalUnitPrice ? (
                  <span className="line-through opacity-60">
                    {formatReceiptMoney(item.originalUnitPrice)}
                  </span>
                ) : null}
                <span>{formatReceiptMoney(item.unitPrice)}</span>
              </span>
              <span>{item.qty}</span>
              <span>{formatReceiptMoney(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="receipt-dashed" />
      <div className="receipt-summary">
        <p>
          <span>Tiền hàng:</span> <strong>{formatReceiptMoney(order.subtotalValue)}</strong>
        </p>
        {order.shippingFeeValue > 0 ? (
          <p>
            <span>Tiền ship:</span> <strong>{formatReceiptMoney(order.shippingFeeValue)}</strong>
          </p>
        ) : null}
        {order.extraCharges.map((charge) => (
          <p key={charge.name}>
            <span>{charge.name}:</span> <strong>{formatReceiptMoney(charge.amount)}</strong>
          </p>
        ))}
      </div>
      <p className="receipt-total">
        <span>TỔNG:</span>
        <span>{formatReceiptMoney(order.totalValue)}</span>
      </p>
    </section>
  );
}

function formatReceiptMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDisplayCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function formatCurrencyInput(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function parseCurrency(value: string) {
  return Number(value.replace(/\D/g, ""));
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

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="mt-4 flex gap-3 text-sm">
      <span className="text-action-blue">{icon}</span>
      <div>
        <p className="text-secondary-neutral-gray">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7.5A1.5 1.5 0 0 1 4.5 6h9A1.5 1.5 0 0 1 15 7.5V16h1.586a1 1 0 0 0 .707-.293l1.414-1.414A1 1 0 0 0 19 13.586V11.5a1 1 0 0 0-.293-.707l-1.5-1.5A1 1 0 0 0 16.5 9H15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="7.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="mb-3 flex justify-between">
      <span className={strong ? "font-semibold" : "text-secondary-neutral-gray"}>{label}</span>
      <span className={strong ? "text-xl font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
