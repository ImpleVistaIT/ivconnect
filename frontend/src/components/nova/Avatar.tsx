import { avatarColor } from "../../charts/colors";

export function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span className="av" style={{ background: avatarColor(color) }}>
      {initials}
    </span>
  );
}

export function Who({ initials, color, name, sub }: { initials: string; color: string; name: string; sub: string }) {
  return (
    <div className="who">
      <Avatar initials={initials} color={color} />
      <div>
        <b>{name}</b>
        <span>{sub}</span>
      </div>
    </div>
  );
}
