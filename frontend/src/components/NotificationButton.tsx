import { Icon } from "./Icon";

// Ported from the reference's .ib + .pip pattern (icon button with an unread-dot badge).
export default function NotificationButton() {
  return (
    <button className="ib" type="button" aria-label="Notifications">
      <Icon name="bell" size={17} />
      <span className="pip" aria-hidden="true" />
    </button>
  );
}
