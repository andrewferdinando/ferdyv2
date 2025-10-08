# Ferdy Design System Guide

**Author**: Manus AI  
**Version**: 1.0  
**Date**: October 7, 2025

## Executive Summary

This guide establishes a comprehensive design system for the Ferdy social media automation platform. The system is inspired by leading SaaS products like Notion and ClickUp, emphasizing clean aesthetics, generous white space, and intuitive interactions. The design system is scalable and can be applied across the entire Ferdy application beyond the Schedule page.

## Design Philosophy

The Ferdy design system is built on four core principles that guide all design decisions and ensure a cohesive, premium user experience.

**1. Clean & Minimal**: The interface prioritizes content over chrome. Generous white space allows users to focus on their social media posts without distraction. Every element serves a clear purpose, and unnecessary decorative elements are eliminated.

**2. Premium Feel**: Subtle shadows, smooth transitions, and refined details create a sense of quality and professionalism. The design conveys trust and reliability, essential for a business tool managing critical social media campaigns.

**3. Intuitive**: Clear visual hierarchy guides users through their workflow. Interactive elements are immediately recognizable, and feedback is instant. Users should never wonder what an element does or where to find a feature.

**4. Accessible**: The design meets WCAG AA standards with strong contrast ratios, legible text sizes, and touch-friendly interactive elements. Color is never the only means of conveying information.

## Color System

The color palette balances professionalism with personality. The primary indigo color conveys trust and modernity, while the neutral scale provides excellent readability across all contexts.

### Primary Colors

The primary color is used for interactive elements, active states, and calls-to-action. It should be the most prominent color in the interface after neutrals.

- **Primary**: `#6366F1` (Indigo 500)
  - Usage: Main brand color, primary buttons, active navigation items, links
  - Accessibility: Passes WCAG AA on white backgrounds
  
- **Primary Hover**: `#4F46E5` (Indigo 600)
  - Usage: Hover states for primary interactive elements
  
- **Primary Light**: `#EEF2FF` (Indigo 50)
  - Usage: Backgrounds for active/selected items, subtle highlights

- **Primary Gradient**: `linear-gradient(90deg, #6366F1 0%, #4F46E5 100%)`
  - Usage: Primary buttons, important call-to-action elements


### Semantic Colors

Semantic colors provide instant visual feedback for user actions and system states.

- **Error/Danger**: `#EF4444` (Red 500)
  - Usage: Error messages, delete actions, destructive operations
  - Background: `#FEF2F2` (Red 50) for error containers
  
- **Success**: `#10B981` (Emerald 500)
  - Usage: Success messages, confirmation states
  - Background: `#ECFDF5` (Emerald 50)

### Neutral Scale

The neutral scale provides the foundation for text, backgrounds, and borders. The off-white background (`#FAFAFA`) is more comfortable for extended viewing than pure white.

| Token       | Hex       | Usage                                    |
| ----------- | --------- | ---------------------------------------- |
| `gray-950`  | `#0A0A0A` | Primary headings, high-emphasis text     |
| `gray-700`  | `#374151` | Body text, standard content              |
| `gray-500`  | `#6B7280` | Secondary text, captions, icons          |
| `gray-300`  | `#D1D5DB` | Borders, dividers, input borders         |
| `gray-100`  | `#F3F4F6` | Subtle backgrounds, hover states         |
| `gray-50`   | `#FAFAFA` | Page background                          |
| White       | `#FFFFFF` | Card backgrounds, elevated surfaces      |

### Social Platform Colors

When displaying social media platform indicators, use the official brand colors for instant recognition.

- **Facebook**: `#1877F2`
- **Instagram**: `#E4405F`
- **LinkedIn**: `#0A66C2`
- **Twitter/X**: `#000000`

## Typography

Typography establishes clear hierarchy and ensures excellent readability across all devices. The Inter font family is chosen for its modern appearance and exceptional screen legibility.

### Font Family

- **Primary**: Inter (weights: 400, 500, 600, 700)
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Import**: Google Fonts CDN

### Type Scale

The type scale provides a consistent rhythm and clear hierarchy throughout the interface.

| Level           | Size  | Weight | Line Height | Usage                          |
| --------------- | ----- | ------ | ----------- | ------------------------------ |
| **H1**          | 32px  | 700    | 1.2         | Page titles                    |
| **H2**          | 24px  | 600    | 1.3         | Section headings               |
| **H3**          | 20px  | 600    | 1.4         | Subsection headings            |
| **Body Large**  | 16px  | 400    | 1.5         | Subtitles, important body text |
| **Body**        | 14px  | 400    | 1.5         | Standard body text             |
| **Caption**     | 12px  | 500    | 1.4         | Metadata, timestamps, badges   |

