"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTHB } from "@/lib/format";
import type { RevenuePoint } from "@/lib/admin/dashboard";

const BRAND_BLUE = "#0B6FB8";
const BRAND_NAVY = "#06345E";

function compactTHB(v: number) {
  if (v >= 1000) return `฿${(v / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })}k`;
  return `฿${v}`;
}

type TooltipPayload = { payload: RevenuePoint };

function ChartTooltip({ active, payload }: { active?: boolean; payload?: readonly TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-brand-navy">{p.label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{formatTHB(p.revenue)}</p>
      <p className="text-muted-foreground">{p.orders.toLocaleString("th-TH")} คำสั่งซื้อ</p>
    </div>
  );
}

/** 14-day revenue bars (single series → no legend; title names it). */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <div className="h-64 w-full sm:h-72" role="img" aria-label={`ยอดขาย 14 วันล่าสุด รวม ${formatTHB(total)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#d1d5db" }}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickFormatter={compactTHB}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            width={52}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(127, 216, 245, 0.25)" }} />
          <Bar dataKey="revenue" name="ยอดขาย" fill={BRAND_BLUE} radius={[4, 4, 0, 0]} activeBar={{ fill: BRAND_NAVY }} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
