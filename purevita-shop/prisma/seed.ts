import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { categories, products } from "./seed-data";
import { generateOrderNo } from "../src/lib/order-no";
import { calcShipping } from "../src/lib/constants";

const prisma = new PrismaClient();

// Small deterministic PRNG so the seeded history is reproducible
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

async function main() {
  // Clean (children first)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@purevita.test",
      passwordHash: await bcrypt.hash("admin1234", 10),
      name: "ผู้ดูแลระบบ PureVita",
      role: "ADMIN",
    },
  });
  const customer = await prisma.user.create({
    data: {
      email: "customer@purevita.test",
      passwordHash: await bcrypt.hash("customer1234", 10),
      name: "สมใจ ใจดี",
      role: "CUSTOMER",
    },
  });
  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      recipientName: "สมใจ ใจดี",
      phone: "0812345678",
      line: "99/9 ซอยสุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา",
      province: "กรุงเทพมหานคร",
      postalCode: "10110",
      isDefault: true,
    },
  });

  // Categories
  const catBySlug = new Map<string, string>();
  for (const c of categories) {
    const created = await prisma.category.create({ data: { name: c.name, slug: c.slug } });
    catBySlug.set(c.slug, created.id);
  }

  // Products
  const createdProducts = [];
  for (const p of products) {
    createdProducts.push(
      await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          imageUrl: `/products/${p.slug}.svg`,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
          isActive: true,
          categoryId: catBySlug.get(p.categorySlug)!,
        },
      }),
    );
  }

  // Historical orders over the last 14 days (stock values above are already "after" these sales)
  const addressSnapshot = JSON.stringify({
    recipientName: address.recipientName,
    phone: address.phone,
    line: address.line,
    province: address.province,
    postalCode: address.postalCode,
  });
  const statusesOld = ["DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "CANCELLED"] as const;
  const statusesRecent = ["PENDING", "PAID", "PACKING", "SHIPPED"] as const;
  const usedOrderNos = new Set<string>();
  const ORDER_COUNT = 15;

  for (let i = 0; i < ORDER_COUNT; i++) {
    const daysAgo = Math.round((13 * (ORDER_COUNT - 1 - i)) / (ORDER_COUNT - 1)); // 13 .. 0
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(9 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
    if (createdAt > new Date()) createdAt.setTime(Date.now() - 60 * 60 * 1000);

    const lineCount = 1 + Math.floor(rand() * 3);
    const chosen = new Set<(typeof createdProducts)[number]>();
    while (chosen.size < lineCount) chosen.add(pick(createdProducts));
    const items = [...chosen].map((p) => ({
      productId: p.id,
      nameSnapshot: p.name,
      priceSnapshot: p.price,
      qty: 1 + Math.floor(rand() * 2),
    }));
    const subtotal = items.reduce((s, it) => s + it.priceSnapshot * it.qty, 0);
    const shippingFee = calcShipping(subtotal);
    const status =
      i === ORDER_COUNT - 1 ? "PENDING" : i === ORDER_COUNT - 2 ? "PAID" : daysAgo >= 4 ? pick(statusesOld) : pick(statusesRecent);

    let orderNo = generateOrderNo(createdAt);
    while (usedOrderNos.has(orderNo)) orderNo = generateOrderNo(createdAt);
    usedOrderNos.add(orderNo);

    await prisma.order.create({
      data: {
        orderNo,
        userId: customer.id,
        status,
        subtotal,
        shippingFee,
        total: subtotal + shippingFee,
        paymentMethod: rand() < 0.6 ? "TRANSFER" : "COD",
        addressSnapshot,
        createdAt,
        updatedAt: createdAt,
        items: { create: items },
      },
    });
  }

  console.log(
    `Seeded: 2 users (${admin.email}, ${customer.email}), ${categories.length} categories, ${products.length} products, ${ORDER_COUNT} orders`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
