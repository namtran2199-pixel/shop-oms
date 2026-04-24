"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui";

export function LoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Không thể đăng nhập.");
        setIsSubmitting(false);
        return;
      }

      router.push("/orders");
      router.refresh();
    } catch {
      setError("Không thể kết nối tới máy chủ đăng nhập.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <section className="apple-card w-full max-w-md px-8 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-surface-container text-action-blue">
            <Lock size={24} />
          </div>
          <h1 className="text-3xl font-semibold text-on-surface">Đăng nhập</h1>
          <p className="mt-2 text-sm text-secondary-neutral-gray">
            Truy cập hệ thống quản lý đơn hàng Shop Retail.
          </p>
        </div>
        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-on-surface-variant">
              Tên đăng nhập
            </span>
            <input
              className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Tên đăng nhập"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-on-surface-variant">
              Mật khẩu
            </span>
            <input
              className="focus-ring h-11 w-full rounded-full border border-soft-border-gray bg-white px-4"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              type="password"
            />
          </label>
          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          ) : null}
          <div className="pt-3">
            <Button
              className="h-11 w-full text-[15px] shadow-[0_8px_18px_rgba(0,113,227,0.22)]"
              onClick={handleLogin}
            >
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
