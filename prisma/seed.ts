import { OrderStatus, PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { buildOrderCode } from "../src/lib/order-code";

const prisma = new PrismaClient();

const productSeed = [
  ["Áo thun cotton basic size S", 159000, "Áo unisex chất cotton co giãn, màu trắng.", "Package"],
  ["Áo thun cotton basic size M", 159000, "Áo unisex chất cotton co giãn, màu đen.", "Package"],
  ["Áo thun form rộng size L", 189000, "Form oversize, chất vải dày vừa.", "Package"],
  ["Áo sơ mi linen nữ", 329000, "Chất linen thoáng mát, màu kem.", "Package"],
  ["Áo sơ mi nam Oxford", 379000, "Sơ mi công sở, cổ button-down.", "Package"],
  ["Áo khoác cardigan mỏng", 429000, "Cardigan dệt kim nhẹ, phù hợp đi làm.", "Package"],
  ["Áo blazer nữ dáng suông", 799000, "Blazer công sở màu be, lót mỏng.", "Package"],
  ["Quần jeans ống suông nữ", 499000, "Denim xanh nhạt, cạp cao.", "Package"],
  ["Quần tây nam slim fit", 459000, "Vải đứng form, màu đen.", "Package"],
  ["Quần short kaki unisex", 259000, "Kaki mềm, túi sâu, màu be.", "Package"],
  ["Chân váy chữ A", 359000, "Chân váy ngắn cạp cao, màu nâu.", "Package"],
  ["Đầm midi hoa nhí", 629000, "Đầm cổ vuông, chất rayon mềm.", "Package"],
  ["Set đồ ngủ lụa satin", 489000, "Set áo quần dài, chất satin mịn.", "Package"],
  ["Túi tote canvas", 179000, "Túi vải canvas dày, quai dài.", "Package"],
  ["Mũ bucket kaki", 149000, "Mũ bucket chống nắng, màu olive.", "Package"],
  ["Kem chống nắng SPF50 PA++++", 289000, "Kết cấu mỏng nhẹ, không nâng tone quá sáng.", "Package"],
  ["Sữa rửa mặt dịu nhẹ", 219000, "Dành cho da nhạy cảm, pH cân bằng.", "Package"],
  ["Toner cấp ẩm hoa cúc", 249000, "Làm dịu da, cấp ẩm nhẹ.", "Package"],
  ["Serum vitamin C 15%", 389000, "Hỗ trợ sáng da, dùng buổi sáng.", "Package"],
  ["Serum Niacinamide 10%", 329000, "Hỗ trợ kiểm dầu và đều màu da.", "Package"],
  ["Kem dưỡng ẩm phục hồi", 349000, "Có ceramide, phù hợp da khô.", "Package"],
  ["Mặt nạ đất sét trà xanh", 259000, "Hỗ trợ làm sạch dầu thừa.", "Package"],
  ["Son tint bóng màu cam đào", 199000, "Lớp bóng nhẹ, màu tự nhiên.", "Package"],
  ["Son kem lì màu đỏ đất", 239000, "Lâu trôi, chất son mịn.", "Package"],
  ["Phấn nước cushion tone 21", 459000, "Finish căng bóng tự nhiên.", "Package"],
  ["Phấn phủ kiềm dầu", 299000, "Hạt phấn mịn, giảm bóng dầu.", "Package"],
  ["Kẻ mày dạng chì nâu xám", 159000, "Đầu chì mảnh, dễ tán.", "Package"],
  ["Mascara chống lem", 229000, "Làm dài mi, chống trôi tốt.", "Package"],
  ["Nước tẩy trang micellar", 269000, "Làm sạch nhẹ, không cay mắt.", "Package"],
  ["Dầu gội thảo mộc phục hồi", 319000, "Hương thảo mộc nhẹ, giảm khô xơ.", "Package"],
] as const;

const customerSeed = [
  ["Nguyễn Minh Anh", "090 100 0001", "anh.nguyen@example.com", "12 Lý Tự Trọng, Quận 1, TP. Hồ Chí Minh"],
  ["Trần Gia Hân", "090 100 0002", "han.tran@example.com", "45 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh"],
  ["Lê Hoàng Nam", "090 100 0003", "nam.le@example.com", "88 Pasteur, Quận 3, TP. Hồ Chí Minh"],
  ["Phạm Thu Thảo", "090 100 0004", "thao.pham@example.com", "20 Phan Xích Long, Phú Nhuận"],
  ["Võ Khánh Linh", "090 100 0005", "linh.vo@example.com", "14 Lê Văn Sỹ, Quận 3"],
  ["Đặng Quốc Bảo", "090 100 0006", "bao.dang@example.com", "102 Cách Mạng Tháng 8, Quận 10"],
  ["Bùi Ngọc Mai", "090 100 0007", "mai.bui@example.com", "33 Nguyễn Đình Chiểu, Quận 1"],
  ["Hoàng Tuấn Kiệt", "090 100 0008", "kiet.hoang@example.com", "9 Trần Hưng Đạo, Quận 1"],
  ["Đỗ Hà My", "090 100 0009", "my.do@example.com", "61 Võ Văn Tần, Quận 3"],
  ["Ngô Thanh Tùng", "090 100 0010", "tung.ngo@example.com", "7 Điện Biên Phủ, Bình Thạnh"],
  ["Huỳnh Bảo Ngọc", "090 100 0011", "ngoc.huynh@example.com", "19 Nguyễn Văn Cừ, Quận 5"],
  ["Vũ Hải Yến", "090 100 0012", "yen.vu@example.com", "28 Hai Bà Trưng, Quận 1"],
  ["Phan Anh Khoa", "090 100 0013", "khoa.phan@example.com", "76 Bạch Đằng, Tân Bình"],
  ["Trương Minh Châu", "090 100 0014", "chau.truong@example.com", "52 Cộng Hòa, Tân Bình"],
  ["Lâm Hồng Nhung", "090 100 0015", "nhung.lam@example.com", "17 Nguyễn Thị Minh Khai, Quận 1"],
  ["Tạ Đức Huy", "090 100 0016", "huy.ta@example.com", "40 Hoàng Văn Thụ, Phú Nhuận"],
  ["Cao Phương Nhi", "090 100 0017", "nhi.cao@example.com", "5 Võ Thị Sáu, Quận 3"],
  ["Mai Nhật Minh", "090 100 0018", "minh.mai@example.com", "92 Lạc Long Quân, Quận 11"],
  ["Hồ Kim Chi", "090 100 0019", "chi.ho@example.com", "15 Nguyễn Hữu Cảnh, Bình Thạnh"],
  ["Dương Gia Phúc", "090 100 0020", "phuc.duong@example.com", "30 Nguyễn Oanh, Gò Vấp"],
  ["Nguyễn Hà Vy", "090 100 0021", "vy.nguyen@example.com", "21 Trường Sa, Quận 3"],
  ["Trần Đức Long", "090 100 0022", "long.tran@example.com", "3 Hoàng Sa, Bình Thạnh"],
  ["Lê Mỹ Duyên", "090 100 0023", "duyen.le@example.com", "47 Nguyễn Kiệm, Gò Vấp"],
  ["Phạm Hữu Nghĩa", "090 100 0024", "nghia.pham@example.com", "10 Lê Quang Định, Bình Thạnh"],
  ["Võ Uyên Nhi", "090 100 0025", "nhi.vo@example.com", "66 Nguyễn Thái Học, Quận 1"],
  ["Bùi Gia Bảo", "090 100 0026", "baobui@example.com", "18 Trần Não, TP. Thủ Đức"],
  ["Hoàng Minh Thư", "090 100 0027", "thu.hoang@example.com", "101 Xa Lộ Hà Nội, TP. Thủ Đức"],
  ["Đỗ Anh Thư", "090 100 0028", "anhthu.do@example.com", "73 Phạm Văn Đồng, Gò Vấp"],
  ["Ngô Quỳnh Như", "090 100 0029", "nhu.ngo@example.com", "25 Lê Đức Thọ, Gò Vấp"],
  ["Huỳnh Nhật Quang", "090 100 0030", "quang.huynh@example.com", "8 Nguyễn Cơ Thạch, TP. Thủ Đức"],
] as const;

const statuses = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.CANCELLED,
];

