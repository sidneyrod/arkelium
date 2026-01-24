
# Comprehensive Fix for Schedule Screen Issues

Based on my analysis of the screenshot and code, I've identified exactly what went wrong and how to fix it correctly:

---

## Issue 1: Card Colors Not Matching Status

### Problem
Currently, ALL Service cards in Month view use a uniform blue/info tint. The user requested:
- **Completed** jobs → **Green** card background
- **In Progress** jobs → **Yellow/Amber** card background
- **Scheduled** → can remain blue

### Root Cause (Line 1742-1744 in Schedule.tsx)
```tsx
isVisit 
  ? "border-l-[3px] border-l-purple-500 bg-purple-500/6..." 
  : cn("border-l-[3px] border-l-info", statusConfig[job.status].badgeClass),
```
The code applies `statusConfig[job.status].badgeClass` which styles badges, NOT card backgrounds.

### Solution
Add a new `cardBgClass` property to `statusConfig` and apply status-based card colors:

**1. Update `statusConfig` (Line ~100-144):**
```tsx
const statusConfig = {
  scheduled: { 
    ...existing,
    cardBgClass: 'bg-info/8 hover:bg-info/12',
    cardBorderClass: 'border-l-info',
  },
  'in-progress': { 
    ...existing,
    cardBgClass: 'bg-warning/10 hover:bg-warning/16',  // Yellow/amber
    cardBorderClass: 'border-l-warning',
  },
  completed: { 
    ...existing,
    cardBgClass: 'bg-success/10 hover:bg-success/16',  // Green
    cardBorderClass: 'border-l-success',
  },
  cancelled: { 
    ...existing,
    cardBgClass: 'bg-muted/10 hover:bg-muted/16',
    cardBorderClass: 'border-l-muted-foreground',
  },
};
```

**2. Update Month View card rendering (Line ~1742):**
```tsx
isVisit 
  ? "border-l-[3px] border-l-purple-500 bg-purple-500/12 hover:bg-purple-500/18" 
  : cn("border-l-[3px]", statusConfig[job.status].cardBorderClass, statusConfig[job.status].cardBgClass),
```

---

## Issue 2: Layout Wrapping When Sidebar Expands

### Problem
The filters/actions row drops to a new line when the sidebar menu expands, even though there's available horizontal space.

### Root Cause (Lines 1532, 1573)
```tsx
<div className="flex flex-wrap items-center gap-3">  // Main container wraps
<div className="flex items-center gap-2 ml-auto flex-wrap">  // Actions also wrap
```

### Solution
Remove `flex-wrap` from both containers and add `flex-shrink-0` to critical elements:

**1. Main header container (Line 1532):**
```tsx
<div className="flex items-center gap-3 min-w-0">
```

**2. KPI pills container (Line 1550):**
```tsx
<div className="flex items-center gap-2 flex-shrink-0">
```

**3. Filters container (Line 1573):**
```tsx
<div className="flex items-center gap-2 ml-auto">
```

**4. Reduce widths of filter selects if needed:**
```tsx
<SelectTrigger className="w-[100px] h-9">  // Was w-[120px]
```

---

## Issue 3: Visit Card Fill Not Matching Service Card

### Problem
Visit cards have a very light `bg-purple-500/6` (6% opacity) while Service cards have stronger fills. User wants Visit cards to be as solid/filled as Service cards.

### Current Code (Line 1742-1743)
```tsx
"bg-purple-500/6 hover:bg-purple-500/12"  // Too transparent
```

### Solution
Increase Visit card opacity to match Service cards:

**1. Month View (Line 1742-1743):**
```tsx
isVisit 
  ? "border-l-[3px] border-l-purple-500 bg-purple-500/12 hover:bg-purple-500/18 dark:bg-purple-500/14 dark:hover:bg-purple-500/20" 
```

**2. Also update Week View and Day View Visit cards similarly** - search for `bg-purple-500/6` or similar and increase to `/12` minimum.

---

## Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `src/pages/Schedule.tsx` | 100-144 | Add `cardBgClass` and `cardBorderClass` to `statusConfig` |
| `src/pages/Schedule.tsx` | 1532 | Remove `flex-wrap`, use `flex items-center gap-3 min-w-0` |
| `src/pages/Schedule.tsx` | 1550 | Add `flex-shrink-0` to KPI pills container |
| `src/pages/Schedule.tsx` | 1573 | Remove `flex-wrap` from filters container |
| `src/pages/Schedule.tsx` | 1576, 1599, 1613 | Reduce select widths to `w-[100px]` |
| `src/pages/Schedule.tsx` | 1742-1744 | Apply status-based card colors for Services, increase purple opacity for Visits |
| `src/pages/Schedule.tsx` | Week/Day views | Update Visit card backgrounds similarly |

---

## Expected Visual Result

**After Implementation:**
- **Completed** Service cards → **Solid green** background with green left border
- **In Progress** Service cards → **Solid amber/yellow** background with amber left border
- **Scheduled** Service cards → Blue background (as before)
- **Visit** cards → **Solid purple** fill (12%+ opacity) matching Service card density
- Header row → **Single line** that doesn't wrap when sidebar expands

This will achieve the exact visual requirements you specified: green for Completed, yellow for In Progress, and filled purple Visit cards matching the Service card style.
