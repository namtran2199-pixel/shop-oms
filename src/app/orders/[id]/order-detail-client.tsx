"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Phone, Printer } from "lucide-react";
import { Button, Card, PageHeader, StatusBadge } from "@/components/ui";

type OrderDetail = {
  code: string;
  createdAtIso: string;
  createdAtLabel: string;
  receiptLongDateLabel: string;
  store: { name: string; phone: string };
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
    name: string;
    detail: string;
    sku: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    price: string;
  }>;
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

  useEffect(() => {
    async function loadOrder() {
      const response = await fetch(`/api/orders/${code}`);
      const payload = (await response.json()) as { data: OrderDetail };
      setOrder(payload.data);
    }

    loadOrder();
  }, [code]);

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
        storeName: order.store.name,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerAddress: order.shippingAddress !== "Chưa có địa chỉ" ? order.shippingAddress : null,
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

  const canPrint = order.status !== "Phiếu tạm" && order.status !== "Đã gộp";

  return (
    <>
      <PageHeader
        title={`Đơn hàng #${order.code}`}
        description={`Được tạo lúc ${order.createdAtLabel}`}
        actions={
          canPrint ? (
            <Button variant="secondary" onClick={printOrder}>
              <Printer size={17} />
              In đơn
            </Button>
          ) : null
        }
      />
      <PrintableReceipt order={order} />
      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2">
              <StatusBadge status={order.status} />
            </div>
            {order.status === "Phiếu tạm" ? (
              <p className="text-sm text-secondary-neutral-gray">
                Phiếu này chỉ dùng để gom hàng khách đặt trong nhiều thời điểm. Khi chuẩn bị ship,
                hãy gộp các phiếu tạm cùng khách rồi mới in bill.
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
              <Button variant="secondary">Gộp phiếu</Button>
            </Link>
          ) : null}
        </div>
      </Card>
      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sản phẩm đã đặt</h2>
            <span className="rounded-full bg-surface-container px-3 py-1 text-sm">
              {order.items.length} sản phẩm
            </span>
          </div>
          <div className="space-y-5">
            {order.items.map((item) => (
              <div key={item.sku || item.name} className="flex gap-4 rounded-xl bg-surface-container-low p-4">
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
                  <p className="mt-2 font-semibold">{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Khách hàng</h2>
            <p className="font-semibold">{order.customer.name}</p>
            <Info icon={<Mail size={18} />} label="Thư điện tử" value={order.customer.email ?? "Chưa có email"} />
            <Info icon={<Phone size={18} />} label="Số điện thoại" value={order.customer.phone} />
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Tóm tắt thanh toán</h2>
            <Summary label={`Tạm tính (${order.items.length} sản phẩm)`} value={order.subtotal} />
            {order.extraCharges.map((charge) => (
              <Summary key={charge.name} label={charge.name} value={charge.amountLabel} />
            ))}
            <div className="my-4 border-t border-soft-border-gray" />
            <Summary label="Tổng cộng" value={order.total} strong />
          </Card>
        </div>
      </div>
    </>
  );
}

function PrintableReceipt({ order }: { order: OrderDetail }) {
  return (
    <section className="print-receipt" aria-hidden="true">
      <h1>{order.store.name}</h1>
      <p className="receipt-date">{order.receiptLongDateLabel}</p>

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
            <div className="receipt-row">
              <span>{formatReceiptMoney(item.unitPrice)}</span>
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
      <p className="receipt-qr-label">Quét mã chuyển khoản:</p>
      <div className="receipt-qr-placeholder">{order.code}</div>
    </section>
  );
}

function formatReceiptMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
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

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="mb-3 flex justify-between">
      <span className={strong ? "font-semibold" : "text-secondary-neutral-gray"}>{label}</span>
      <span className={strong ? "text-xl font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
