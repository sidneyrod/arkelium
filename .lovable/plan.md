

## Visual and UX Refinement Plan: Premium Enterprise Schedule

### Phase 1: New Design System Variables (index.css)

**Add dedicated schedule color tokens for semantic clarity:**

```css
:root {
  /* Service vs Visit distinction */
  --schedule-service-bg: 217 91% 60% / 0.08;
  --schedule-service-border: 217 91% 60% / 0.25;
  --schedule-service-glow: 0 0 12px rgba(59, 130, 246, 0.15);
  
  --schedule-visit-bg: 270 60% 60% / 0.06;
  --schedule-visit-border: 270 60% 60% / 0.35;
  --schedule-visit-text: 270 60% 55%;
  
  /* Status-specific accent colors (stronger contrast) */
  --status-scheduled-bg: 217 91% 60% / 0.12;
  --status-scheduled-border: 217 91% 60% / 0.30;
  --status-scheduled-indicator: 217 91% 60%;
  
  --status-inprogress-bg: 38 92% 50% / 0.15;
  --status-inprogress-border: 38 92% 50% / 0.40;
  --status-inprogress-indicator: 38 92% 50%;
  
  --status-completed-bg: 160 84% 39% / 0.10;
  --status-completed-border: 160 84% 39% / 0.25;
  --status-completed-indicator: 160 84% 39%;
  
  --status-cancelled-bg: 220 10% 50% / 0.08;
  --status-cancelled-border: 220 10% 50% / 0.20;
}

.dark {
  /* Enhanced glow for dark mode */
  --schedule-service-glow: 0 0 16px rgba(59, 130, 246, 0.25);
  --schedule-visit-glow: 0 0 16px rgba(168, 85, 247, 0.20);
}
```

---

### Phase 2: Card Architecture Redesign (Schedule.tsx)

**New card wrapper classes for Service vs Visit:**

| Type | Light Mode | Dark Mode |
|------|------------|-----------|
| **Service** | Solid bg, subtle blue glow, prominent shadow | Inner glow, stronger shadow |
| **Visit** | Outlined style, dashed/dotted border, lighter fill | Glass-like with purple accent |

**Implementation approach:**

```tsx
// New utility function for card styling
const getCardStyle = (job: ScheduledJob) => {
  const isVisit = job.jobType === 'visit';
  const status = job.status;
  
  const baseStyles = cn(
    "rounded-xl transition-all duration-200 ease-out cursor-pointer",
    "hover:-translate-y-0.5 hover:scale-[1.01]"
  );
  
  if (isVisit) {
    // VISIT: Outlined, lighter, glass-like
    return cn(baseStyles,
      "bg-background/60 backdrop-blur-sm",
      "border-2 border-dashed border-purple-400/40 dark:border-purple-400/50",
      "shadow-[inset_0_1px_0_rgba(168,85,247,0.1)]",
      "hover:border-purple-400/60 hover:shadow-lg"
    );
  } else {
    // SERVICE: Solid, prominent, with glow
    return cn(baseStyles,
      statusCardStyles[status].bg,
      statusCardStyles[status].border,
      "shadow-[var(--schedule-card-shadow)]",
      "hover:shadow-[var(--schedule-service-glow),var(--shadow-lg)]"
    );
  }
};
```

---

### Phase 3: Status Badge System Enhancement

**Redesigned status badges with left-side indicator stripe:**

```tsx
// Status indicator stripe on left edge of card
<div className={cn(
  "absolute left-0 top-2 bottom-2 w-1 rounded-full",
  status === 'scheduled' && "bg-info",
  status === 'in-progress' && "bg-warning animate-pulse",
  status === 'completed' && "bg-success/70",
  status === 'cancelled' && "bg-muted-foreground/40"
)} />

// Corner status badge (top-right)
<span className={cn(
  "absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider",
  "px-2 py-0.5 rounded-full shadow-sm",
  statusBadgeStyles[status]
)}>
  {statusLabels[status]}
</span>
```

**Status badge color refinement:**

| Status | Background | Text | Effect |
|--------|------------|------|--------|
| Scheduled | `bg-info/15` | `text-info` | Subtle |
| In Progress | `bg-warning/20` | `text-warning` | Pulsing glow |
| Completed | `bg-success/12` | `text-success/80` | Subdued check |
| Cancelled | `bg-muted/50` | `text-muted-foreground/60` | Strikethrough effect |

---

### Phase 4: View-Specific Rendering

#### Month View (Compact, Color-Driven)
- Cards show only: **Icon + Client name + Status dot**
- Color-coded left border indicates type (blue = Service, purple = Visit)
- Status shown as a small colored dot in corner
- Hover for full details

```tsx
// Month view card (ultra-compact)
<div className={cn(
  "flex items-center gap-1.5 px-2 py-1.5 rounded-lg",
  "border-l-3", // Left accent border
  isVisit ? "border-l-purple-500" : "border-l-info",
  isVisit ? "bg-purple-500/5" : statusBgLight[status]
)}>
  {isVisit ? <Eye className="h-3 w-3 text-purple-500" /> : <Sparkles className="h-3 w-3 text-info" />}
  <span className="truncate text-[10px] font-medium">{job.clientName}</span>
  <span className={cn("w-2 h-2 rounded-full ml-auto", statusDotColor[status])} />
</div>
```

#### Week View (Duration-Focused)
- Cards span their duration slots with clear time boundaries
- Show: **Type badge + Client + Time range + Status**
- Stronger visual weight than Month
- Time range displayed prominently

