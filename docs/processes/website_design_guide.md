# Ferdy Website Design Guide

## 1. Brand Identity

**Ferdy** is a social media automation tool designed for small businesses. The brand personality is:

- **Approachable & Friendly**: Not overly corporate or technical.

- **Efficient & Reliable**: "Set it and forget it" peace of mind.

- **Modern & Clean**: Simple, clutter-free interface.

## 2. Logo Usage

The Ferdy logo is a custom wordmark using the **Plus Jakarta Sans** typeface with a gradient fill.

### Logo Files

- **Full Logo**: `docs/processes/assets/ferdy_logo_transparent.png` - Full wordmark with transparent background
- **Favicon/Icon**: `docs/processes/assets/ferdy_favicon_white.png` - "F" icon mark on white background

### Logo Guidelines

- **Primary Logo**: Gradient text (blue to violet) on light background.

- **Clear Space**: Maintain at least 20px of clear space around the logo.

- **Minimum Size**: Do not use smaller than 80px width for legibility.

- **Background**: Use on white or light backgrounds for optimal contrast.

### Logo Colors

- **Gradient Start**: `#3b82f6` (Blue 500)
- **Gradient End**: `#8b5cf6` (Violet 500)
- **Icon Color**: `#3b82f6` (Ferdy Blue)

## 3. Typography

**Primary Font**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)

- **Headings**: Bold (700) or ExtraBold (800) for impact.

- **Body**: Regular (400) or Medium (500) for readability.

- **Letter Spacing**: Tight tracking (`-0.02em` to `-0.05em`) for headings to give a modern feel.

## 4. Color Palette

### Primary Colors

- **Ferdy Blue (Primary)**: `hsl(221, 83%, 53%)` or `#3b82f6` - Used for primary buttons and key accents.

- **Gradient Start**: `#3b82f6` (Blue 500)

- **Gradient End**: `#8b5cf6` (Violet 500)

### Secondary Colors

- **Background**: `#ffffff` (White)

- **Surface/Card**: `#f8fafc` (Slate 50)

- **Text (Foreground)**: `#0f172a` (Slate 900)

- **Muted Text**: `#64748b` (Slate 500)

### Accent Colors (for UI Elements)

- **Success**: `hsl(142, 76%, 36%)` (Green)

- **Warning**: `hsl(48, 96%, 53%)` (Yellow)

- **Error**: `hsl(0, 84%, 60%)` (Red)

## 5. UI Components

### Buttons

- **Primary**: Solid Blue background, White text, Rounded-full.

  - Hover: Slight opacity reduction or scale up.

  - Shadow: `shadow-lg shadow-primary/25`

- **Secondary/Outline**: Transparent background, Border `primary/20`, Primary text.

### Cards

- **Style**: White background, subtle border (`slate-100`), large border-radius (`rounded-2xl` or `rounded-3xl`).

- **Shadow**: Soft, diffuse shadows (`shadow-xl`) on hover.

### Gradients

- **Hero Background**: A subtle, expansive blue gradient (`bg-blue-50` to `white`) to create depth without overwhelming content.

- **Text Gradient**: Used on key phrases (e.g., "repeatable") to draw attention.

## 6. Iconography

- Use **Lucide React** icons.

- Style: Clean strokes, consistent stroke width (usually 2px).

- Color: Often paired with a light background circle in the primary color.

## 7. Layout & Spacing

- **Container**: Centered, max-width `1280px` (standard) or `1024px` (narrow).

- **Section Spacing**: Generous vertical padding (`py-24` or `py-32`) to let content breathe.

- **Grid**: Standard 12-column grid system, often collapsing to 1 column on mobile and 2-3 on desktop.

## 8. Imagery

- **Style**: Clean, high-quality screenshots or abstract representations of the UI.

- **People**: Authentic, friendly portraits (circular avatars) for testimonials and team sections.

- **Shadows**: Deep, soft shadows on product screenshots to make them "pop" off the page.

## 9. Illustration Style

### Hero Illustrations

Ferdy uses **Trello-style transformation illustrations** to communicate the product's value proposition:

- **Format**: Horizontal, large-format illustrations suitable for hero sections
- **Structure**: Left (inputs) → Middle (Ferdy AI) → Right (outputs)
- **Style**: Clean, minimal, professional SaaS aesthetic
- **Elements**: Floating cards with soft shadows, minimal text (labels only)
- **Colors**: Ferdy blue/violet gradient, white cards, subtle backgrounds
- **Tone**: Professional and calm (not playful or gimmicky)

### Illustration Components

**Left Side (Inputs):**
- Website info card
- Content library/media gallery
- Old social post references
- Category cards

**Middle (Ferdy AI):**
- Ferdy logo or icon
- Simple representation of AI processing
- Minimal visual complexity
- Connecting arrows or flow indicators

**Right Side (Outputs):**
- Instagram and Facebook post mockups
- Calendar/schedule indicators
- Shows ongoing automation (not one-off)

### Design Principles

- **Simplicity**: Clean, uncluttered compositions
- **Clarity**: Easy-to-understand left-to-right flow
- **Professionalism**: Calm, trustworthy aesthetic
- **Transformation**: Clear visual journey from inputs to outputs
- **Automation**: Visual cues showing continuous, ongoing operation

## 10. Voice & Tone

- **Conversational**: Write like a helpful friend, not a corporate robot
- **Confident**: Ferdy solves real problems effectively
- **Encouraging**: Emphasize ease of use and time savings
- **Clear**: Avoid jargon; explain features in simple terms

## 11. Design System Files

All design assets are stored in:
- **Location**: `docs/processes/assets/`
- **Logos**: `ferdy_logo_transparent.png`, `ferdy_favicon_white.png`
- **Hero Illustrations**: Generated concepts stored in project root or design folder
