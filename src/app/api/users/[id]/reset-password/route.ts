import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

function generateTemporaryPassword() {
  return `Tmp${Math.random().toString(36).slice(2, 8)}!`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser || authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }

  const { id } = await context.params;
  const temporaryPassword = generateTemporaryPassword();
  const prisma = getPrisma();

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(temporaryPassword) },
  });

  return NextResponse.json({
    data: {
      temporaryPassword,
    },
  });
}
