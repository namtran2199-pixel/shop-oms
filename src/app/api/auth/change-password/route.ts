import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  getAuthUserFromRequest,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  if (!body.currentPassword || !body.newPassword || !body.confirmPassword) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ thông tin mật khẩu." },
      { status: 400 },
    );
  }

  if (body.newPassword.length < 6) {
    return NextResponse.json(
      { error: "Mật khẩu mới phải có ít nhất 6 ký tự." },
      { status: 400 },
    );
  }

  if (body.newPassword !== body.confirmPassword) {
    return NextResponse.json(
      { error: "Mật khẩu xác nhận không khớp." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: authUser.sub },
    select: { id: true, passwordHash: true },
  });

  if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
    return NextResponse.json(
      { error: "Mật khẩu hiện tại không đúng." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.newPassword) },
  });

  return NextResponse.json({ data: { success: true } });
}
