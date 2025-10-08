# Ferdy Component Library

**Version**: 1.0  
**Last Updated**: October 8, 2025

## Overview

This document provides detailed specifications for all reusable UI components in the Ferdy design system. Each component follows the design system principles and maintains consistency across the application.

## Component Index

- [Buttons](#buttons)
- [Cards](#cards)
- [Tabs](#tabs)
- [Badges](#badges)
- [Form Elements](#form-elements)
- [Navigation](#navigation)
- [Icons](#icons)

---

## Buttons

Buttons are the primary means of user interaction. They should be immediately recognizable and provide clear feedback.

### Primary Button

The primary button is used for the most important action on a page or in a section.

**Specifications:**
- **Background**: Linear gradient from `#6366F1` to `#4F46E5`
- **Text**: White, `14px`, weight `600`
- **Height**: `48px` (large), `44px` (medium), `36px` (small)
- **Padding**: `0 24px` (large), `0 20px` (medium), `0 12px` (small)
- **Border Radius**: `10px`
- **Shadow**: `0 1px 2px rgba(0,0,0,0.05)`
- **Hover**: Lift by `1px` and increase shadow
- **Active**: Return to original position

**Usage:**
```tsx
<button className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-6 py-3 rounded-[10px] font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
  New Post
</button>
```

### Secondary Button

Secondary buttons are used for less prominent actions.

**Specifications:**
- **Background**: White
- **Border**: `1px solid #D1D5DB`
- **Text**: `#374151`, `14px`, weight `500`
- **Hover**: Background to `#F3F4F6`, border to `#9CA3AF`

**Usage:**
```tsx
<button className="bg-white border border-gray-300 text-gray-700 px-5 py-3 rounded-[10px] font-medium text-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
  Cancel
</button>
```

### Ghost Button

Ghost buttons are used for tertiary actions that should not compete for attention.

**Specifications:**
- **Background**: Transparent
- **Text**: `#374151`, `14px`, weight `500`
- **Hover**: Background to `#F3F4F6`

**Usage:**
```tsx
<button className="bg-transparent text-gray-700 px-5 py-3 font-medium text-sm hover:bg-gray-100 transition-all duration-200">
  Learn More
</button>
```

### Icon Button

Icon-only buttons are used when space is limited or the action is universally understood.

**Specifications:**
- **Size**: `40x40px` (standard), `36x36px` (small)
- **Border Radius**: `8px`
- **Icon Size**: `20px` (standard), `16px` (small)
- **Hover**: Background to `#F3F4F6`

**Usage:**
```tsx
<button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200">
  <EditIcon className="w-5 h-5" />
</button>
```

---

## Cards

Cards are the primary container for content. They provide clear boundaries and can be interactive.

### Standard Card

**Specifications:**
- **Background**: White
- **Border**: `1px solid #E5E7EB`
- **Border Radius**: `12px`
- **Padding**: `20px`
- **Shadow**: None by default
- **Hover**: Border to `#D1D5DB`, shadow to `0 4px 6px rgba(0,0,0,0.1)`, lift by `2px`

**Usage:**
```tsx
<div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
  {/* Card content */}
</div>
```

### Post Card (Specialized)

The post card is a specialized card for displaying scheduled social media posts.

**Specifications:**
- **Layout**: Horizontal flex on desktop, vertical on mobile
- **Image**: `80x80px` rounded `8px` on desktop, full-width `200px` height on mobile
- **Content**: Flex-grow to fill available space
- **Actions**: Right-aligned with left border separator on desktop, bottom-aligned with top border on mobile

**Usage:**
```tsx
<div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
  <div className="flex items-start space-x-4">
    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
      {/* Post image */}
    </div>
    <div className="flex-1 min-w-0">
      {/* Post content */}
    </div>
    <div className="flex items-center space-x-2 ml-4">
      {/* Actions */}
    </div>
  </div>
</div>
```

---

## Tabs

Tabs allow users to switch between different views of content.

**Specifications:**
- **Container**: Flex row with `8px` gap, bottom border `1px solid #E5E7EB`
- **Tab**: `12px` vertical padding, `16px` horizontal padding
- **Text**: `14px`, weight `500`, color `#6B7280`
- **Active State**: Text color to `#6366F1`, bottom border `2px solid #6366F1`
- **Count Badge**: Rounded pill with background `#F3F4F6`, text `#6B7280`, `12px` font size

**Usage:**
```tsx
<div className="flex space-x-8 border-b border-gray-200">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      className={`pb-3 border-b-2 font-medium transition-colors ${
        activeTab === tab.id
          ? 'border-[#6366F1] text-[#6366F1]'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {tab.label} {tab.count}
    </button>
  ))}
</div>
```

---

## Badges

Badges display status or metadata in a compact format.

**Specifications:**
- **Padding**: `4px 10px` (standard), `6px 12px` (large)
- **Border Radius**: `6px`
- **Font Size**: `12px`, weight `600`
- **Primary Badge**: Background `#EEF2FF`, text `#6366F1`
- **Gray Badge**: Background `#F3F4F6`, text `#374151`

**Usage:**
```tsx
{/* Primary Badge */}
<span className="inline-flex items-center px-2.5 py-1 bg-[#EEF2FF] text-[#6366F1] text-xs font-semibold rounded-md">
  Scheduled
</span>

{/* Gray Badge */}
<span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md">
  Draft
</span>
```

---

## Form Elements

### Input Field

**Specifications:**
- **Height**: `40px`
- **Padding**: `8px 12px`
- **Border**: `1px solid #D1D5DB`
- **Border Radius**: `8px`
- **Font Size**: `14px`
- **Focus**: Border to `#6366F1`, add `4px` ring in `#EEF2FF`

**Usage:**
```tsx
<input 
  className="h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition-all duration-150"
  placeholder="Search posts..."
/>
```

### Dropdown/Select

**Specifications:**
- Same as Input Field with chevron icon on the right
- **Icon**: `16px`, color `#6B7280`

**Usage:**
```tsx
<div className="relative">
  <select className="h-10 px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition-all duration-150 appearance-none">
    <option>Select platform</option>
  </select>
  <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
</div>
```

---

## Navigation

### Sidebar Navigation

**Specifications:**
- **Width**: `280px`
- **Background**: White
- **Border**: `1px solid #E5E7EB` (right border)
- **Padding**: `16px`

### Navigation Items

**Specifications:**
- **Padding**: `12px 16px`
- **Border Radius**: `8px`
- **Text**: `14px`, weight `500`, color `#374151`
- **Active State**: Background `#EEF2FF`, text `#6366F1`
- **Hover**: Background `#F3F4F6`

**Usage:**
```tsx
<nav className="flex-1 p-4">
  <ul className="space-y-2">
    {navigationItems.map((item) => (
      <li key={item.name}>
        <Link
          href={item.href}
          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            item.active
              ? 'bg-[#EEF2FF] text-[#6366F1]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.name}</span>
        </Link>
      </li>
    ))}
  </ul>
</nav>
```

---

## Icons

### Icon Specifications

**Library**: Lucide React (outline/line style)
- **Size**: `20px` (standard), `24px` (large), `16px` (small)
- **Stroke Width**: `2px`
- **Color**: Inherit from parent or `#6B7280` by default

### Common Icons

| Icon | Usage | Component |
|------|-------|-----------|
| Calendar | Schedule, dates | `Calendar` |
| Clock | Time, timestamps | `Clock` |
| Plus | Add, create new | `Plus` |
| Edit | Edit, modify | `Edit` |
| Trash | Delete, remove | `Trash2` |
| Settings | Configuration, preferences | `Settings` |
| ChevronDown | Dropdown, expandable | `ChevronDown` |

**Usage:**
```tsx
import { Calendar, Clock, Plus, Edit, Trash2, Settings, ChevronDown } from 'lucide-react';

<Calendar className="w-5 h-5 text-gray-500" />
<Clock className="w-4 h-4 text-gray-500" />
<Plus className="w-5 h-5" />
```

---

## Accessibility Guidelines

### Focus States

All interactive elements must have a visible focus indicator for keyboard navigation.

- **Focus Ring**: `2px solid #6366F1`, `2px` offset
- **Implementation**: Use `focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2`

### Touch Targets

All interactive elements should have a minimum touch target size of `44x44px` on mobile devices.

### Semantic HTML

Use semantic HTML elements to provide structure and meaning for screen readers.

- **Buttons**: Use `<button>` for actions, `<a>` for navigation
- **Headings**: Use `<h1>` through `<h6>` in hierarchical order
- **Lists**: Use `<ul>`, `<ol>`, and `<li>` for lists of items

---

## Implementation Notes

### CSS Classes

Prefer Tailwind CSS utility classes for rapid development while maintaining consistency with the design system.

### Component Reusability

Build components to be reusable and composable. Each component should have a single responsibility and accept props for customization.

### Responsive Design

All components are built mobile-first and scale gracefully to larger screens using Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`).

---

## Future Enhancements

As the Ferdy application grows, consider these component additions:

1. **Date Picker**: For scheduling posts
2. **Rich Text Editor**: For post content creation
3. **Drag and Drop**: For reordering posts
4. **Modal/Dialog**: For confirmations and forms
5. **Toast Notifications**: For user feedback
6. **Loading States**: For better UX during async operations
