# DESIGN.md - Glass & Gloss Luxury System

## 1. Design Philosophy
"Minimalist Luxury". The design should feel expensive but not cluttered. Use whitespace aggressively. Elements should float using subtle shadows and glassmorphism.

## 2. Typography
- **Headings**: Serif (e.g., Playfair Display, Bodoni, or similar high-contrast serif). Elegant, timeless.
- **Body**: Sans-serif (e.g., Inter, SF Pro, Outfit). Clean, legible, modern.
- **Micro-copy**: Uppercase, tracked out (letter-spacing) for labels.

## 3. Color Palette
- **Primary Background**: #FFFFFF (White) or #F8F9FA (Off-white/Gray-50).
- **Secondary Background**: #F1F5F9 (Slate-100) for sections.
- **Text Primary**: #0F172A (Slate-900) - Never pure black.
- **Text Secondary**: #64748B (Slate-500).
- **Accent/Brand**: #D4AF37 (Gold) or #C6A665 (Muted Gold/Bronze) - Use sparingly for buttons/highlights.
- **Success/Green**: #10B981 (Emerald-500).

## 4. UI Patterns (Glass & Gloss)
- **Cards**: White background, low opacity border (1px solid slate-100), large shadow-sm, hover:shadow-xl and scale-105 transition.
- **Glassmorphism**: `backdrop-filter: blur(12px)`, `bg-white/80` for fixed headers or floating overlays.
- **Buttons**:
    - *Primary*: Solid Dark Slate or Gold, White text, rounded-none (sharp luxury) or soft rounded-md.
    - *Secondary*: Outline, thin borders.

## 5. Spacing & Layout
- **Container**: Max-width 1440px.
- **Padding**: Generous. `py-24` or `py-32` for section gaps.
- **Grid**: 12-column grid standard.

## 6. Design System Notes for Stitch Generation
[COPY THIS BLOCK INTO PROMPTS]
Use a "Glass & Gloss" luxury minimalist aesthetic.
- **Font**: Serif for H1-H3, Sans-serif for body.
- **Colors**: White backgrounds, Slate-900 text, Muted Gold (#C6A665) accents.
- **Components**:
    - Use clear, ample whitespace (padding).
    - Use `backdrop-blur` for floating elements.
    - Images should be high-quality, spanning full width or large grids.
    - Buttons should be elegant (sharp corners or pill-shaped, consistent).
- **Vibe**: Punta del Este luxury, ocean, summer, exclusive.
