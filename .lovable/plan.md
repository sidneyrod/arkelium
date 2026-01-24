
# Schedule Screen UI Improvements Plan

## Summary of Changes
Based on the provided screenshots and requirements, this plan addresses three key improvements:

---

## 1. Relocate KPI Cards to Header Row

### Current State
The KPI pills (Jobs, Completed, In Progress, Today) are on a **separate row** below the navigation/filters row, wasting the highlighted empty space.

### Target State
Move the KPI pills **inline** with the date, filters, and "Add Job" button to consolidate into a single-line header.

### Implementation Details

**File: `src/pages/Schedule.tsx` (lines ~1532-1696)**

Restructure the header from two rows to a single integrated row:

```tsx
{/* Single-Line Executive Header */}
<div className="flex flex-wrap items-center gap-3">
  {/* Calendar Navigation (left) */}
  <div className="flex items-center gap-2">
    <Button variant="outline" size="icon">...</Button>
    <div className="px-4 py-2 ...">January 2026</div>
    <Button variant="outline" size="icon">...</Button>
    <Button variant="outline" size="sm">Today</Button>
  </div>

  {/* KPI Pills (center, moved here) - COMPACT SIZE */}
  <div className="flex items-center gap-2">
    <div className="schedule-kpi-pill-inline schedule-kpi-pill-jobs">
      <span className="schedule-kpi-pill-value">45</span>
      <span className="schedule-kpi-pill-label">Jobs</span>
    </div>
    <div className="schedule-kpi-pill-inline schedule-kpi-pill-completed">
      <span className="schedule-kpi-pill-value">38</span>
      <span className="schedule-kpi-pill-label">Completed</span>
    </div>
    <div className="schedule-kpi-pill-inline schedule-kpi-pill-inprogress">
      <span className="schedule-kpi-pill-value">0</span>
      <span className="schedule-kpi-pill-label">In Progress</span>
    </div>
    <div className="schedule-kpi-pill-inline schedule-kpi-pill-today">
      <span className="schedule-kpi-pill-value">2</span>
      <span className="schedule-kpi-pill-label">Today</span>
    </div>
  </div>

  {/* Filters + Actions (right) */}
  <div className="flex items-center gap-2 ml-auto">
    {/* Type filter, Employee filter, Status filter, View toggles, Focus mode, Add Job */}
  </div>
</div>
```

**File: `src/index.css`**

Add compact inline variant of KPI pills:

```css
.schedule-kpi-pill-inline {
  @apply px-3 py-1.5 rounded-lg flex flex-row items-center gap-2;
  @apply border border-border/30 bg-card/80;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.schedule-kpi-pill-inline .schedule-kpi-pill-value {
  @apply text-sm font-bold;
}

.schedule-kpi-pill-inline .schedule-kpi-pill-label {
  @apply text-[9px] font-medium text-muted-foreground uppercase tracking-wider;
}
```

### Color Refinements
| KPI | Color Styling |
|-----|---------------|
| Jobs | Neutral (gray) - keep as is |
| **Completed** | **Green** (`bg-success/10`, `text-success`) |
| **In Progress** | **Amber/Yellow** (`bg-warning/12`, `text-warning`) |
| Today | Primary brand accent (keep as is) |

---

## 2. Fill Visit Cards (Same Format as Service)

### Current State
From the Month view screenshot, **Visit** cards appear with a **dashed/outlined** style, while **Service** cards are solid and filled.

### Target State
Make Visit cards use the **same solid filled format** as Service cards, only differing by **color accent** (purple for Visit, blue for Service).

### Implementation Details

**File: `src/index.css` (lines ~380-420)**

Update `.schedule-card-visit` to be solid instead of outlined:

```css
/* BEFORE (dashed/outlined) */
.schedule-card-visit {
  border: 2px dashed hsl(270 60% 60% / 0.35);
  background: linear-gradient(...transparent...);
}

/* AFTER (solid filled like Service) */
.schedule-card-visit {
  @apply rounded-xl border;
  background: linear-gradient(
    135deg,
    hsl(270 60% 60% / 0.10) 0%,
    hsl(270 60% 60% / 0.04) 100%
  );
  border-color: hsl(270 60% 60% / 0.25);
  box-shadow: 0 1px 3px rgba(168, 85, 247, 0.08);
}

.schedule-card-visit:hover {
  background: linear-gradient(
    135deg,
    hsl(270 60% 60% / 0.14) 0%,
    hsl(270 60% 60% / 0.06) 100%
  );
  border-color: hsl(270 60% 60% / 0.35);
}
```

