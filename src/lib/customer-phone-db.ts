import { Prisma } from "@prisma/client";

export const CUSTOMER_PHONE_NULLABLE_MESSAGE =
  "Cột số điện thoại khách hàng trong database đang còn bắt buộc. Chạy `npm run db:fix:customer-phone-nullable` để đồng bộ schema rồi thử lại.";

export function isCustomerPhoneNullConstraintError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2011") {
    return false;
  }

  const constraint = error.meta?.constraint;
  if (Array.isArray(constraint)) {
    return constraint.includes("phone");
  }

  return constraint === "phone";
}
