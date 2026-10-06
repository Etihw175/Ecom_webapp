/** Mock bank account shown for TRANSFER orders (demo only — not a real account). */
export const BANK_ACCOUNT = {
  bankName: "ธนาคารกสิกรไทย (ตัวอย่าง)",
  accountName: "บจก. เพียววิต้า ช้อป",
  accountNo: "123-4-56789-0",
  promptPay: "0-1055-12345-67-8",
} as const;

/** Hours a TRANSFER order should be paid within (shown to the customer). */
export const TRANSFER_DEADLINE_HOURS = 24;
