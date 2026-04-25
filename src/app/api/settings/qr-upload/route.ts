import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file ảnh QR." }, { status: 400 });
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Chỉ hỗ trợ PNG, JPG hoặc WEBP." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Ảnh QR tối đa 5MB." }, { status: 400 });
  }

  try {
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const pathname = `settings/qr-code-${Date.now()}.${extension}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ data: { url: blob.url, pathname: blob.pathname } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể upload ảnh QR." },
      { status: 500 },
    );
  }
}
