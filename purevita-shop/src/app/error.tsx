"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center md:py-24" role="alert">
      <span className="mb-5 grid size-16 place-items-center rounded-full bg-brand-orange/10">
        <AlertTriangle className="size-8 text-brand-orange" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold text-brand-navy">เกิดข้อผิดพลาดบางอย่าง</h1>
      <p className="mt-2 text-muted-foreground">ขออภัยในความไม่สะดวก กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาโปรดติดต่อร้านค้า</p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">รหัสอ้างอิง: {error.digest}</p>}
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button size="lg" onClick={() => reset()}>
          <RotateCcw className="size-4" /> ลองอีกครั้ง
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          <Home className="size-4" /> กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