async function main() {
  await prisma.user.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.storeSetting.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        username: "admin",
        displayName: "Quản trị viên",
        passwordHash: await hashPassword("123456"),
        role: UserRole.ADMIN,
        isActive: true,
      },
      {
        username: "manager",
        displayName: "Quản lý cửa hàng",
        passwordHash: await hashPassword("123456"),
        role: UserRole.MANAGER,
        isActive: true,
      },
      {
        username: "staff",
        displayName: "Nhân viên bán hàng",
        passwordHash: await hashPassword("123456"),
        role: UserRole.STAFF,
        isActive: true,
      },
    ],
  });

  const products = [];
  for (const [name, defaultPrice, note, icon] of productSeed) {
    products.push(
      await prisma.product.create({
        data: { name, defaultPrice, note, icon },
      }),
    );
  }

  const customers = [];
  for (const [name, phone, email, address] of customerSeed) {
    customers.push(
      await prisma.customer.create({
        data: { name, phone, email, address },
      }),
    );
  }

  for (let index = 0; index < 24; index += 1) {
    const customer = customers[index % customers.length];
    const firstProduct = products[index % products.length];
    const secondProduct = products[(index + 7) % products.length];
    const firstQty = (index % 3) + 1;
    const secondQty = index % 2 === 0 ? 1 : 2;
    const orderItems = [
      { product: firstProduct, quantity: firstQty },
      { product: secondProduct, quantity: secondQty },
    ];
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.product.defaultPrice * item.quantity,
      0,
    );
    const shippingFee = subtotal > 700000 ? 0 : 25000;
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + shippingFee + tax;
    const createdAt = new Date(2026, 3, 24, 14, 45 + index, 0, 0);

    await prisma.order.create({
      data: {
        code: buildOrderCode(createdAt, index + 1),
        customerId: customer.id,
        status: statuses[index % statuses.length],
        subtotal,
        shippingFee,
        tax,
        total,
        paymentMethod: index % 2 === 0 ? "Chuyển khoản" : "Tiền mặt",
        shippingMethod: index % 3 === 0 ? "Giao nhanh trong ngày" : "Giao tiêu chuẩn",
        shippingAddress: customer.address,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: orderItems.map(({ product, quantity }) => ({
            productId: product.id,
            name: product.name,
            detail: product.note,
            sku: product.id.slice(-8).toUpperCase(),
            quantity,
            unitPrice: product.defaultPrice,
          })),
        },
      },
    });
  }

  await prisma.storeSetting.create({
    data: {
      shopName: "Lumi Fashion & Beauty",
      phone: "090 100 0000",
      paperSize: "A5",
      showBarcode: true,
      autoPrint: false,
      shippingUnits: "GHTK,GHN,Viettel Post,Ahamove",
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
