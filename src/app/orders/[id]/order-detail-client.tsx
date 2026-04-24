"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Printer } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";

type OrderDetail = {
  code: string;
  createdAtLabel: string;
  customer: { name: string; email: string | null; phone: string };
  subtotal: string;
  shippingFee: string;
  tax: string;
  total: string;
  paymentMethod: string;
  shippingMethod: string;
  shippingAddress: string;
  items: Array<{
    name: string;
    detail: string;
    sku: string;
    qty: number;
    price: string;
  }>;
};

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

  if (!order) {
    return <div className="text-secondary-neutral-gray">Đang tải đơn hàng...</div>;
  }

  return (
    <>
      <PageHeader
        title={`Đơn hàng #${order.code}`}
        description={`Được tạo lúc ${order.createdAtLabel}`}
        actions={
          <Button variant="secondary">
            <Printer size={17} />
            In đơn
          </Button>
        }
      />
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
            <div className="my-4 border-t border-soft-border-gray" />
            <Summary label="Tổng cộng" value={order.total} strong />
          </Card>
        </div>
      </div>
    </>
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

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="mb-3 flex justify-between">
      <span className={strong ? "font-semibold" : "text-secondary-neutral-gray"}>{label}</span>
      <span className={strong ? "text-xl font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
