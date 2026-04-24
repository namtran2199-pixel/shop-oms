import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  return NextResponse.json({
    data: {
      id: authUser.sub,
      username: authUser.username,
      displayName: authUser.displayName,
      role: authUser.role,
    },
  });
}
