// Ported from the reference's donut() function — same radius/circumference math,
// same stroke-dasharray arc technique, same centered two-line label.
export interface DonutPart {
  n: string;
  v: number;
  c: string;
}

export function Donut({ parts, total, label }: { parts: DonutPart[]; total: number; label: [string, string] }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  let off = 0;
  const arcs = parts.map((p, i) => {
    const len = C * (p.v / total);
    const el = (
      <circle
        key={i}
        cx={80}
        cy={80}
        r={R}
        fill="none"
        stroke={p.c}
        strokeWidth={20}
        strokeDasharray={`${len - 3} ${C - len + 3}`}
        strokeDashoffset={-off}
        strokeLinecap="round"
      />
    );
    off += len;
    return el;
  });

  return (
    <div className="cols">
      <svg width={160} height={160} viewBox="0 0 160 160" style={{ flex: "none" }}>
        <g transform="rotate(-90 80 80)">
          <circle cx={80} cy={80} r={R} fill="none" stroke="var(--card3)" strokeWidth={20} />
          {arcs}
        </g>
        <text x={80} y={76} textAnchor="middle" fontFamily="Sora,Inter" fontSize={26} fontWeight={600} letterSpacing={-1} fill="var(--ink)">
          {label[0]}
        </text>
        <text x={80} y={95} textAnchor="middle" fontSize={11} fill="var(--ink3)">
          {label[1]}
        </text>
      </svg>
      <div className="dlist">
        {parts.map((p, i) => (
          <div className="dl2" key={i}>
            <i style={{ background: p.c }} />
            <span>{p.n}</span>
            <b className="n">{p.v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
