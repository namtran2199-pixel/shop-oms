import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser || authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }

  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json({ data: users });
}
