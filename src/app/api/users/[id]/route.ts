import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser || authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    role?: UserRole;
  };

  if (id === authUser.sub) {
    return NextResponse.json(
      { error: "Không thể tự thay đổi vai trò của chính mình." },
      { status: 400 },
    );
  }

  if (!body.role || !Object.values(UserRole).includes(body.role)) {
    return NextResponse.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
  }

  const prisma = getPrisma();
  const user = await prisma.user.update({
    where: { id },
    data: { role: body.role },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json({ data: user });
}
