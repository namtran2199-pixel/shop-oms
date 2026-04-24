import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, createAuthToken } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });

  const passwordIsValid =
    user && user.isActive
      ? await verifyPassword(password, user.passwordHash)
      : false;

  if (!user || !user.isActive || !passwordIsValid) {
    return NextResponse.json(
      { error: "Tên đăng nhập hoặc mật khẩu không đúng." },
      { status: 401 },
    );
  }

    const token = await createAuthToken({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    });
    const response = NextResponse.json({ data: { success: true } });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Không thể đăng nhập lúc này. Kiểm tra kết nối cơ sở dữ liệu." },
      { status: 500 },
    );
  }
}
