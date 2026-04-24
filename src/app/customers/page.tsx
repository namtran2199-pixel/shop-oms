import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { CustomersClient } from "./customers-client";

export default function CustomersPage() {
  return (
    <AppShell active="customers">
      <PageHeader title="Khách hàng" />
      <CustomersClient />
    </AppShell>
  );
}
