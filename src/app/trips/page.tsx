import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { TripsClient } from "./trips-client";

export default function TripsPage() {
  return (
    <AppShell active="trips">
      <PageHeader
        title="Chuyến"
        description="Tạo chuyến mới và theo dõi tổng tiền, đơn hàng theo từng chuyến."
      />
      <TripsClient />
    </AppShell>
  );
}
