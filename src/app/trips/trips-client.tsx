"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { Button, Card, TableCard } from "@/components/ui";

type TripSummary = {
  id: string;
  name: string;
  totalLabel: string;
  totalValue: number;
  orderCount: number;
  createdAtLabel: string;
};

type TripOrderRow = {
  id: string;
  customer: string;
  phone: string;
  total: string;
  totalValue: number;
  status: string;
  shippingMethod: string;
  time: string;
  items: string;
};

type TripDetail = {
  id: string;
  name: string;
  totalLabel: string;
  totalValue: number;
  orderCount: number;
  createdAtLabel: string;
  orders: TripOrderRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

type CreatedTrip = {
  id: string;
  name: string;
};

type TripsResponse = {
  data: TripSummary[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export function TripsClient() {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripPage, setTripPage] = useState(1);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<TripDetail | null>(null);
  const [tripMeta, setTripMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });
  const [detailPage, setDetailPage] = useState(1);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTrips() {
      setIsLoadingTrips(true);
      const response = await fetch(`/api/trips?page=${tripPage}&pageSize=10`);
      const payload = (await response.json()) as TripsResponse;
      if (!active) return;
      setTrips(payload.data);
      setTripMeta(payload.meta);
      setSelectedTripId((current) => current || payload.data[0]?.id || "");
      setIsLoadingTrips(false);
    }

    loadTrips().catch(() => {
      if (!active) return;
      setError("Không thể tải danh sách chuyến.");
      setIsLoadingTrips(false);
    });

    return () => {
      active = false;
    };
  }, [tripPage]);

  useEffect(() => {
    if (!selectedTripId) {
      return;
    }

    let active = true;

    async function loadTripDetail() {
      setIsLoadingDetail(true);
      const response = await fetch(`/api/trips/${selectedTripId}?page=${detailPage}&pageSize=10`);
      const payload = (await response.json()) as { data?: TripDetail; error?: string };
      if (!active) return;

      if (!response.ok || !payload.data) {
        setError(payload.error ?? "Không thể tải chi tiết chuyến.");
        setSelectedTrip(null);
        setIsLoadingDetail(false);
        return;
      }

      setSelectedTrip(payload.data);
      setIsLoadingDetail(false);
    }

    loadTripDetail().catch(() => {
      if (!active) return;
      setError("Không thể tải chi tiết chuyến.");
      setSelectedTrip(null);
      setIsLoadingDetail(false);
    });

    return () => {
      active = false;
    };
  }, [detailPage, selectedTripId]);

  async function createTrip() {
    if (isCreatingTrip) return;
    setError("");
    setIsCreatingTrip(true);

    const response = await fetch("/api/trips", {
      method: "POST",
    });
    const payload = (await response.json()) as { data?: CreatedTrip; error?: string };

    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Không thể tạo chuyến mới.");
      setIsCreatingTrip(false);
      return;
    }

    const nextTrip = {
      ...payload.data,
      totalLabel: "0đ",
      totalValue: 0,
      orderCount: 0,
      createdAtLabel: "Vừa tạo",
    };
    setTripPage(1);
    setTrips((current) => [nextTrip, ...current.slice(0, 9)]);
    setSelectedTripId(payload.data.id);
    setDetailPage(1);
    setIsCreatingTrip(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <TableCard
        className="p-6"
        currentPage={tripMeta.page}
        totalPages={tripMeta.totalPages}
        onPrevious={() => setTripPage((current) => Math.max(1, current - 1))}
        onNext={() => setTripPage((current) => Math.min(tripMeta.totalPages, current + 1))}
        onPageChange={setTripPage}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Danh sách chuyến</h2>
            <p className="mt-1 text-sm text-secondary-neutral-gray">
              Mỗi lần tạo mới, hệ thống tự sinh tên chuyến theo ngày hiện tại.
            </p>
          </div>
          <Button onClick={createTrip} className="shrink-0" type="button">
            {isCreatingTrip ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Tạo chuyến
          </Button>
        </div>

        {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

        <div className="mt-5 space-y-3">
          {isLoadingTrips ? (
            <div className="flex items-center gap-2 text-sm text-secondary-neutral-gray">
              <LoaderCircle size={16} className="animate-spin" />
              Đang tải chuyến...
            </div>
          ) : null}

          {!isLoadingTrips && trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-soft-border-gray px-4 py-6 text-sm text-secondary-neutral-gray">
              Chưa có chuyến nào. Tạo chuyến đầu tiên để bắt đầu ghi nhận đơn.
            </div>
          ) : null}

          {trips.map((trip) => {
            const isActive = trip.id === selectedTripId;
            return (
              <button
                key={trip.id}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-action-blue bg-blue-50"
                    : "border-soft-border-gray bg-white hover:bg-surface-container-low"
                }`}
                onClick={() => {
                  setSelectedTripId(trip.id);
                  setDetailPage(1);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{trip.name}</p>
                    <p className="mt-1 text-sm text-secondary-neutral-gray">{trip.createdAtLabel}</p>
                  </div>
                  <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                    {trip.orderCount} đơn
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-action-blue">{trip.totalLabel}</p>
              </button>
            );
          })}
        </div>
      </TableCard>

      <Card className="p-6">
        {!selectedTripId && !isLoadingTrips ? (
          <div className="rounded-2xl border border-dashed border-soft-border-gray px-5 py-10 text-center text-secondary-neutral-gray">
            Chọn một chuyến để xem tổng tiền và danh sách đơn.
          </div>
        ) : null}

        {isLoadingDetail ? (
          <div className="flex items-center gap-2 text-sm text-secondary-neutral-gray">
            <LoaderCircle size={16} className="animate-spin" />
            Đang tải chi tiết chuyến...
          </div>
        ) : null}

        {selectedTripId && selectedTrip && !isLoadingDetail ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Tên chuyến" value={selectedTrip.name} />
              <SummaryCard label="Tổng tiền" value={selectedTrip.totalLabel} />
              <SummaryCard label="Số đơn" value={`${selectedTrip.orderCount} đơn`} />
            </div>

            <TableCard
              className="border border-soft-border-gray"
              currentPage={selectedTrip.meta.page}
              totalPages={selectedTrip.meta.totalPages}
              onPrevious={() => setDetailPage((current) => Math.max(1, current - 1))}
              onNext={() =>
                setDetailPage((current) => Math.min(selectedTrip.meta.totalPages, current + 1))
              }
              onPageChange={setDetailPage}
            >
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-secondary-neutral-gray">
                  <tr>
                    <th className="px-6 py-4 font-medium">Mã đơn</th>
                    <th className="px-6 py-4 font-medium">Khách hàng</th>
                    <th className="px-6 py-4 font-medium">Sản phẩm</th>
                    <th className="px-6 py-4 font-medium">Loại giao</th>
                    <th className="px-6 py-4 font-medium">Tổng tiền</th>
                    <th className="px-6 py-4 font-medium">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-border-gray">
                  {selectedTrip.orders.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-secondary-neutral-gray" colSpan={6}>
                        Chuyến này chưa có đơn nào hoàn tất.
                      </td>
                    </tr>
                  ) : null}

                  {selectedTrip.orders.map((order) => (
                    <tr key={order.id} className="bg-white hover:bg-surface-container-low">
                      <td className="px-6 py-5">
                        <Link className="font-medium text-action-blue" href={`/orders/${order.id}`}>
                          {order.id}
                        </Link>
                      </td>
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-medium">{order.customer}</p>
                          <p className="text-sm text-secondary-neutral-gray">{order.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-secondary-neutral-gray">{order.items}</td>
                      <td className="px-6 py-5 text-secondary-neutral-gray">{order.shippingMethod}</td>
                      <td className="px-6 py-5 font-semibold">{order.total}</td>
                      <td className="px-6 py-5 text-secondary-neutral-gray">{order.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low px-4 py-4">
      <p className="text-sm text-secondary-neutral-gray">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
