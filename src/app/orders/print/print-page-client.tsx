"use client";

import { useEffect } from "react";
import { PrintableReceipt, waitForPrintableReceiptAssets, type OrderDetail } from "../[id]/order-detail-client";

export function PrintOrdersClient({ orders }: { orders: OrderDetail[] }) {
  useEffect(() => {
    if (orders.length === 0) return;

    const timer = window.setTimeout(() => {
      waitForPrintableReceiptAssets(orders.length).finally(() => {
        window.print();
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [orders]);

  return (
    <div className="print-page-root">
      {orders.length > 1 ? (
        <div className="print-batch">
          {orders.map((order) => (
            <PrintableReceipt key={order.code} order={order} />
          ))}
        </div>
      ) : orders[0] ? (
        <PrintableReceipt order={orders[0]} />
      ) : (
        <div className="p-10 text-center text-secondary-neutral-gray">Không có đơn hợp lệ để in.</div>
      )}
    </div>
  );
}
