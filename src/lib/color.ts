export function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const clamp = (v: number) => Math.round(Math.min(255, Math.max(0, v * factor)));
  const pad = (n: number) => n.toString(16).padStart(2, '0');
  return `#${pad(clamp(r))}${pad(clamp(g))}${pad(clamp(b))}`;
}