```tsx
// Week view card with duration emphasis
<div className={cn(cardBaseStyles, isVisit ? visitStyles : serviceStyles)}>
  <div className="flex items-center gap-2 mb-1">
    <Badge variant="outline" className={typeBadgeStyles}>
      {isVisit ? 'VISIT' : 'SERVICE'}
    </Badge>
    <span className="text-[10px] font-medium text-muted-foreground">
      {formatTime(job.time)} - {formatTime(endTime)}
    </span>
  </div>
  <p className="font-semibold text-sm truncate">{job.clientName}</p>
  {/* Status stripe on left */}
</div>
```

#### Day View (Immersive, Wide Cards)
- Full-width cards with maximum detail
- Show: **Large type badge + Client + Full time + Duration + Address + Assigned staff**
- Premium card styling with elevation on hover
- Status prominently displayed with icon

```tsx
// Day view card (maximum detail)
<div className={cn(
  "p-4 rounded-xl", 
  cardBaseStyles,
  isVisit ? visitPremiumStyles : servicePremiumStyles
)}>
  {/* Top row: Type + Status */}
  <div className="flex items-center justify-between mb-2">
    <Badge className={cn(
      "text-xs px-3 py-1 font-bold tracking-wide",
      isVisit 
        ? "bg-purple-500/15 text-purple-600 border-purple-400/30" 
        : "bg-info/15 text-info border-info/30"
    )}>
      {isVisit ? 'VISIT' : 'SERVICE'}
    </Badge>
    <Badge className={statusBadgePremiumStyles}>
      {statusIcon} {statusLabel}
    </Badge>
  </div>
  
  {/* Client name - Hero element */}
  <h4 className="text-base font-semibold mb-2">{job.clientName}</h4>
  
  {/* Details grid */}
  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4" />
      <span>{timeRange} ({duration})</span>
    </div>
    <div className="flex items-center gap-2">
      <User className="h-4 w-4" />
      <span>{job.employeeName}</span>
    </div>
  </div>
</div>
```

---

### Phase 5: Enhanced HoverCard Design

**Premium hover card with clear type distinction:**

```tsx
<HoverCardContent className="w-80 p-0 shadow-2xl border-0 overflow-hidden">
  {/* Header with prominent type badge */}
  <div className={cn(
    "p-4",
    isVisit 
      ? "bg-gradient-to-r from-purple-500/20 to-purple-500/5" 
      : "bg-gradient-to-r from-info/20 to-info/5"
  )}>
    <Badge className={cn(
      "text-sm px-4 py-1.5 font-bold tracking-wide shadow-md",
      isVisit 
        ? "bg-purple-500 text-white" 
        : "bg-info text-white"
    )}>
      {isVisit ? 'VISIT' : 'SERVICE'}
    </Badge>
  </div>
  
  {/* Status banner */}
  <div className={cn(
    "px-4 py-2 flex items-center gap-2 border-b",
    statusBannerStyles[status]
  )}>
    {statusIcon}
    <span className="font-semibold">{statusLabel}</span>
    {status === 'in-progress' && <span className="animate-pulse">●</span>}
  </div>
  
  {/* Content */}
  <div className="p-4 space-y-3">
    <h4 className="text-lg font-bold">{job.clientName}</h4>
    
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium">{formatDate(job.date)}</p>
          <p className="text-muted-foreground">{timeRange} ({duration})</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <p>{job.address}</p>
      </div>
      
      <div className="flex items-center gap-3">
        <User className="h-4 w-4 text-muted-foreground" />
        <p className="font-medium">{job.employeeName}</p>
      </div>
    </div>
  </div>
  
  {/* Action footer */}
  <div className="flex gap-2 p-3 bg-muted/30 border-t">
    <Button size="sm" className="flex-1">Open Details</Button>
    <Button size="sm" variant="outline">Edit</Button>
  </div>
</HoverCardContent>
```

---

### Phase 6: Premium Visual Polish

**Add to index.css:**

```css
/* Service card glow effect */
.schedule-card-service {
  @apply relative;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(59, 130, 246, 0.08);
}

.schedule-card-service:hover {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 0 20px rgba(59, 130, 246, 0.12);
}

.dark .schedule-card-service:hover {
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 0 24px rgba(59, 130, 246, 0.20);
}

/* Visit card outlined style */
.schedule-card-visit {
  @apply bg-transparent;
  border: 2px dashed hsl(var(--purple-400) / 0.4);
  background: linear-gradient(
    135deg,
    hsl(270 60% 60% / 0.03) 0%,
    transparent 100%
  );
}

.schedule-card-visit:hover {
  border-color: hsl(var(--purple-500) / 0.6);
  background: linear-gradient(
    135deg,
    hsl(270 60% 60% / 0.08) 0%,
    transparent 100%
  );
}

/* Status indicator pulse for in-progress */
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-indicator-active {
  animation: status-pulse 2s ease-in-out infinite;
}

/* Left accent border for type identification */
.type-indicator-service {
  @apply border-l-4 border-l-info;
}

.type-indicator-visit {
  @apply border-l-4 border-l-purple-500;
}
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add schedule design tokens, card utility classes, glow effects |
| `src/pages/Schedule.tsx` | Refactor card rendering for all views, enhance HoverCard, add type indicators |

### Expected Visual Outcome

**Before:** Flat cards, indistinguishable types, same look across views

**After:**
- **Service cards**: Solid, prominent, blue-accented glow, professional weight
- **Visit cards**: Outlined, dashed border, lighter fill, purple accent
- **Month View**: Color-coded compact pills with status dots
- **Week View**: Duration-focused with time range emphasis
- **Day View**: Immersive wide cards with full detail hierarchy
- **Hover cards**: Large type badge header, strong status indicator, clear hierarchy

The schedule will convey: *"This is a high-value, professional scheduling and revenue control system."*

