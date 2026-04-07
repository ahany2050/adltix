# Adltix Design System

## Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `brand` | `#E8602D` | Primary orange - buttons, CTAs, active states |
| `brand-light` | `#F07040` | Hover states, active nav items |
| `brand-dark` | `#C94E20` | Pressed states |
| `lime` | `#CDFF00` | Neon lime accent - links, badges, highlights |
| `lime-dark` | `#B8E600` | Lime hover state |
| `accent-red` | `#E84B3A` | Logo slash, destructive actions |
| `accent-orange` | `#E8602D` | Card backgrounds, section highlights |

## Dark Theme Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `surface` | `#2D2D2D` | Main background (charcoal) |
| `surface-elevated` | `#3A3A3A` | Cards, sidebar, modals |
| `surface-overlay` | `#444444` | Hover states, dropdowns |

## Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#FFFFFF` | Headlines, body text |
| `secondary` | `#A0A0A0` | Descriptions, labels |
| `tertiary` | `#6B6B6B` | Placeholders, disabled |

## Separator
- `separator`: `rgba(255,255,255,0.1)` - Borders, dividers

## Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#34C759` | Approved, paid, active |
| `warning` | `#FF9F0A` | Pending, processing |
| `error` | `#FF3B30` | Rejected, failed |
| `info` | `#CDFF00` | Informational (uses lime) |

## Typography

- **Font Family**: Poppins (weights: 300-800)
- **Display**: Poppins, bold/extrabold for headlines
- **Body**: Poppins, regular weight

## Logo

The Adltix logo is bold condensed text: **ADLTIX** with the "L" in `accent-red` (#E84B3A).

```html
<span class="font-extrabold tracking-tight text-primary">
  AD<span class="text-accent-red">L</span>TIX
</span>
```

## Component Classes

| Class | Description |
|-------|-------------|
| `.btn-primary` | Orange pill button |
| `.btn-secondary` | Outlined dark button |
| `.btn-ghost` | Lime text button |
| `.adltix-card` | Dark elevated card with border |
| `.adltix-input` | Dark input with lime focus ring |
| `.badge-success` | Green status badge |
| `.badge-warning` | Orange status badge |
| `.badge-error` | Red status badge |
| `.badge-info` | Lime status badge |
| `.badge-neutral` | Grey status badge |

## Design Principles

1. **Dark-first**: All surfaces use the dark charcoal palette
2. **Bold typography**: Condensed, heavy-weight headlines
3. **High contrast accents**: Neon lime and orange pop against dark backgrounds
4. **Pill-shaped buttons**: Rounded pill radius for all CTAs
5. **Minimal borders**: Use `separator` color sparingly
6. **Lime focus rings**: All interactive elements use lime glow on focus
