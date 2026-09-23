import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Icon, type IconName } from "../Icon";
import { KSpark } from "../../charts/kspark";

export function KpiTile({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  unit,
  deltaLabel,
  deltaTone,
  footnote,
  spark,
  sparkColor,
  span = 3,
  hidden,
  onToggleHidden,
}: {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  label: string;
  value: ReactNode;
  unit?: string;
  deltaLabel: string;
  deltaTone: "u" | "d" | "f";
  footnote: string;
  spark: number[];
  sparkColor: string;
  span?: number;
  // When provided, the value is masked until the eye icon is clicked.
  hidden?: boolean;
  onToggleHidden?: () => void;
}) {
  return (
    <div className={`k kpi c${span}`}>
      <div className="lb">
        <i style={{ background: iconBg, color: iconColor }}>
          <Icon name={icon} size={14} />
        </i>
        {label}
      </div>
      <div className="v n" style={onToggleHidden ? { display: "flex", alignItems: "center", gap: 8 } : undefined}>
        {hidden ? "••••••" : value}
        {!hidden && unit && <small> {unit}</small>}
        {onToggleHidden && (
          <button
            type="button"
            onClick={onToggleHidden}
            aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
            aria-pressed={!hidden}
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "none",
              background: "none",
              color: "var(--ink3)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {hidden ? <Eye size={16} strokeWidth={1.8} /> : <EyeOff size={16} strokeWidth={1.8} />}
          </button>
        )}
      </div>
      <div className="ft">
        <span className={`dl ${deltaTone}`}>{deltaLabel}</span>
        {footnote}
      </div>
      <KSpark v={spark} c={sparkColor} />
    </div>
  );
}
