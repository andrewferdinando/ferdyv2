// Ferdy Design System Theme Configuration
export const theme = {
  colors: {
    // Primary colors (Indigo-based)
    primary: {
      50: '#EEF2FF', // Primary Light
      500: '#6366F1', // Primary
      600: '#4F46E5', // Primary Hover
    },
    // Semantic colors
    semantic: {
      error: '#EF4444', // Red 500
      errorBg: '#FEF2F2', // Red 50
      success: '#10B981', // Emerald 500
      successBg: '#ECFDF5', // Emerald 50
    },
    // Neutral scale
    gray: {
      50: '#FAFAFA', // Page background
      100: '#F3F4F6', // Subtle backgrounds, hover states
      200: '#E5E7EB', // Card borders
      300: '#D1D5DB', // Input borders, dividers
      400: '#9CA3AF', // Tertiary text
      500: '#6B7280', // Secondary text, icons
      700: '#374151', // Body text
      950: '#0A0A0A', // Primary headings
    },
    // Social platform colors
    social: {
      facebook: '#1877F2',
      instagram: '#E4405F',
      linkedin: '#0A66C2',
      twitter: '#000000',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    },
    fontSize: {
      h1: '32px',
      h2: '24px', 
      h3: '20px',
      bodyLarge: '16px',
      body: '14px',
      caption: '12px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      h1: '1.2',
      h2: '1.3',
      h3: '1.4',
      body: '1.5',
      caption: '1.4',
    },
  },
  
  // Spacing system (4px base unit)
  spacing: {
    1: '4px',   // Tight spacing within components
    2: '8px',   // Small gaps between related elements
    3: '12px',  // Medium gaps within components
    4: '16px',  // Standard padding, gaps between elements
    5: '20px',  // Card padding, component internal spacing
    6: '24px',  // Gaps between sections
    8: '32px',  // Large section spacing
    10: '40px', // Extra-large spacing
  },
  
  // Border radius
  borderRadius: {
    small: '6px',     // Badges, small buttons
    medium: '8px',    // Input fields, icon buttons
    large: '12px',    // Cards, large buttons
    xlarge: '16px',   // Modals, large containers
    full: '9999px',   // Pills, circular elements
  },
  
  // Shadows & Elevation
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms',
    standard: '200ms',
    slow: '300ms',
    easing: {
      ease: 'ease',
      easeOut: 'ease-out',
      easeIn: 'ease-in',
    },
  },
  
  // Layout
  layout: {
    sidebarWidth: '280px',
    headerHeight: '64px',
    breakpoints: {
      mobile: '768px',
      tablet: '1024px',
    },
  },
} as const;

export type Theme = typeof theme;
