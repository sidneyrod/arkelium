
# Premium Enterprise Schedule Redesign

## Executive Summary

Complete visual and UX overhaul of the Schedule screen to establish it as the flagship "Command Center" of Arkelium. This redesign focuses on perceived value, operational clarity, and enterprise-grade sophistication while preserving all existing functionality.

---

## Phase 1: Executive Summary Header (KPI Dashboard Strip)

**Move monthly indicators to a premium dashboard strip above the calendar:**

### Current State
- Summary stats displayed as inline text below controls
- Plain formatting: "45 jobs · 38 completed · 2 in progress"

### New Implementation
```
┌─────────────────────────────────────────────────────────────────────┐
│  [←] January 2026 [→] [Today]                                        │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐             │
│  │ 45 Jobs  │  │ 38       │  │ 0         │  │ 2 Today  │  [+Add Job] │
│  │          │  │ Completed│  │ In Progress│ │          │             │
│  └──────────┘  └──────────┘  └───────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Specifications
| KPI Pill | Style |
|----------|-------|
| Jobs | Neutral bg-muted/50, muted text |
| Completed | Success tint bg-success/8, text-success/70 |
| In Progress | Warning tint bg-warning/10, text-warning (if >0) |
| Today | Primary emphasis bg-primary/10, text-primary, ring-primary/20 |

**CSS Classes:**
```css
.schedule-kpi-pill {
  @apply px-4 py-2.5 rounded-xl flex flex-col items-center justify-center;
  @apply border border-border/30 bg-card/80;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.06);
}

