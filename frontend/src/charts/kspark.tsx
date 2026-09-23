// Ported from the reference's kspark() function — same min/max normalization and
// gradient-filled sparkline used inside KPI cards.
let uidCounter = 0;
const uid = () => `kspark-${++uidCounter}`;

export function KSpark({ v, c }: { v: number[]; c: string }) {
  const w = 300, h = 46;
  const mn = Math.min(...v);
  const mx = Math.max(...v);
  const r = mx - mn || 1;
  const pts = v.map((x, i) => [i * (w / (v.length - 1)), h - 4 - ((x - mn) / r) * (h - 12)] as const);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const id = uid();

  return (
    <svg className="kspark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity={0.26} />
          <stop offset="1" stopColor={c} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
