---
name: Kinetic Noir
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#37393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#303030'
  tertiary-container: '#e4e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display-xl:
    fontFamily: Lexend
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  stat-numerical:
    fontFamily: Lexend
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 16px
  margin: 20px
---

## Brand & Style

This design system is engineered for peak performance and high-velocity engagement. The brand personality is "The Elite Coach"—authoritative and professional, yet intensely motivating and accessible. It targets fitness enthusiasts who value efficiency and clarity during high-intensity training.

The visual style is **High-Contrast / Bold** mixed with **Minimalism**. By stripping away unnecessary decorative elements and focusing on massive typography and a singular high-energy accent color, the UI ensures that critical workout data is legible at arm's length or while in motion. The dark mode default reduces eye strain in gym environments while allowing the primary "Electric Lime" to pop with radioactive intensity, creating a sense of digital energy and "flow state."

## Colors

The palette is optimized for a "Dark Mode First" experience to maximize contrast and energy. 

- **Primary (Electric Lime):** A high-visibility, vibrant green used for primary actions, progress indicators, and active states. It signals movement and "go."
- **Secondary (Obsidian):** The true black background that provides the foundation for high contrast.
- **Tertiary (Graphite):** Used for surface elevation, cards, and input backgrounds to create subtle depth without breaking the dark aesthetic.
- **Neutral (Arctic White):** Reserved strictly for primary text and icons to ensure AAA accessibility against dark backgrounds.
- **Success/Warning/Error:** Utilize the Primary lime for success, a vivid orange (#FF9500) for warnings, and a pure red (#FF3B30) for alerts.

## Typography

This design system utilizes a dual-font strategy to balance athletic aggression with functional readability. 

**Lexend** is the primary driver for headlines and data. Its expanded character widths and hyper-legibility make it perfect for "at-a-glance" workout stats (like heart rate or timers). **Inter** is used for body copy and instructional text, providing a neutral, systematic rhythm that stays out of the way of the content.

Heavy weights (Bold/ExtraBold) are used frequently for headlines to maintain the "Energetic" brand pillar. Stats should always use the `stat-numerical` tokens for maximum impact.

## Layout & Spacing

The design system employs a **Fluid Grid** model based on a 4px baseline shift. The layout relies on generous inner padding within containers to ensure touch targets are easily hittable during physical activity. 

Standard mobile layouts should use a 4-column grid with 20px side margins. Horizontal scrolling "carousels" are encouraged for exercise libraries to keep the vertical scroll focused on the current workout's progression. Components should use the `lg` (24px) spacing for vertical separation to prevent accidental taps when the user is fatigued.

## Elevation & Depth

To maintain a modern, "lean" feel, this design system avoids heavy shadows. Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Base):** Pure Black (#000000).
- **Level 1 (Cards/Surfaces):** Dark Grey (#1A1A1A) with a subtle 1px border (#262626).
- **Level 2 (Modals/Popovers):** Mid Grey (#262626) with a soft, 10% opacity white inner glow to simulate light hitting the top edge.

Glassmorphism is used sparingly, specifically for fixed bottom navigation bars and sticky headers, using a dark background blur (30px) to maintain context of the content scrolling underneath.

## Shapes

The shape language is "Friendly Professional." It avoids the juvenile feel of hyper-rounded pill shapes for primary containers, opting instead for a substantial 1rem (16px) corner radius.

- **Standard Elements:** 8px (0.5rem) for small buttons and input fields.
- **Cards & Modals:** 16px (1rem) for a sturdy, structural look.
- **Instructional Media:** 24px (1.5rem) for video thumbnails and exercise images to make the content feel more approachable.

## Components

**Buttons:** 
Primary buttons are high-contrast: Electric Lime background with Black text. They utilize the full width of the container for mobile layouts. Secondary buttons use an outline style with Arctic White text.

**Chips:** 
Used for muscle group filters or equipment tags. Inactive chips use a Graphite background; active chips switch to Electric Lime.

**Cards:** 
Exercise cards feature a large "stat" area. The background is #1A1A1A. Active workout cards should have a 2px Electric Lime left-border to indicate "current" status.

**Input Fields:** 
Dark backgrounds (#1A1A1A) with white text. Focus states are indicated by an Electric Lime border. 

**Progress Indicators:** 
Circular rings for heart rate zones and linear bars for workout completion. Use the primary color for the "filled" portion and a low-opacity Graphite (#262626) for the track.

**Additional Components:**
- **The "Pulse" Indicator:** A small animated lime dot next to live-tracking metrics.
- **Rest Timer:** A full-screen overlay component with massive `display-xl` typography for countdowns.