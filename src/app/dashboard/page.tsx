import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <PageHeader
        title="Thống kê"
        description="Một số chỉ số cơ bản về đơn hàng, khách hàng và sản phẩm."
      />
      <DashboardClient />
    </AppShell>
  );
}
