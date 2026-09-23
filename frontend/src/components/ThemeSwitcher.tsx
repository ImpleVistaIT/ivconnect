import { useTheme, THEME_STYLES } from "../context/ThemeContext";

// Ported from the reference's own .stylesel <select> — a plain native dropdown
// styled as a pill, listing the six themes directly instead of a gear-triggered popover.
export default function ThemeSwitcher() {
  const { style, setStyle } = useTheme();

  return (
    <label className="stylesel">
      <select aria-label="Color theme" value={style} onChange={(e) => setStyle(e.target.value as typeof style)}>
        {THEME_STYLES.map(([key, name]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
