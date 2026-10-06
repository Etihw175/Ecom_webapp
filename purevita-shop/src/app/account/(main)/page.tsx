import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm, PasswordForm } from "./profile-forms";

export const metadata: Metadata = { title: "โปรไฟล์" };

export default async function AccountProfilePage() {
  const sessionUser = await requireUser("/account");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, createdAt: true },
  });
  if (!user) notFound();

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-brand-navy">ข้อมูลส่วนตัว</CardTitle>
          <CardDescription>
            {user.email} · สมาชิกตั้งแต่ {formatDate(user.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultName={user.name} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-brand-navy">เปลี่ยนรหัสผ่าน</CardTitle>
          <CardDescription>รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
