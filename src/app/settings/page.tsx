import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { SettingsClient } from "./settings-client";

export default function SettingsPage() {
  return (
    <AppShell active="settings">
      <PageHeader title="Cài đặt" />
      <SettingsClient />
    </AppShell>
  );
}
