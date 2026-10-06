import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productIds: z.array(z.string().trim().min(1).max(100)).max(100),
});

export type CartSyncProduct = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  isActive: boolean;
};

/**
 * POST /api/cart/sync  { productIds: string[] } → 200 { products: CartSyncProduct[] }
 * Fresh name/price/stock for the cart (products that no longer exist are simply absent).
 */
export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const rows = parsed.data.productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: parsed.data.productIds } },
        select: { id: true, slug: true, name: true, price: true, imageUrl: true, stock: true, isActive: true },
      })
    : [];
  const products: CartSyncProduct[] = rows.map(({ id, ...p }) => ({ productId: id, ...p }));
  return NextResponse.json({ products });
}
