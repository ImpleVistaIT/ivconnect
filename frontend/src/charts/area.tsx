// Ported from the reference's area() function (IVConnect_Nova_1.html.html) —
// same curve construction (straight segments between points, area fill to baseline),
// same gradient stops, same tick/label placement math.
let uidCounter = 0;
const uid = () => `area-${++uidCounter}`;

export interface AreaSeries {
  v: number[];
  c: string;
}

export function Area({ series, labels, h = 210 }: { series: AreaSeries[]; labels: string[]; h?: number }) {
  const w = 760, pl = 42, pr = 12, pt = 14, pb = 26;
  const all = series.flatMap((s) => s.v);
  const mx = Math.max(...all) * 1.12;
  const mn = 0;
  const X = (i: number) => pl + i * ((w - pl - pr) / (labels.length - 1));
  const Y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (h - pt - pb);
  const ticks = 4;

  const gridLines = Array.from({ length: ticks + 1 }, (_, t) => {
    const v = mn + ((mx - mn) * t) / ticks;
    const y = Y(v);
    return (
      <g key={t}>
        <line x1={pl} y1={y.toFixed(1)} x2={w - pr} y2={y.toFixed(1)} stroke="var(--line)" strokeWidth={1} />
        <text x={pl - 9} y={(y + 4).toFixed(1)} textAnchor="end" fontSize={10.5} fill="var(--ink3)">
          {Math.round(v)}
        </text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }} role="img">
      {gridLines}
      {series.map((s, si) => {
        const id = uid();
        const pts = s.v.map((v, i) => [X(i), Y(v)] as const);
        const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
        const areaD = `${d} L ${X(labels.length - 1).toFixed(1)} ${Y(mn)} L ${pl} ${Y(mn)} Z`;
        return (
          <g key={si}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.c} stopOpacity={0.3} />
                <stop offset="1" stopColor={s.c} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#${id})`} />
            <path d={d} fill="none" stroke={s.c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={3.2} fill="var(--card)" stroke={s.c} strokeWidth={2} />
            ))}
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={l + i} x={X(i).toFixed(1)} y={h - 6} textAnchor="middle" fontSize={10.5} fill="var(--ink3)">
          {l}
        </text>
      ))}
    </svg>
  );
}