.schedule-kpi-pill-today {
  @apply bg-primary/8 border-primary/20 ring-1 ring-primary/15;
}
```

---

## Phase 2: Current Time Indicator - Precision Redesign

### Requirements
- Show ONLY in Day and Week views (NEVER in Month)
- Respect user's local timezone via `useTimezone()` hook
- Accuracy to the minute
- Update every 60 seconds

### Visual Design
```
────●─────────── Now · 1:55 PM ─────────────────────────
```

### Implementation
```tsx
// Enhanced current time indicator with floating label
const CurrentTimeIndicator = ({ position, view }: { position: number; view: ViewType }) => {
  const { formatLocal } = useTimezone();
  const [currentTimeLabel, setCurrentTimeLabel] = useState('');
  
  useEffect(() => {
    const updateLabel = () => {
      setCurrentTimeLabel(formatLocal(new Date(), 'h:mm a'));
    };
    updateLabel();
    const interval = setInterval(updateLabel, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [formatLocal]);
  
  if (view === 'month') return null;
  
  return (
    <div className="schedule-current-time-line" style={{ top: position }}>
      <div className="schedule-current-time-dot" />
      <div className="schedule-current-time-label">
        Now · {currentTimeLabel}
      </div>
    </div>
  );
};
```

### CSS Specifications
```css
.schedule-current-time-line {
  @apply absolute left-0 right-0 h-[2px] z-40 pointer-events-none;
  background: linear-gradient(90deg, 
    hsl(0 72% 51% / 0.8) 0%, 
    hsl(0 72% 51% / 0.6) 50%,
    hsl(0 72% 51% / 0.2) 100%);
}

.schedule-current-time-dot {
  @apply absolute left-14 -top-1.5 w-3 h-3 rounded-full;
  background: hsl(0 72% 51%);
  box-shadow: 0 0 0 3px hsl(0 72% 51% / 0.2);
  animation: time-indicator-pulse 3s ease-in-out infinite;
}

.schedule-current-time-label {
  @apply absolute left-20 -top-2.5 text-[10px] font-medium;
  @apply px-2 py-0.5 rounded-full;
  @apply bg-destructive/90 text-white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

@keyframes time-indicator-pulse {
  0%, 100% { box-shadow: 0 0 0 3px hsl(0 72% 51% / 0.2); }
  50% { box-shadow: 0 0 0 5px hsl(0 72% 51% / 0.1); }
}
```

---

## Phase 3: Unified Card Architecture (Service = Visit Parity)

### Core Principle
**Service and Visit have IDENTICAL visual weight.** They differ ONLY by color accent, icon, and badge label.

### Unified Card Structure (All Views)
```
┌────────────────────────────────────────────────┐
│ ▌ [SERVICE]  Client Name              [Status] │
│ ▌                                               │
│ ▌ 🕐 9:00 AM – 11:00 AM (2h)                   │
│ ▌ 📍 123 Main St, Toronto                      │
│ ▌ 👤 John Smith                                │
└────────────────────────────────────────────────┘
```

### Color Differentiation Only
| Element | Service | Visit |
|---------|---------|-------|
| Left stripe | Blue (--info) | Purple (#8B5CF6) |
| Type badge bg | bg-info/12 | bg-purple-500/12 |
| Type badge text | text-info | text-purple-600 |
| Card hover glow | Blue glow | Purple glow |

### Shared Elements (Identical)
- Card dimensions
- Typography hierarchy
- Shadow/elevation
- Border radius (rounded-xl)
- Hover interactions
- Status badge position/styling

---

## Phase 4: View-Specific Rendering

### Month View (Compact, Color-Driven)
**Purpose:** High-level overview, density focused

**Card Design:**
```tsx
<div className={cn(
  "flex items-center gap-1.5 px-2 py-1.5 rounded-lg",
  "border-l-[3px]",
  isVisit ? "border-l-purple-500 bg-purple-500/5" : "border-l-info bg-info/5"
)}>
  {isVisit ? <Eye className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
  <span className="text-[10px] font-semibold truncate flex-1">{clientName}</span>
  <span className={cn("w-2 h-2 rounded-full", statusDotClass)} />
</div>
```

**No current time indicator in Month view.**

---

### Week View (Duration-Focused)
**Purpose:** Time block visualization with medium detail

**Card Design:**
```tsx
<div className={cn("p-2 rounded-xl", cardTypeClass)}>
  {/* Status stripe */}
  <div className={cn("schedule-status-indicator", statusIndicatorClass)} />
  
  {/* Type + Client */}
  <div className="flex items-center gap-2 mb-0.5">
    <Badge variant="outline" className={typeBadgeClass}>
      {isVisit ? 'VISIT' : 'SVC'}
    </Badge>
    <span className="font-semibold text-[11px] truncate">{clientName}</span>
  </div>
  
  {/* Time range emphasized */}
  <p className="text-[10px] font-medium text-foreground/75">
    {startTime} – {endTime}
  </p>
  
  {/* Status dot */}
  <span className={cn("w-2 h-2 rounded-full ml-auto", statusDotClass)} />
</div>
```

**Current time indicator:** Red line with dot (no floating label)

---

### Day View (Immersive, Power User)
**Purpose:** Full operational detail, command center mode

**Critical Change: Flexible Time Grid**
- Time slots EXPAND to fit card content
- No text truncation allowed
- Cards show ALL details

**Card Design (Standard Height >90px):**
```tsx
<div className={cn("p-4 rounded-xl h-full", cardTypeClass)}>
  {/* Status indicator stripe */}
  <div className={cn("schedule-status-indicator", statusIndicatorClass)} />
  
  {/* Row 1: Type Badge + Client + Status */}
  <div className="flex items-center gap-3 mb-2">
    <Badge variant="outline" className={cn("text-xs px-3 py-1", typeBadgeClass)}>
      {isVisit ? 'VISIT' : 'SERVICE'}
    </Badge>
    <h4 className="text-base font-semibold truncate flex-1">{clientName}</h4>
    <Badge className={statusBadgeClass}>
      {statusIcon} {statusLabel}
    </Badge>
  </div>
  
  {/* Row 2: Time with full range + duration */}
  <div className="flex items-center gap-2 text-sm text-foreground/75 mb-2">
    <Clock className="h-4 w-4" />
    <span className="font-medium">{startTime} – {endTime}</span>
    <span className="text-muted-foreground">({duration})</span>
  </div>
  
  {/* Row 3: Details grid */}
  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{address}</span>
    </div>
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">{employeeName}</span>
    </div>
  </div>
</div>
```

**Current time indicator:** Full design with floating label "Now · 1:55 PM"

---

## Phase 5: Enhanced HoverCard (Premium Detail View)

### Design Structure
```
┌──────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Gradient header
│  [    SERVICE    ]                           │  ← Large type badge
├──────────────────────────────────────────────┤
│  ● Scheduled                                 │  ← Status banner
├──────────────────────────────────────────────┤
│                                              │
│  John & Jane Smith                           │  ← Client (hero)
│                                              │
│  🕐  Friday, Jan 24                          │
│      9:00 AM – 11:00 AM (2h)                 │
│                                              │
│  📍  123 Main Street, Toronto ON             │
│                                              │
│  👤  Maria Garcia                            │
│                                              │
├──────────────────────────────────────────────┤
│  [   Open Details   ]  [ Edit ]              │  ← Actions
└──────────────────────────────────────────────┘
```

### Implementation
```tsx
<HoverCardContent className="w-80 p-0 shadow-2xl border-0 overflow-hidden rounded-xl">
  {/* Gradient Header */}
  <div className={cn(
    "px-4 py-5",
    isVisit 
      ? "bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent" 
      : "bg-gradient-to-br from-info/20 via-info/10 to-transparent"
  )}>
    <Badge className={cn(
      "text-sm px-5 py-2 font-bold tracking-wider shadow-lg",
      isVisit ? "bg-purple-500 text-white" : "bg-info text-white"
    )}>
      {isVisit ? 'VISIT' : 'SERVICE'}
    </Badge>
  </div>
  
  {/* Status Banner */}
  <div className={cn(
    "px-4 py-2.5 flex items-center gap-2.5 border-b",
    statusBannerClass
  )}>
    <span className={cn("w-2.5 h-2.5 rounded-full", statusDotClass)} />
    <span className="font-semibold">{statusLabel}</span>
    {status === 'in-progress' && (
      <span className="text-warning animate-pulse ml-auto">●</span>
    )}
  </div>
  
  {/* Content */}
  <div className="p-5 space-y-4">
    <h4 className="text-lg font-bold">{clientName}</h4>
    
    <div className="space-y-3 text-sm">
      {/* Time details */}
      <div className="flex items-start gap-3">
        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div>
          <p className="font-medium">{formattedDate}</p>
          <p className="text-muted-foreground">{timeRange} ({duration})</p>
        </div>
      </div>
      
      {/* Address */}
      <div className="flex items-start gap-3">
        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
        <p>{address}</p>
      </div>
      
      {/* Assigned staff */}
      <div className="flex items-center gap-3">
        <User className="h-4 w-4 text-muted-foreground" />
        <p className="font-medium">{employeeName}</p>
      </div>
    </div>
  </div>
  
  {/* Actions */}
  <div className="flex gap-2 p-4 bg-muted/20 border-t">
    <Button size="sm" className="flex-1 h-9">Open Details</Button>
    <Button size="sm" variant="outline" className="h-9">Edit</Button>
  </div>
</HoverCardContent>
```

---

## Phase 6: Premium Color System

### Status Colors (Calm, Consistent)
```css
:root {
  /* Scheduled - Professional anticipation (blue) */
  --status-scheduled-bg: 217 91% 60% / 0.10;
  --status-scheduled-text: 217 91% 55%;
  --status-scheduled-dot: 217 91% 60%;
  
  /* In Progress - Warm active attention (amber) */
  --status-inprogress-bg: 38 92% 50% / 0.12;
  --status-inprogress-text: 38 92% 45%;
  --status-inprogress-dot: 38 92% 50%;
  
  /* Completed - Calm success (muted green) */
  --status-completed-bg: 160 60% 40% / 0.08;
  --status-completed-text: 160 60% 35%;
  --status-completed-dot: 160 60% 40% / 0.70;
  
  /* Cancelled - Quiet, de-emphasized (gray) */
  --status-cancelled-bg: 220 10% 50% / 0.06;
  --status-cancelled-text: 220 10% 45%;
  --status-cancelled-dot: 220 10% 50% / 0.50;
}
```

### No Bright Colors Rule
- No saturated primary colors for status
- All backgrounds use alpha transparency (0.06 - 0.12)
- Text colors are desaturated versions
- Gradients are "almost imperceptible"

---

## Phase 7: Interaction & Micro-UX

### Hover Behavior
```css
.schedule-card:hover {
  transform: translateY(-2px) scale(1.005);
  box-shadow: var(--schedule-card-glow), 0 8px 24px rgba(0,0,0,0.08);
}
```

### Click Behavior
**Open right-side drawer (Sheet) instead of modal Dialog**

```tsx
// Replace Dialog with Sheet for job details
<Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
  <SheetContent side="right" className="w-[400px] p-0">
    {/* Job details content */}
  </SheetContent>
</Sheet>
```

### Drag Behavior (Future Enhancement)
- Magnetic snap to 30-minute slots
- Visual guide lines during drag
- Ghost preview of new position

---

## Phase 8: Focus Mode Toggle

### Concept
Single toggle to expand Schedule to full viewport, collapsing sidebar navigation.

### Implementation
```tsx
// In Schedule.tsx
const [focusMode, setFocusMode] = useState(false);

// Toggle button in header
<Button 
  variant="ghost" 
  size="icon"
  onClick={() => setFocusMode(!focusMode)}
  className={cn(
    "h-9 w-9",
    focusMode && "bg-primary/10 text-primary"
  )}
>
  <Expand className="h-4 w-4" />
</Button>

// Pass to layout or use CSS class
<div className={cn("transition-all duration-300", focusMode && "schedule-focus-mode")}>
```

### CSS
```css
.schedule-focus-mode {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: hsl(var(--background));
  padding: 1rem;
  overflow-y: auto;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add premium schedule design tokens, KPI pill classes, enhanced current time indicator styles, focus mode utilities |
| `src/pages/Schedule.tsx` | Refactor header to KPI pills, enhance time indicator with timezone-aware label, unify card architecture, implement Sheet for details, add Focus Mode toggle |

---

## Expected Outcome

**Before:** Generic calendar, flat cards, indistinguishable types, basic interactions

**After:**
- Executive KPI dashboard strip above calendar
- Timezone-accurate current time indicator with floating label
- Unified Service/Visit cards differing ONLY by color
- View-specific progressive disclosure (Month → Week → Day)
- Premium hover cards with large type badges
- Right-side drawer for details (not modal)
- Focus Mode for power users
- Calm, professional color system

**User Perception:**
> "This system is expensive — and it clearly earns it."

