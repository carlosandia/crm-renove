# CRM Style Guide

## 🎨 Design System Overview

Este style guide define os padrões visuais e de interação para o CRM, seguindo as melhores práticas dos grandes players (Salesforce, HubSpot, Pipedrive).

## 🌈 Color Palette

### Primary Colors
- **Primary Blue**: `#3b82f6` (blue-500)
- **Primary Dark**: `#1e40af` (blue-800)
- **Primary Light**: `#dbeafe` (blue-100)

### Secondary Colors
- **Success Green**: `#10b981` (emerald-500)
- **Warning Orange**: `#f59e0b` (amber-500)
- **Error Red**: `#ef4444` (red-500)
- **Info Cyan**: `#06b6d4` (cyan-500)

### Neutral Colors
- **Background**: `#ffffff` (white)
- **Card Background**: `#f8fafc` (slate-50)
- **Border**: `#e2e8f0` (slate-200)
- **Text Primary**: `#0f172a` (slate-900)
- **Text Secondary**: `#64748b` (slate-500)
- **Text Muted**: `#94a3b8` (slate-400)

### Status Colors
- **Active/Online**: `#10b981` (emerald-500)
- **Inactive**: `#6b7280` (gray-500)
- **Hot Lead**: `#ef4444` (red-500)
- **Warm Lead**: `#f59e0b` (amber-500)
- **Cold Lead**: `#06b6d4` (cyan-500)

## 📝 Typography

### Font Family
- **Primary**: `Inter, system-ui, sans-serif`
- **Monospace**: `'JetBrains Mono', monospace`

### Font Sizes & Weights
- **Heading 1**: `text-3xl font-bold` (30px, 700)
- **Heading 2**: `text-2xl font-semibold` (24px, 600)
- **Heading 3**: `text-xl font-semibold` (20px, 600)
- **Heading 4**: `text-lg font-medium` (18px, 500)
- **Body Large**: `text-base font-normal` (16px, 400)
- **Body**: `text-sm font-normal` (14px, 400)
- **Caption**: `text-xs font-normal` (12px, 400)
- **Label**: `text-sm font-medium` (14px, 500)

## 📏 Spacing System

### Base Unit: 4px (Tailwind's default)
- **xs**: `2px` (0.5)
- **sm**: `4px` (1)
- **md**: `8px` (2)
- **lg**: `12px` (3)
- **xl**: `16px` (4)
- **2xl**: `24px` (6)
- **3xl**: `32px` (8)
- **4xl**: `48px` (12)

### Component Spacing
- **Card Padding**: `p-6` (24px)
- **Button Padding**: `px-4 py-2` (16px horizontal, 8px vertical)
- **Input Padding**: `px-3 py-2` (12px horizontal, 8px vertical)
- **Section Margins**: `mb-6` (24px bottom)

## 🧩 Component Styles

### Buttons
Primary Button: `bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200`
Secondary Button: `border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-md transition-colors duration-200`
Danger Button: `bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200`

### Cards
`bg-white border border-slate-200 rounded-lg shadow-sm p-6`

### Inputs
`border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`

### Tables
Table Header: `bg-slate-50 border-b border-slate-200 px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider`
Table Row: `hover:bg-slate-50 transition-colors duration-200`
Table Cell: `px-6 py-4 whitespace-nowrap text-sm text-slate-900`

## 🎭 Animation & Transitions

### Standard Transitions
- **Duration**: `200ms` (transition-colors duration-200)
- **Easing**: `ease-in-out`
- **Hover Effects**: Subtle color changes, no dramatic transforms

### Loading States
- **Skeleton**: Light gray shimmer effect
- **Spinners**: Blue primary color
- **Progress Bars**: Blue gradient

## 📱 Responsive Design

### Breakpoints (Tailwind defaults)
- **sm**: `640px`
- **md**: `768px` 
- **lg**: `1024px`
- **xl**: `1280px`
- **2xl**: `1536px`

### Mobile-First Approach
- Design for mobile first, enhance for larger screens
- Stack components vertically on mobile
- Use responsive utilities: `sm:`, `md:`, `lg:`

## ♿ Accessibility Standards

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 for normal text
- **Focus States**: Clear focus indicators with `focus:ring-2`
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **ARIA Labels**: Proper labeling for screen readers
- **Semantic HTML**: Use proper heading hierarchy and semantic elements

## 🔧 Implementation Guidelines

### React/Tailwind Best Practices
- Use shadcn/ui components when available
- Combine Tailwind utilities for custom styling
- Create reusable component variants
- Use CSS-in-JS sparingly, prefer Tailwind utilities
- Implement proper TypeScript interfaces

### Magic UI Integration
- Use BlurFade for entrance animations
- Apply ShimmerButton for primary CTAs
- Implement MotionWrapper for complex animations
- Use DataTable for enterprise-grade tables

## 📋 Component Checklist

Before implementing any new component:
- [ ] Follows color palette
- [ ] Uses correct typography scale
- [ ] Implements proper spacing
- [ ] Includes hover/focus states
- [ ] Responsive on all breakpoints
- [ ] Accessible (WCAG AA)
- [ ] Uses shadcn/ui when possible
- [ ] Includes loading states
- [ ] Proper TypeScript interfaces