### Text Colors

Text color should be chosen based on the importance and hierarchy of the content.

- **Primary Text**: `gray-950` for headings and high-emphasis content
- **Body Text**: `gray-700` for standard readable content
- **Secondary Text**: `gray-500` for supporting information
- **Tertiary Text**: `gray-400` for de-emphasized content

## Spacing System

Consistent spacing creates visual rhythm and improves scannability. All spacing values are multiples of a 4px base unit.

### Spacing Scale

- **4px** (`spacing-1`): Tight spacing within components
- **8px** (`spacing-2`): Small gaps between related elements
- **12px** (`spacing-3`): Medium gaps within components
- **16px** (`spacing-4`): Standard padding, gaps between elements
- **20px** (`spacing-5`): Card padding, component internal spacing
- **24px** (`spacing-6`): Gaps between sections
- **32px** (`spacing-8`): Large section spacing
- **40px** (`spacing-10`): Extra-large spacing

### Layout Guidelines

- **Card Padding**: `20px` on all sides
- **Page Margins**: `40px` horizontal on desktop, `16px` on mobile
- **Component Gap**: `16px` between cards in a list
- **Section Gap**: `32px` between major page sections

## Component Library

### Buttons

Buttons are the primary means of user interaction. They should be immediately recognizable and provide clear feedback.

#### Primary Button

The primary button is used for the most important action on a page or in a section.

- **Background**: Linear gradient from `#6366F1` to `#4F46E5`
- **Text**: White, `14px`, weight `600`
- **Height**: `48px` (large), `44px` (medium), `36px` (small)
- **Padding**: `0 24px` (large), `0 20px` (medium), `0 12px` (small)
- **Border Radius**: `10px`
- **Shadow**: `0 1px 2px rgba(0,0,0,0.05)`
- **Hover**: Lift by `1px` and increase shadow
- **Active**: Return to original position

#### Secondary Button

Secondary buttons are used for less prominent actions.

- **Background**: White
- **Border**: `1px solid gray-300`
- **Text**: `gray-700`, `14px`, weight `500`
- **Hover**: Background to `gray-50`, border to `gray-400`

#### Ghost Button

Ghost buttons are used for tertiary actions that should not compete for attention.

- **Background**: Transparent
- **Text**: `gray-700`, `14px`, weight `500`
- **Hover**: Background to `gray-100`

#### Icon Button

Icon-only buttons are used when space is limited or the action is universally understood.

- **Size**: `40x40px` (standard), `36x36px` (small)
- **Border Radius**: `8px`
- **Icon Size**: `20px` (standard), `16px` (small)
- **Hover**: Background to `gray-100`

### Cards

Cards are the primary container for content. They provide clear boundaries and can be interactive.

#### Standard Card

- **Background**: White
- **Border**: `1px solid gray-200`
- **Border Radius**: `12px`
- **Padding**: `20px`
- **Shadow**: None by default
- **Hover**: Border to `gray-300`, shadow to `0 4px 6px rgba(0,0,0,0.1)`, lift by `2px`

#### Post Card (Specific)

The post card is a specialized card for displaying scheduled social media posts.

- **Layout**: Horizontal flex on desktop, vertical on mobile
- **Image**: `80x80px` rounded `8px` on desktop, full-width `200px` height on mobile
- **Content**: Flex-grow to fill available space
- **Actions**: Right-aligned with left border separator on desktop, bottom-aligned with top border on mobile

### Tabs

Tabs allow users to switch between different views of content.

- **Container**: Flex row with `8px` gap, bottom border `1px solid gray-200`
- **Tab**: `12px` vertical padding, `16px` horizontal padding
- **Text**: `14px`, weight `500`, color `gray-500`
- **Active State**: Text color to `primary`, bottom border `2px solid primary`
- **Count Badge**: Rounded pill with background `gray-100`, text `gray-600`, `12px` font size

### Badges

Badges display status or metadata in a compact format.

- **Padding**: `4px 10px` (standard), `6px 12px` (large)
- **Border Radius**: `6px`
- **Font Size**: `12px`, weight `600`
- **Primary Badge**: Background `primary-light`, text `primary`
- **Gray Badge**: Background `gray-100`, text `gray-700`

### Form Elements

#### Input Field

- **Height**: `40px`
- **Padding**: `8px 12px`
- **Border**: `1px solid gray-300`
- **Border Radius**: `8px`
- **Font Size**: `14px`
- **Focus**: Border to `primary`, add `4px` ring in `primary-light`

#### Dropdown/Select

- **Same as Input Field** with chevron icon on the right
- **Icon**: `16px`, color `gray-500`

## Shadows & Elevation

Shadows create depth and hierarchy. Use them sparingly to avoid a cluttered appearance.

