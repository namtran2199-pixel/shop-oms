"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { Button, Card } from "@/components/ui";

type Settings = {
  shopName: string;
  phone: string;
  paperSize: string;
  showBarcode: boolean;
  autoPrint: boolean;
  shippingUnits: string;
};

type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
};

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  isActive: boolean;
};

const roleOptions: Array<{ value: UserRow["role"]; label: string }> = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
];

export function SettingsClient() {
  const [settings, setSettings] = useState<Settings>({
    shopName: "Shop Retail",
    phone: "",
    paperSize: "A5",
    showBarcode: true,
    autoPrint: false,
    shippingUnits: "GHTK,GHN,Viettel Post",
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [roleMessage, setRoleMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const response = await fetch("/api/settings");
      const payload = (await response.json()) as { data: Settings | null };
      if (payload.data) setSettings(payload.data);
    }

    loadSettings();
  }, []);

  useEffect(() => {
    async function loadSecurity() {
      const meResponse = await fetch("/api/auth/me");
      const mePayload = (await meResponse.json()) as { data?: AuthUser };
      if (mePayload.data) {
        setAuthUser(mePayload.data);
      }

      const usersResponse = await fetch("/api/users");
      if (!usersResponse.ok) return;
      const usersPayload = (await usersResponse.json()) as { data: UserRow[] };
      setUsers(usersPayload.data);
    }

    loadSecurity();
  }, []);

  async function saveSettings() {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const payload = (await response.json()) as { data: Settings };
    setSettings(payload.data);
  }

  async function changePassword() {
    setPasswordError("");
    setPasswordMessage("");

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setPasswordError(payload.error ?? "Không thể đổi mật khẩu.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Đổi mật khẩu thành công.");
  }

  async function updateRole(userId: string, role: UserRow["role"]) {
    setRoleMessage("");
    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) return;

    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, role } : user)),
    );
    setRoleMessage("Đã cập nhật vai trò tài khoản.");
  }

  async function resetPassword(userId: string) {
    setResetMessage("");
    const response = await fetch(`/api/users/${userId}/reset-password`, {
      method: "POST",
    });
    const payload = (await response.json()) as {
      data?: { temporaryPassword: string };
      error?: string;
    };

    if (!response.ok || !payload.data) return;

    setResetMessage(
      `Mật khẩu tạm thời mới: ${payload.data.temporaryPassword}`,
    );
  }

  return (
    <div className="space-y-6">
      {/* <Card className="p-6">
          <h2 className="text-xl font-semibold">Thông tin cơ bản</h2>
          <p className="mt-1 text-sm text-secondary-neutral-gray">
            Quản lý tên shop, logo và địa chỉ liên hệ.
          </p>
          <div className="mt-6 flex flex-col gap-6 md:flex-row">
            <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-surface-container text-action-blue">
              <Store size={36} />
            </div>
            <div className="flex-1 space-y-5">
              <p className="text-sm text-secondary-neutral-gray">
                JPG, PNG tối đa 5MB. Khuyến nghị 512x512px.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Tên shop"
                  value={settings.shopName}
                  onChange={(shopName) => setSettings((current) => ({ ...current, shopName }))}
                />
                <Field
                  label="Số điện thoại"
                  value={settings.phone}
                  onChange={(phone) => setSettings((current) => ({ ...current, phone }))}
                />
              </div>
              <Button onClick={saveSettings}>Lưu thay đổi</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold">Tùy chọn in ấn</h2>
          <p className="mt-1 text-sm text-secondary-neutral-gray">
            Chọn A5 cho máy in nhiệt tiêu chuẩn.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["A5", "A4", "K80"].map((paperSize) => (
              <label
                key={paperSize}
                className={`rounded-xl border px-4 py-4 text-sm font-medium ${
                  settings.paperSize === paperSize
                    ? "border-action-blue bg-blue-50 text-action-blue"
                    : "border-soft-border-gray bg-white"
                }`}
              >
                <input
                  className="mr-2 accent-[var(--action-blue)]"
                  type="radio"
                  name="paper"
                  checked={settings.paperSize === paperSize}
                  onChange={() => setSettings((current) => ({ ...current, paperSize }))}
                />
                {paperSize === "K80" ? "Khổ K80 (máy in bill)" : `Khổ ${paperSize}`}
              </label>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <Toggle
              label="Hiển thị mã vạch sản phẩm"
              checked={settings.showBarcode}
              onChange={(showBarcode) => setSettings((current) => ({ ...current, showBarcode }))}
            />
            <Toggle
              label="In tự động khi xác nhận đơn"
              checked={settings.autoPrint}
              onChange={(autoPrint) => setSettings((current) => ({ ...current, autoPrint }))}
            />
          </div>
        </Card> */}

      <Card className="p-6">
        <h2 className="text-xl font-semibold">Bảo mật</h2>
        <p className="mt-1 text-sm text-secondary-neutral-gray">
          Đổi mật khẩu và quản lý quyền truy cập theo vai trò.
        </p>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 rounded-2xl bg-surface-container-low p-5">
            <div>
              <h3 className="font-semibold">Đổi mật khẩu</h3>
              <p className="mt-1 text-sm text-secondary-neutral-gray">
                Tài khoản hiện tại: {authUser?.displayName ?? "Đang tải..."}
              </p>
            </div>
            <Field
              label="Mật khẩu hiện tại"
              value={currentPassword}
              type="password"
              onChange={setCurrentPassword}
            />
            <Field
              label="Mật khẩu mới"
              value={newPassword}
              type="password"
              onChange={setNewPassword}
            />
            <Field
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              type="password"
              onChange={setConfirmPassword}
            />
            {passwordError ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
                {passwordError}
              </div>
            ) : null}
            {passwordMessage ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-success">
                {passwordMessage}
              </div>
            ) : null}
            <Button onClick={changePassword}>Cập nhật mật khẩu</Button>
          </div>

          <div className="space-y-5 rounded-2xl bg-surface-container-low p-5">
            <div>
              <h3 className="font-semibold">Phân quyền tài khoản</h3>
              <p className="mt-1 text-sm text-secondary-neutral-gray">
                Chỉ quản trị viên mới được thay đổi vai trò và reset mật khẩu.
              </p>
            </div>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-soft-border-gray bg-white p-4"
                >
                  <div className="space-y-4">
                    <div className="min-w-0">
                      <p className="text-base font-semibold leading-6">
                        {user.displayName}
                      </p>
                      <p className="mt-1 text-sm text-secondary-neutral-gray">
                        @{user.username}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="grid w-full grid-cols-3 gap-2 md:max-w-[320px]">
                        {roleOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            disabled={user.id === authUser?.id}
                            className={`focus-ring inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm font-medium transition ${user.role === option.value
                                ? "border-action-blue bg-blue-50 text-action-blue"
                                : "border-soft-border-gray bg-white text-on-surface-variant hover:bg-surface-container-low"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            onClick={() => void updateRole(user.id, option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="secondary"
                        className="w-full md:w-auto md:min-w-40"
                        onClick={() => void resetPassword(user.id)}
                      >
                        Reset mật khẩu
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {roleMessage ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-success">
                {roleMessage}
              </div>
            ) : null}
            {resetMessage ? (
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-action-blue">
                {resetMessage}
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-on-surface-variant">
        {label}
      </span>
      <input
        className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4"
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 text-sm font-medium">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[var(--action-blue)]"
      />
    </label>
  );
}
