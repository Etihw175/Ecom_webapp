import { Landmark } from "lucide-react";
import { BANK_ACCOUNT, TRANSFER_DEADLINE_HOURS } from "@/lib/payment";
import { formatTHB } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Mock bank transfer instructions (checkout + thank-you page). */
export function BankDetails({ amount, orderNo, className }: { amount?: number; orderNo?: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-brand-blue/20 bg-brand-sky/10 p-4 text-sm", className)}>
      <p className="mb-2 flex items-center gap-2 font-medium text-brand-navy">
        <Landmark className="size-4" /> ข้อมูลบัญชีสำหรับโอนเงิน
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">ธนาคาร</dt>
        <dd>{BANK_ACCOUNT.bankName}</dd>
        <dt className="text-muted-foreground">ชื่อบัญชี</dt>
        <dd>{BANK_ACCOUNT.accountName}</dd>
        <dt className="text-muted-foreground">เลขที่บัญชี</dt>
        <dd className="font-semibold tracking-wide text-brand-navy">{BANK_ACCOUNT.accountNo}</dd>
        <dt className="text-muted-foreground">พร้อมเพย์</dt>
        <dd>{BANK_ACCOUNT.promptPay}</dd>
        {amount !== undefined && (
          <>
            <dt className="text-muted-foreground">ยอดที่ต้องโอน</dt>
            <dd className="font-semibold text-brand-blue">{formatTHB(amount)}</dd>
          </>
        )}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        กรุณาโอนภายใน {TRANSFER_DEADLINE_HOURS} ชั่วโมง
        {orderNo ? ` และระบุเลขคำสั่งซื้อ ${orderNo} ในบันทึกการโอน` : " หลังยืนยันคำสั่งซื้อ"} (ระบบชำระเงินจำลอง)
      </p>
    </div>
  );
}
