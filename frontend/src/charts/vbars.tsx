// Ported from the reference's vbars() function — same bar-width/height math and
// value/label text placement above and below each bar.
export interface VBarDatum {
  l: string;
  v: number;
  c: string;
}

export function VBars({ data, h = 200 }: { data: VBarDatum[]; h?: number }) {
  const w = 560, pl = 36, pb = 28, pt = 12;
  const mx = Math.max(...data.map((d) => d.v)) * 1.15;
  const bw = (w - pl - 10) / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {[0, 1, 2, 3].map((t) => {
        const y = pt + (t / 3) * (h - pt - pb);
        return <line key={t} x1={pl} y1={y} x2={w - 6} y2={y} stroke="var(--line)" />;
      })}
      {data.map((d, i) => {
        const bh = (d.v / mx) * (h - pt - pb);
        const x = pl + i * bw + bw * 0.22;
        const y = h - pb - bh;
        return (
          <g key={i}>
            <rect x={x.toFixed(1)} y={y.toFixed(1)} width={(bw * 0.56).toFixed(1)} height={bh.toFixed(1)} rx={6} fill={d.c} />
            <text x={(x + bw * 0.28).toFixed(1)} y={(y - 7).toFixed(1)} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)">
              {d.v}
            </text>
            <text x={(x + bw * 0.28).toFixed(1)} y={h - 9} textAnchor="middle" fontSize={10.5} fill="var(--ink3)">
              {d.l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
