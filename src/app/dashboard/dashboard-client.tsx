"use client";

import { useEffect, useState } from "react";
import { Card, StatusBadge, TableCard } from "@/components/ui";

type StatsData = {
  cards: Array<{ label: string; value: string }>;
  recentOrders: Array<{
    code: string;
    customer: string;
    total: string;
    status: string;
    time: string;
  }>;
  topProducts: Array<{ name: string; quantity: number }>;
};

export function DashboardClient() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      setError("");
      const response = await fetch("/api/stats");
      const payload = (await response.json()) as { data?: StatsData; error?: string };
      if (!response.ok || !payload.data) {
        setError(payload.error ?? "Không thể tải dữ liệu thống kê.");
        return;
      }
      setData(payload.data);
    }

    loadStats().catch(() => {
      setError("Không thể tải dữ liệu thống kê.");
    });
  }, []);

  if (error) {
    return <div className="text-error">{error}</div>;
  }

  if (!data) {
    return <div className="text-secondary-neutral-gray">Đang tải thống kê...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm text-secondary-neutral-gray">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-near-black-ink">
              {card.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TableCard>
          <div className="border-b border-soft-border-gray px-6 py-5">
            <h2 className="text-xl font-semibold">Đơn hàng gần đây</h2>
          </div>
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary-neutral-gray">
              <tr>
                <th className="px-6 py-4 font-medium">Mã đơn</th>
                <th className="px-6 py-4 font-medium">Khách hàng</th>
                <th className="px-6 py-4 font-medium">Tổng tiền</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft-border-gray">
              {data.recentOrders.map((order) => (
                <tr key={order.code}>
                  <td className="px-6 py-5 font-mono text-sm">{order.code}</td>
                  <td className="px-6 py-5 font-medium">{order.customer}</td>
                  <td className="px-6 py-5 font-semibold">{order.total}</td>
                  <td className="px-6 py-5">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-5 text-secondary-neutral-gray">
                    {order.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <Card className="h-fit p-6">
          <h2 className="text-xl font-semibold">Sản phẩm bán chạy</h2>
          <div className="mt-5 space-y-4">
            {data.topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-secondary-neutral-gray">#{index + 1}</p>
                  <p className="truncate font-medium">{product.name}</p>
                </div>
                <p className="ml-4 shrink-0 text-lg font-semibold">
                  {product.quantity}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
