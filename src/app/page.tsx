import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const isAuthenticated = await verifyAuthToken(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  );

  redirect(isAuthenticated ? "/orders/new" : "/login");
}
