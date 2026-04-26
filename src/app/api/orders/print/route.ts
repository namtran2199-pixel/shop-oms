import { NextResponse } from "next/server";
import { getOrderDetail } from "@/lib/services";

export async function POST(request: Request) {
  const body = (await request.json()) as { codes?: unknown };

  if (!Array.isArray(body.codes)) {
    return NextResponse.json(
      { error: "Danh sách mã đơn không hợp lệ." },
      { status: 400 },
    );
  }

  const codes = Array.from(
    new Set(
      body.codes.filter(
        (code): code is string => typeof code === "string" && code.trim().length > 0,
      ),
    ),
  ).map((code) => code.trim());

  if (codes.length === 0) {
    return NextResponse.json(
      { error: "Chọn ít nhất một đơn để in." },
      { status: 400 },
    );
  }

  const orders = await Promise.all(codes.map((code) => getOrderDetail(code)));
  const missingCodes = codes.filter((_, index) => !orders[index]);

  if (missingCodes.length > 0) {
    return NextResponse.json(
      { error: `Không tìm thấy đơn: ${missingCodes.join(", ")}` },
      { status: 404 },
    );
  }

  const printableOrders = orders.filter((order) => {
    if (!order) return false;
    return order.status !== "Phiếu tạm" && order.status !== "Đã gộp";
  });

  if (printableOrders.length !== orders.length) {
    return NextResponse.json(
      { error: "Chỉ có thể in đơn đã chốt, không in phiếu tạm hoặc đơn đã gộp." },
      { status: 400 },
    );
  }

  return NextResponse.json({ data: printableOrders });
}
