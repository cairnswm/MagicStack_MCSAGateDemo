626f6c742d63632d6167656e74Here is the design system for this application:

---

## Design System

### Color Palette
The default theme is **dark blue background, red foreground, white text**.

**Primary — Red** (logos, headers/headings, icons, actions, active states)
- `red-400` hover, `red-500` default, `red-600` pressed
- Applies to the logo, page/section headers, icons, primary buttons, links and active nav states

**Background — Dark Blue** (default for the whole app)
- Page background: `blue-950` (default)
- Surfaces (cards, dropdowns, modals): `blue-900`
- Borders: `blue-800`

**Text — White**
- Body/normal text: `white`
- Secondary text: `blue-200` (muted, still readable on dark blue)
- Headers, logos and icons use the red primary, not white

**Status Colors**
| State | Light | Dark |
|---|---|---|
| Success | `green-600`, `green-50`, `green-200` border | `green-400`, `green-900/20`, `green-800` border |
| Pending | `amber-600`, `amber-50`, `amber-200` border | `amber-400`, `amber-900/20`, `amber-800` border |
| Uploading | `blue-600`, `blue-50`, `blue-200` border | `blue-400`, `blue-900/20`, `blue-800` border |
| Error | `red-600`, `red-50`, `red-200` border | `red-400`, `red-900/20`, `red-800` border |

Status colors use the **Dark** column by default, since the app is dark. Because the primary is also red, always pair error states with an alert icon and message text so they are distinguishable from ordinary red UI.

---

### Typography
- **Font**: Inter, system-ui fallback; antialiased
- **Sizes**: `text-xs` (labels/badges) → `text-sm` (body) → `text-base` → `text-xl` (stat numbers) → `text-2xl` (page titles) → `text-4xl–6xl` (hero)
- **Weights**: regular 400, medium 500, semibold 600, bold 700 — maximum 3 per screen
- **Tracking**: `tracking-tight` on logotype, `tracking-wide` on uppercase section labels

---

### Spacing
Base grid: **8px (Tailwind spacing-2)**. All padding, gap, and margin values are multiples of this.

Common patterns:
- Card padding: `px-4 py-3`
- Button padding: `px-4 py-2.5` (medium), `px-2.5 py-1.5` (small)
- Section gaps: `gap-3` (stat grid), `gap-4` (card grid)
- Page container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

---

### Border Radius
| Token | Use |
|---|---|
| `rounded-full` | Inline badges, pills, status dots, avatar rings |
| `rounded-lg` | Small buttons, inputs, table cells |
| `rounded-xl` | Primary buttons, banners, dropdowns, stat cards |
| `rounded-2xl` | Entry cards, modals |
| `rounded-3xl` | Large icon containers (empty states) |

---

### Component Patterns

**Buttons**
- Primary: `bg-red-500 hover:bg-red-400 text-white rounded-xl px-4 py-2.5 text-sm font-medium active:scale-95 hover:shadow-lg hover:shadow-red-500/20`
- Ghost/text: `text-red-400 hover:text-red-300` + icon
- Destructive: `bg-red-700 hover:bg-red-600 text-white rounded-lg` (darker red, with a confirm step, to distinguish from primary)
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

**Headers/Logo**: `text-red-500` (logotype, page titles, section headings)

**Cards**: `bg-blue-900 text-white rounded-2xl border border-blue-800 shadow-sm hover:shadow-md transition-shadow`

**Badges/Pills**: `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border` + status color set

**Dropdowns**: `bg-blue-900 text-white rounded-xl border border-blue-800 shadow-lg animate-slide-down`

---

### Icons
**Lucide React** exclusively. Sizes: `w-3` (inline), `w-3.5` (small UI), `w-4` (standard), `w-6` (nav), `w-10` (empty states).

---

### Animations
Custom keyframes defined in `tailwind.config.js`:
- `animate-fade-in` — opacity 0→1, 0.3s ease-in-out
- `animate-slide-down` — translateY(-10px)+opacity 0 → 0+1, 0.3s ease-out (dropdowns)
- `animate-slide-up` — translateY(+10px)+opacity 0 → 0+1, 0.3s ease-out
- `animate-pulse-slow` — standard pulse at 3s cycle (status dots, loading hints)
- `animate-spin` — Lucide `Loader` icon during active uploads

All interactive elements use `transition-colors` or `transition-all duration-200`.

---

### Dark Mode
Dark blue is the **default** theme: the `dark` class is applied to the `<html>` element on first load (`darkMode: 'class'`, managed via `ThemeContext`), and the base styles (`body`) use `bg-blue-950 text-white`. The color tokens above are the default; any optional light theme is secondary and must keep red as the foreground accent.