- **sm**: `0 1px 2px rgba(0,0,0,0.05)` - Subtle lift for buttons
- **md**: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` - Card hover
- **lg**: `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` - Modals, popovers
- **xl**: `0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)` - Large elevated surfaces

## Border Radius

Rounded corners soften the interface and create a modern, friendly appearance.

- **Small**: `6px` - Badges, small buttons
- **Medium**: `8px` - Input fields, icon buttons
- **Large**: `12px` - Cards, large buttons
- **Extra Large**: `16px` - Modals, large containers
- **Full**: `9999px` - Pills, circular elements

## Transitions & Animations

Smooth transitions provide feedback and create a polished experience. All transitions should be fast enough to feel responsive but slow enough to be perceived.

- **Duration**: `150ms` (fast), `200ms` (standard), `300ms` (slow)
- **Easing**: `ease` for most transitions, `ease-out` for entrances, `ease-in` for exits

### Common Transitions

- **Button Hover**: `all 0.2s ease` - Background, shadow, transform
- **Card Hover**: `all 0.2s ease` - Border, shadow, transform
- **Tab Switch**: `all 0.15s ease` - Color, border
- **Input Focus**: `all 0.15s ease` - Border, box-shadow

## Iconography

Icons should be simple, recognizable, and consistent in style.

- **Library**: Lucide React (outline/line style)
- **Size**: `20px` (standard), `24px` (large), `16px` (small)
- **Stroke Width**: `2px`
- **Color**: Inherit from parent or `gray-500` by default

### Common Icons

- **Calendar**: Schedule, dates
- **Clock**: Time, timestamps
- **Plus**: Add, create new
- **Edit**: Edit, modify
- **Trash**: Delete, remove
- **Settings**: Configuration, preferences
- **ChevronDown**: Dropdown, expandable

## Responsive Design

The design system is built mobile-first and scales gracefully to larger screens.

### Breakpoints

- **Mobile**: `< 768px`
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

### Mobile Adaptations

- **Sidebar**: Collapses to hamburger menu with slide-down drawer
- **Header**: Sticky with compact layout
- **Cards**: Stack vertically with full-width images
- **Buttons**: Full-width or icon-only to save space
- **FAB**: Floating Action Button for primary action

### Touch Targets

All interactive elements should have a minimum touch target size of `44x44px` on mobile devices to ensure easy tapping.

## Accessibility

Accessibility is a core principle, not an afterthought. All designs should meet WCAG AA standards.

### Contrast Ratios

- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text** (18px+ or 14px+ bold): Minimum 3:1 contrast ratio
- **Interactive Elements**: Minimum 3:1 contrast ratio with adjacent colors

### Focus States

All interactive elements must have a visible focus indicator for keyboard navigation.

- **Focus Ring**: `2px solid primary`, `2px` offset
- **Outline**: Use browser default or custom ring

### Semantic HTML

Use semantic HTML elements to provide structure and meaning for screen readers.

- **Buttons**: Use `<button>` for actions, `<a>` for navigation
- **Headings**: Use `<h1>` through `<h6>` in hierarchical order
- **Lists**: Use `<ul>`, `<ol>`, and `<li>` for lists of items

## Implementation Notes

### CSS Variables

All design tokens are defined as CSS variables in `:root` for easy theming and maintenance.

```css
:root {
  --primary: #6366F1;
  --gray-50: #FAFAFA;
  /* ... */
}
```

### Tailwind CSS

The project uses Tailwind CSS with custom configuration to match the design system. Prefer Tailwind utility classes for rapid development while maintaining consistency.

### Component Reusability

Build components to be reusable and composable. Each component should have a single responsibility and accept props for customization.

## Future Considerations

As the Ferdy application grows, consider these enhancements to the design system:

1. **Dark Mode**: Add a dark color scheme with appropriate contrast ratios
2. **Themes**: Allow users or teams to customize the primary brand color
3. **Advanced Components**: Date pickers, rich text editors, drag-and-drop interfaces
4. **Animations**: More sophisticated micro-interactions and page transitions
5. **Illustrations**: Custom illustrations to add personality and guide users

## References

This design system draws inspiration from industry-leading SaaS platforms and design systems:

- **Notion**: [https://www.notion.so/](https://www.notion.so/)
- **ClickUp**: [https://clickup.com/](https://clickup.com/)
- **Tailwind CSS**: [https://tailwindcss.com/](https://tailwindcss.com/)
- **Inter Font**: [https://fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter)
- **Lucide Icons**: [https://lucide.dev/](https://lucide.dev/)
- **WCAG Guidelines**: [https://www.w3.org/WAI/WCAG21/quickref/](https://www.w3.org/WAI/WCAG21/quickref/)
