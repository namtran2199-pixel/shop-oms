import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { OrdersClient } from "./orders-client";

export default function OrdersPage() {
  return (
    <AppShell active="orders">
      <PageHeader title="Đơn hàng" description="Quản lý và theo dõi toàn bộ đơn hàng của khách." />
      <OrdersClient />
    </AppShell>
  );
}