**File: `src/pages/Schedule.tsx` (Month view cards ~line 1745)**

Ensure Visit cards use the same filled background approach:

```tsx
// Update Month view card styling
isVisit 
  ? "border-l-[3px] border-l-purple-500 bg-purple-500/10 hover:bg-purple-500/16" 
  : cn("border-l-[3px] border-l-info", statusConfig[job.status].badgeClass),
```

---

## 3. Improve Day View Cards

### Current State
- Client names are truncated/cut off
- Cards feel cramped with insufficient height
- Missing structured hierarchy: Type > Client > User > Time > Status

### Target State
- Increase time slot height from `h-14` (56px) to `h-20` (80px) or dynamic
- Display all information in clear order:
  1. **Type** (SERVICE or VISIT badge)
  2. **Client Name** (never truncated)
  3. **Responsible User**
  4. **Time range**
  5. **Status** (Completed, Cancelled, etc.)

### Implementation Details

**File: `src/pages/Schedule.tsx` (Day view ~lines 2197-2220)**

Increase slot height for better card accommodation:

```tsx
// Change time slot container from h-14 to h-20
<div 
  key={slot.value}
  className={cn(
    "flex gap-3 border-b schedule-grid-line last:border-b-0 h-20 min-w-0",  // h-14 -> h-20
    ...
  )}
>
```

Update card rendering (lines ~2282-2360) with new hierarchy:

```tsx
{/* Day View Card - Full Detail Mode */}
<div className="flex flex-col h-full justify-between overflow-hidden">
  {/* Row 1: Type Badge + Status (aligned right) */}
  <div className="flex items-center justify-between mb-1">
    <Badge variant="outline" className={getTypeBadgeClass(job)}>
      {isVisit ? 'VISIT' : 'SERVICE'}
    </Badge>
    <Badge variant="outline" className={statusConfig[job.status].badgeClass}>
      {statusConfig[job.status].label}
    </Badge>
  </div>
  
  {/* Row 2: Client Name - Hero (never truncated) */}
  <h4 className="font-bold text-base text-foreground leading-tight">
    {job.clientName}
  </h4>
  
  {/* Row 3: Responsible User */}
  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <User className="h-3.5 w-3.5" />
    <span className="font-medium">{job.employeeName}</span>
  </div>
  
  {/* Row 4: Time Range */}
  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <Clock className="h-3.5 w-3.5" />
    <span>{formatTimeDisplay(job.time)} - {formatTimeDisplay(endTime)}</span>
  </div>
</div>
```

Update slot height constant:

```tsx
// Line ~2230: Change slotHeight from 56 to 80
const slotHeight = 80; // h-20 = 80px (was 56 for h-14)
```

**File: `src/index.css`**

Add minimum height protection for Day view cards:

```css
/* Day view card minimum height */
.schedule-event > div {
  min-height: 72px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Schedule.tsx` | 1. Merge KPI pills into header row (lines ~1532-1696) 2. Update Visit card styling in Month view (line ~1745) 3. Increase Day view slot height (lines ~2197-2260) 4. Restructure Day view card content hierarchy |
| `src/index.css` | 1. Add `.schedule-kpi-pill-inline` compact variant 2. Update `.schedule-card-visit` to solid filled style 3. Add Day view card minimum height styles |

---

## Expected Visual Outcome

**Header**: Single-line with navigation, compact KPI pills (green Completed, amber In Progress), filters, and actions

**Month View**: Visit cards now have solid purple fill matching Service card density

**Day View**: Taller time slots (80px) with card hierarchy:
```
┌─────────────────────────────────────────────┐
│ [SERVICE]                      [Completed]  │
│ John Mark                                   │
│ 👤 Sarah Mitchell                           │
│ 🕐 12:00 AM - 1:30 AM                       │
└─────────────────────────────────────────────┘
```
