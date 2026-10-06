// Shared seed data for prisma/seed.ts and scripts/generate-product-images.ts

export type IconKind = "bottle" | "capsule" | "leaf" | "mushroom" | "drop" | "filter";

export const categories = [
  { name: "วิตามิน", slug: "vitamins" },
  { name: "อาหารเสริม", slug: "supplements" },
  { name: "ถั่งเช่า", slug: "cordyceps" },
  { name: "เครื่องกรองน้ำ", slug: "water-filters" },
] as const;

export type SeedProduct = {
  name: string;
  slug: string;
  categorySlug: (typeof categories)[number]["slug"];
  price: number;
  stock: number;
  lowStockThreshold: number;
  description: string;
  icon: IconKind;
  color: string; // main color for the placeholder image
  label: string; // short latin label on the image
};

export const products: SeedProduct[] = [
  // ---------- วิตามิน ----------
  {
    name: "วิตามินซี 1000 มก. (60 เม็ด)",
    slug: "vitamin-c-1000",
    categorySlug: "vitamins",
    price: 390,
    stock: 120,
    lowStockThreshold: 10,
    icon: "bottle",
    color: "#E88A2B",
    label: "VITAMIN C 1000",
    description:
      "วิตามินซีเข้มข้น 1000 มก. ผสมสารสกัดจากอะเซโรล่าเชอร์รี่ ดูดซึมง่าย ทานวันละ 1 เม็ดหลังอาหาร\n\nสรรพคุณ:\n- เสริมสร้างภูมิคุ้มกัน ลดโอกาสเป็นหวัด\n- ช่วยให้ผิวกระจ่างใส กระตุ้นการสร้างคอลลาเจน\n- ต้านอนุมูลอิสระ ชะลอความเสื่อมของเซลล์",
  },
  {
    name: "วิตามินดี 3 2000 IU (90 แคปซูล)",
    slug: "vitamin-d3-2000",
    categorySlug: "vitamins",
    price: 450,
    stock: 80,
    lowStockThreshold: 10,
    icon: "capsule",
    color: "#F2B705",
    label: "VITAMIN D3",
    description:
      "วิตามินดี 3 (Cholecalciferol) 2000 IU ในรูปซอฟต์เจลน้ำมันมะกอก เหมาะสำหรับผู้ที่ไม่ค่อยได้รับแสงแดด\n\nสรรพคุณ:\n- ช่วยการดูดซึมแคลเซียม เสริมความแข็งแรงของกระดูกและฟัน\n- สนับสนุนการทำงานของระบบภูมิคุ้มกัน\n- ช่วยให้กล้ามเนื้อทำงานได้อย่างปกติ",
  },
  {
    name: "วิตามินบีรวม B-Complex (60 เม็ด)",
    slug: "vitamin-b-complex",
    categorySlug: "vitamins",
    price: 320,
    stock: 3,
    lowStockThreshold: 10,
    icon: "bottle",
    color: "#D9534F",
    label: "B-COMPLEX",
    description:
      "วิตามินบีรวมครบ 8 ชนิด (B1, B2, B3, B5, B6, B7, B9, B12) สำหรับคนทำงานที่อ่อนเพลียง่าย\n\nสรรพคุณ:\n- ช่วยเปลี่ยนอาหารเป็นพลังงาน ลดอาการอ่อนเพลีย\n- บำรุงระบบประสาทและสมอง ลดอาการเหน็บชา\n- ช่วยการสร้างเม็ดเลือดแดง",
  },
  {
    name: "มัลติวิตามินรวม สำหรับผู้ใหญ่ (60 เม็ด)",
    slug: "multivitamin-adult",
    categorySlug: "vitamins",
    price: 590,
    stock: 65,
    lowStockThreshold: 10,
    icon: "capsule",
    color: "#0B6FB8",
    label: "MULTIVITAMIN",
    description:
      "วิตามินและแร่ธาตุรวม 25 ชนิด สูตรครบถ้วนในเม็ดเดียว ทานวันละ 1 เม็ดหลังอาหารเช้า\n\nสรรพคุณ:\n- เติมเต็มสารอาหารที่ขาดจากการทานอาหารไม่ครบหมู่\n- เสริมพลังงานและความสดชื่นตลอดวัน\n- บำรุงผิว ผม เล็บ และระบบภูมิคุ้มกัน",
  },
  // ---------- อาหารเสริม ----------
  {
    name: "น้ำมันปลา Omega-3 1000 มก. (100 แคปซูล)",
    slug: "fish-oil-omega-3",
    categorySlug: "supplements",
    price: 650,
    stock: 90,
    lowStockThreshold: 10,
    icon: "capsule",
    color: "#E8A33D",
    label: "OMEGA-3",
    description:
      "น้ำมันปลาทะเลน้ำลึกบริสุทธิ์ มี EPA 180 มก. และ DHA 120 มก. ผ่านกระบวนการกำจัดโลหะหนัก\n\nสรรพคุณ:\n- บำรุงหัวใจและหลอดเลือด ช่วยลดไตรกลีเซอไรด์\n- บำรุงสมอง เสริมความจำ\n- ช่วยลดการอักเสบของข้อต่อ",
  },
  {
    name: "คอลลาเจนไตรเปปไทด์ 5000 มก. (30 ซอง)",
    slug: "collagen-tripeptide",
    categorySlug: "supplements",
    price: 890,
    stock: 45,
    lowStockThreshold: 8,
    icon: "leaf",
    color: "#E07AA0",
    label: "COLLAGEN",
    description:
      "คอลลาเจนไตรเปปไทด์จากปลาทะเล โมเลกุลเล็ก ดูดซึมไว ชงง่ายไม่มีกลิ่นคาว ผสมวิตามินซี\n\nสรรพคุณ:\n- ช่วยให้ผิวชุ่มชื้น เต่งตึง ลดเลือนริ้วรอย\n- บำรุงข้อต่อและกระดูกอ่อน\n- เสริมความแข็งแรงของผมและเล็บ",
  },
  {
    name: "แคลเซียม + แมกนีเซียม + ซิงค์ (60 เม็ด)",
    slug: "calcium-magnesium-zinc",
    categorySlug: "supplements",
    price: 420,
    stock: 0,
    lowStockThreshold: 10,
    icon: "bottle",
    color: "#7A8A99",
    label: "CAL-MAG-ZINC",
    description:
      "แคลเซียมคาร์บอเนต แมกนีเซียม และซิงค์ ในอัตราส่วนที่เหมาะสม เสริมด้วยวิตามินดี 3\n\nสรรพคุณ:\n- เสริมสร้างกระดูกและฟันให้แข็งแรง ป้องกันกระดูกพรุน\n- ช่วยการทำงานของกล้ามเนื้อ ลดตะคริว\n- ซิงค์ช่วยเสริมภูมิคุ้มกันและสุขภาพผิว",
  },
  {
    name: "ลูทีน & ซีแซนทีน บำรุงสายตา (30 แคปซูล)",
    slug: "lutein-zeaxanthin",
    categorySlug: "supplements",
    price: 690,
    stock: 5,
    lowStockThreshold: 5,
    icon: "capsule",
    color: "#17A45F",
    label: "LUTEIN",
    description:
      "ลูทีน 20 มก. และซีแซนทีน 4 มก. จากดอกดาวเรือง เหมาะสำหรับผู้ที่ใช้สายตากับหน้าจอเป็นเวลานาน\n\nสรรพคุณ:\n- ช่วยกรองแสงสีฟ้าจากหน้าจอ ลดอาการตาล้า\n- บำรุงจอประสาทตา ชะลอการเสื่อมของดวงตา\n- ช่วยให้มองเห็นได้ชัดเจนขึ้นในที่แสงน้อย",
  },
  // ---------- ถั่งเช่า ----------
  {
    name: "ถั่งเช่าสกัด ทิเบต พรีเมียม (60 แคปซูล)",
    slug: "cordyceps-tibet-premium",
    categorySlug: "cordyceps",
    price: 1290,
    stock: 50,
    lowStockThreshold: 8,
    icon: "mushroom",
    color: "#C1611F",
    label: "CORDYCEPS",
    description:
      "ถั่งเช่าสายพันธุ์ Cordyceps militaris เพาะเลี้ยงในระบบปิด สกัดเข้มข้น มีสารคอร์ไดเซปิน (Cordycepin) สูง\n\nสรรพคุณ:\n- เสริมสร้างพลังงาน ลดความเหนื่อยล้า เพิ่มความกระปรี้กระเปร่า\n- บำรุงปอดและไต ช่วยการทำงานของระบบหายใจ\n- เสริมภูมิคุ้มกัน เหมาะสำหรับผู้สูงอายุและคนทำงานหนัก",
  },
  {
    name: "ถั่งเช่าผสมเห็ดหลินจือ (60 แคปซูล)",
    slug: "cordyceps-lingzhi",
    categorySlug: "cordyceps",
    price: 990,
    stock: 70,
    lowStockThreshold: 8,
    icon: "mushroom",
    color: "#8B3A1E",
    label: "CORDYCEPS + LINGZHI",
    description:
      "สูตรผสานถั่งเช่าสกัดและเห็ดหลินจือแดง สมุนไพรจีนโบราณสองชนิดในแคปซูลเดียว\n\nสรรพคุณ:\n- บำรุงร่างกายโดยรวม ช่วยให้นอนหลับสบาย\n- ช่วยปรับสมดุลระบบภูมิคุ้มกัน\n- ต้านอนุมูลอิสระ ช่วยบำรุงตับ",
  },
  {
    name: "เครื่องดื่มถั่งเช่าสกัด พร้อมดื่ม (6 ขวด)",
    slug: "cordyceps-drink",
    categorySlug: "cordyceps",
    price: 450,
    stock: 40,
    lowStockThreshold: 6,
    icon: "bottle",
    color: "#D4892A",
    label: "CORDYCEPS DRINK",
    description:
      "เครื่องดื่มถั่งเช่าสกัดเข้มข้น ขวดละ 50 มล. ไม่มีน้ำตาล ดื่มง่ายพกพาสะดวก\n\nสรรพคุณ:\n- เติมพลังได้ทันที เหมาะก่อนออกกำลังกายหรือระหว่างวันทำงาน\n- ช่วยให้ร่างกายฟื้นตัวเร็วหลังออกกำลังกาย\n- บำรุงระบบหายใจและไหลเวียนโลหิต",
  },
  // ---------- เครื่องกรองน้ำ ----------
  {
    name: "เครื่องกรองน้ำ RO 5 ขั้นตอน",
    slug: "water-filter-ro-5-stage",
    categorySlug: "water-filters",
    price: 5900,
    stock: 15,
    lowStockThreshold: 3,
    icon: "filter",
    color: "#06345E",
    label: "RO 5-STAGE",
    description:
      "เครื่องกรองน้ำระบบ Reverse Osmosis 5 ขั้นตอน กำลังผลิต 75 แกลลอน/วัน พร้อมถังเก็บน้ำ 3.2 แกลลอน ติดตั้งใต้ซิงก์\n\nคุณสมบัติเด่น:\n- กรองละเอียดถึง 0.0001 ไมครอน กำจัดเชื้อโรค โลหะหนัก และสารปนเปื้อน\n- ได้น้ำดื่มสะอาด ปลอดภัย รสชาติดี\n- รับประกันตัวเครื่อง 1 ปี",
  },
  {
    name: "เครื่องกรองน้ำ UV ฆ่าเชื้อ แบบตั้งโต๊ะ",
    slug: "water-filter-uv-countertop",
    categorySlug: "water-filters",
    price: 3490,
    stock: 20,
    lowStockThreshold: 3,
    icon: "drop",
    color: "#0B6FB8",
    label: "UV FILTER",
    description:
      "เครื่องกรองน้ำแบบตั้งโต๊ะ 3 ขั้นตอน พร้อมหลอด UV ฆ่าเชื้อแบคทีเรีย ไม่ต้องเจาะผนัง ติดตั้งเองได้\n\nคุณสมบัติเด่น:\n- หลอด UV กำจัดเชื้อแบคทีเรียและไวรัสได้ 99.99%\n- คาร์บอนกัมมันต์ช่วยลดกลิ่นคลอรีนและสี\n- ขนาดกะทัดรัด เหมาะกับคอนโดและห้องเช่า",
  },
  {
    name: "ไส้กรองน้ำ Sediment + Carbon (ชุด 3 ชิ้น)",
    slug: "water-filter-cartridge-set",
    categorySlug: "water-filters",
    price: 690,
    stock: 60,
    lowStockThreshold: 10,
    icon: "filter",
    color: "#7FD8F5",
    label: "CARTRIDGE SET",
    description:
      "ชุดไส้กรองทดแทนมาตรฐาน 10 นิ้ว ประกอบด้วยไส้กรองตะกอน PP, คาร์บอนเกล็ด GAC และคาร์บอนแท่ง CTO\n\nคุณสมบัติเด่น:\n- ใช้ได้กับเครื่องกรองน้ำมาตรฐานทั่วไปและเครื่อง RO ของร้าน\n- ดักจับตะกอน สนิม ลดกลิ่นและคลอรีน\n- แนะนำเปลี่ยนทุก 6 เดือนเพื่อคุณภาพน้ำที่ดีที่สุด",
  },
];
