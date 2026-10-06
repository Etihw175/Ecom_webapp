import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/components/cart/cart-context";
import { SessionProvider } from "@/components/providers/session-provider";
import { getCurrentUser, getSession } from "@/lib/auth";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PureVita · เพียววิต้า — วิตามิน อาหารเสริม เครื่องกรองน้ำ",
    template: "%s | PureVita",
  },
  description: "ร้านค้าออนไลน์ วิตามิน อาหารเสริม ถั่งเช่า และเครื่องกรองน้ำ ส่งฟรีเมื่อซื้อครบ 800 บาท",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const user = await getCurrentUser(); // null for a stale JWT whose user row no longer exists
  return (
    <html lang="th">
      <body className={`${plexThai.variable} flex min-h-screen flex-col bg-white antialiased`}>
        <SessionProvider session={user ? session : null}>
          <CartProvider>
            <Header user={user} />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
          <Toaster theme="light" richColors position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
