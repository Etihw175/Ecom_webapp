// Generates brand-colored SVG placeholders into public/products/<slug>.svg
// Run: npm run images
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { products, type IconKind } from "../prisma/seed-data";

const NAVY = "#06345E";
const SKY = "#7FD8F5";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function icon(kind: IconKind, color: string): string {
  switch (kind) {
    case "bottle":
      return `
  <rect x="250" y="150" width="100" height="40" rx="8" fill="${NAVY}"/>
  <rect x="210" y="185" width="180" height="240" rx="28" fill="#fff" stroke="${color}" stroke-width="6"/>
  <rect x="210" y="250" width="180" height="110" fill="${color}"/>
  <text x="300" y="318" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#fff">PV</text>`;
    case "capsule":
      return `
  <g transform="rotate(-35 300 290)">
    <rect x="170" y="240" width="260" height="100" rx="50" fill="#fff" stroke="${color}" stroke-width="6"/>
    <path d="M300 240 h80 a50 50 0 0 1 0 100 h-80 z" fill="${color}"/>
  </g>
  <circle cx="200" cy="400" r="22" fill="${color}" opacity="0.6"/>
  <circle cx="410" cy="190" r="16" fill="${color}" opacity="0.4"/>`;
    case "leaf":
      return `
  <path d="M300 150 C 420 200 430 360 300 430 C 170 360 180 200 300 150 Z" fill="${color}"/>
  <path d="M300 170 L300 420" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
  <path d="M300 260 L350 225 M300 320 L355 285 M300 260 L250 225 M300 320 L245 285" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
    case "mushroom":
      return `
  <path d="M180 290 C 180 190 420 190 420 290 Z" fill="${color}"/>
  <circle cx="250" cy="250" r="14" fill="#fff" opacity="0.7"/>
  <circle cx="330" cy="235" r="10" fill="#fff" opacity="0.7"/>
  <circle cx="370" cy="270" r="8" fill="#fff" opacity="0.7"/>
  <path d="M265 290 h70 l12 140 h-94 z" fill="#F4E3C3" stroke="${color}" stroke-width="5"/>`;
    case "drop":
      return `
  <path d="M300 150 C 300 150 200 280 200 340 a100 100 0 0 0 200 0 C 400 280 300 150 300 150 Z" fill="${color}"/>
  <path d="M250 340 a50 50 0 0 0 50 50" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    case "filter":
      return `
  <rect x="180" y="160" width="240" height="40" rx="10" fill="${NAVY}"/>
  <rect x="200" y="200" width="60" height="220" rx="16" fill="#fff" stroke="${color}" stroke-width="6"/>
  <rect x="270" y="200" width="60" height="220" rx="16" fill="${color}"/>
  <rect x="340" y="200" width="60" height="220" rx="16" fill="#fff" stroke="${color}" stroke-width="6"/>
  <path d="M300 120 c0 0 -18 22 -18 32 a18 18 0 0 0 36 0 c0 -10 -18 -32 -18 -32z" fill="${SKY}"/>`;
  }
}

function svg(name: string, label: string, kind: IconKind, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${esc(name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F3FBFE"/>
      <stop offset="1" stop-color="${SKY}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <circle cx="300" cy="290" r="190" fill="#fff" opacity="0.65"/>
  ${icon(kind, color)}
  <rect x="0" y="480" width="600" height="120" fill="${NAVY}"/>
  <text x="300" y="530" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="2" fill="#fff">${esc(label)}</text>
  <text x="300" y="570" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${SKY}">PureVita · เพียววิต้า</text>
</svg>
`;
}

const outDir = join(process.cwd(), "public", "products");
mkdirSync(outDir, { recursive: true });
for (const p of products) {
  writeFileSync(join(outDir, `${p.slug}.svg`), svg(p.name, p.label, p.icon, p.color), "utf8");
}
console.log(`Wrote ${products.length} SVGs to ${outDir}`);
