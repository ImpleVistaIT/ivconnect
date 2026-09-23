// Maps the reference design's icon keys (frontend/design-reference/IVConnect_Nova_1.html.html,
// the `I` path table and `ic()` helper) onto lucide-react, which already ships an equivalent
// for every one of them — so no custom inline SVG was needed for this reference.
import {
  LayoutGrid,
  Layers,
  Users2,
  Users,
  User,
  Sparkles,
  Banknote,
  Calendar,
  Target,
  Cog,
  Bell,
  Sun,
  Search,
  FileText,
  TrendingUp,
  Plus,
  type LucideIcon,
} from "lucide-react";

export const ICONS = {
  grid: LayoutGrid,
  layers: Layers,
  users2: Users2,
  users: Users,
  // Not in the reference's icon set: it never needed a "my own profile" icon
  // distinct from the generic team "users" glyph.
  user: User,
  spark: Sparkles,
  cash: Banknote,
  cal: Calendar,
  target: Target,
  cog: Cog,
  bell: Bell,
  sun: Sun,
  search: Search,
  doc: FileText,
  up: TrendingUp,
  plus: Plus,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 21, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  const Cmp = ICONS[name];
  return <Cmp size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
