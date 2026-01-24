

# Schedule Screen - Final Fixes

## Overview
Based on the screenshots and requirements, I've identified 4 issues that need to be addressed:

---

## Issue 1: Block Editing for Completed/Cancelled Jobs

**Current Behavior:**  
The Edit button appears for all jobs regardless of status (see line 2749-2753 in Sheet content).

**Required Change:**  
Add a condition to hide the Edit and Delete buttons when `job.status === 'completed'` or `job.status === 'cancelled'`.

**File: `src/pages/Schedule.tsx`**

### Location 1: Sheet Footer (Lines 2748-2764)
```tsx
{/* Edit/Delete only for Admin/Manager AND status is scheduled/in-progress */}
{isAdminOrManager && (selectedJob.status === 'scheduled' || selectedJob.status === 'in-progress') && (
  <>
    <Button variant="outline" size="icon" onClick={() => handleEditJob(selectedJob)}>
      <Pencil className="h-4 w-4" />
    </Button>
    <Button 
      variant="outline" 
      size="icon" 
      className="text-destructive hover:text-destructive"
      onClick={() => handleOpenCancelJob(selectedJob)}
      title="Cancel Job"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </>
)}
```

### Location 2: HoverCard Quick Actions (Lines 2148-2158)
The Week view HoverCard already checks `job.status === 'scheduled'` - keep this consistent.

---

## Issue 2: Full Card Color Fill (No White Backgrounds)

**Problem:**  
The screenshots show cards with only a colored left edge and white/blank backgrounds. The entire card should be filled with color based on status.

**Root Cause:**  
The `schedule-card-service` class uses subtle gradient backgrounds (10% opacity), but when combined with Tailwind's `bg-*` classes, there's a conflict. The actual card rendering in Month view applies `bg-purple-500/12` for Visit but doesn't consistently fill the card for Service.

**Solution:**  
1. Remove the CSS class dependency and directly apply inline background styles
2. Increase opacity values from 10-12% to 20-25% for more visible fills

### File: `src/index.css` - Increase Card Background Visibility

**Service Cards (Lines 265-295):**
```css
.schedule-card-service {
  @apply relative rounded-xl border;
  background: linear-gradient(135deg, hsl(var(--schedule-service-bg) / 0.20) 0%, hsl(var(--schedule-service-bg) / 0.12) 100%);
  /* ... rest unchanged ... */
}
```

**Visit Cards (Lines 299-332):**
```css
.schedule-card-visit {
  @apply relative rounded-xl border;
  background: linear-gradient(135deg, hsl(270 60% 60% / 0.22) 0%, hsl(270 60% 60% / 0.14) 100%);
  /* ... rest unchanged ... */
}
```

### File: `src/pages/Schedule.tsx` - Month View Cards (Line 1747-1754)

**Update the Month view card styling to use stronger fills:**
```tsx
className={cn(
  "text-[10px] px-2 py-1.5 rounded-lg truncate cursor-pointer flex items-center gap-1.5 relative overflow-hidden",
  "transition-all duration-200 ease-out",
  "hover:scale-[1.02] hover:-translate-y-0.5",
  // Full card color fill based on type and status
  isVisit 
    ? "bg-purple-500/20 hover:bg-purple-500/28 border border-purple-500/30 dark:bg-purple-500/22" 
    : cn(
        "border",
        statusConfig[job.status].cardBorderClass,
        // Status-based full fills (no white)
        job.status === 'completed' && "bg-success/20 hover:bg-success/26 border-success/30",
        job.status === 'in-progress' && "bg-warning/20 hover:bg-warning/26 border-warning/30",
        job.status === 'scheduled' && "bg-info/18 hover:bg-info/24 border-info/30",
        job.status === 'cancelled' && "bg-muted/25 hover:bg-muted/35 border-muted-foreground/25"
      ),
  job._isContinuation && "opacity-90"
)}
```

Remove the `border-l-[3px]` and use a full border instead for consistency.

---

## Issue 3: KPI Pills Should Differentiate Service vs Visit

**Current State:**  
KPI pills (Jobs, Completed, In Progress, Today) only show counts, not distinguishing between Service (should be green-ish/blue) and Visit (should be purple).

**Solution:**  
This would require restructuring the `summaryStats` object to track Service and Visit counts separately, then displaying dual-colored pills or split indicators.

**File: `src/pages/Schedule.tsx`**

### Update summaryStats calculation to include type breakdown:
```tsx
const summaryStats = useMemo(() => {
  const now = new Date();
  const startOfMonth = startOfMonth(currentDate);
  const endOfMonth = endOfMonth(currentDate);
  
  const monthJobs = jobs.filter(j => {
    const jobDate = toSafeLocalDate(j.date);
    return jobDate >= startOfMonth && jobDate <= endOfMonth;
  });

  const serviceJobs = monthJobs.filter(j => j.jobType !== 'visit');
  const visitJobs = monthJobs.filter(j => j.jobType === 'visit');

  return {
    total: monthJobs.length,
    totalServices: serviceJobs.length,
    totalVisits: visitJobs.length,
    completed: monthJobs.filter(j => j.status === 'completed').length,
    completedServices: serviceJobs.filter(j => j.status === 'completed').length,
    completedVisits: visitJobs.filter(j => j.status === 'completed').length,
    inProgress: monthJobs.filter(j => j.status === 'in-progress').length,
    inProgressServices: serviceJobs.filter(j => j.status === 'in-progress').length,
    inProgressVisits: visitJobs.filter(j => j.status === 'in-progress').length,
    todayCount: monthJobs.filter(j => isToday(toSafeLocalDate(j.date))).length,
    todayServices: serviceJobs.filter(j => isToday(toSafeLocalDate(j.date))).length,
    todayVisits: visitJobs.filter(j => isToday(toSafeLocalDate(j.date))).length,
  };
}, [jobs, currentDate]);
```

### Update KPI Pill rendering (Lines 1559-1580):
```tsx
{/* Jobs KPI - Split display for Service (blue) + Visit (purple) */}
<div className="schedule-kpi-pill-inline schedule-kpi-pill-jobs flex items-center gap-1.5">
  <div className="flex items-center gap-1">
    <span className="w-2 h-2 rounded-full bg-info" />
    <span className="schedule-kpi-pill-value text-info">{summaryStats.totalServices}</span>
  </div>
  <span className="text-muted-foreground/50">|</span>
  <div className="flex items-center gap-1">
    <span className="w-2 h-2 rounded-full bg-purple-500" />
    <span className="schedule-kpi-pill-value text-purple-600">{summaryStats.totalVisits}</span>
  </div>
  <span className="schedule-kpi-pill-label">Jobs</span>
</div>

{/* Completed KPI - Split Service (green) + Visit (purple) */}
<div className="schedule-kpi-pill-inline schedule-kpi-pill-completed flex items-center gap-1.5">
  <div className="flex items-center gap-1">
    <span className="w-2 h-2 rounded-full bg-success" />
    <span className="schedule-kpi-pill-value text-success">{summaryStats.completedServices}</span>
  </div>
  <span className="text-muted-foreground/50">|</span>
  <div className="flex items-center gap-1">
    <span className="w-2 h-2 rounded-full bg-purple-500" />
    <span className="schedule-kpi-pill-value text-purple-600">{summaryStats.completedVisits}</span>
  </div>
  <span className="schedule-kpi-pill-label">Completed</span>
</div>

{/* Similar pattern for In Progress and Today pills */}
```

---

## Issue 4: Remove Empty Space at Bottom (All Views)

**Problem:**  
The screenshots show significant empty space below the calendar in Week view and Day view.

**Root Cause:**  
- Day view: `minHeight: '500px'` and `maxHeight: 'calc(100vh - 280px)'` leaves gaps
- Week view: `max-h-[calc(100vh-320px)]` and `min-h-[400px]` creates excess space
- Month view: Rows have fixed minimum heights

**Solution:**

### Day View (Line 2188):
```tsx
<div className="relative pb-2 overflow-y-auto overflow-x-hidden" 
     style={{ maxHeight: 'calc(100vh - 220px)', minHeight: 'auto' }}>
```
- Reduce `maxHeight` offset from 280px to 220px
- Remove `minHeight: '500px'` or set to `'auto'`

### Week View (Line 1877):
```tsx
<div className="max-h-[calc(100vh-260px)] min-h-[300px] overflow-y-auto overflow-x-hidden relative">
```
- Change `calc(100vh-320px)` to `calc(100vh-260px)`
- Reduce `min-h-[400px]` to `min-h-[300px]`

### Month View (Line 1724):
```tsx
className={cn(
  "min-h-[80px] p-1.5 border-r border-b schedule-grid-line last:border-r-0 cursor-pointer transition-all duration-150",
  // ... rest unchanged
)}
```
- Reduce `min-h-[90px]` to `min-h-[80px]`

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Schedule.tsx` | 1. Block edit/delete for completed/cancelled (lines 2748-2764) |
| `src/pages/Schedule.tsx` | 2. Update Month view card colors with stronger fills (lines 1747-1756) |
| `src/pages/Schedule.tsx` | 3. Update summaryStats to include type breakdown |
| `src/pages/Schedule.tsx` | 4. Update KPI pills to show Service|Visit split counts |
| `src/pages/Schedule.tsx` | 5. Reduce empty space: Day view (line 2188), Week view (line 1877), Month view (line 1724) |
| `src/index.css` | 6. Increase schedule-card-service and schedule-card-visit opacity from 10% to 20-22% (lines 265-332) |

---

## Expected Visual Outcome

1. **Completed/Cancelled jobs** - No Edit or Delete buttons visible
2. **Card fills** - All cards have solid color backgrounds:
   - Scheduled Service → Blue fill (20% opacity)
   - In Progress Service → Amber/Yellow fill (20% opacity)
   - Completed Service → Green fill (20% opacity)
   - All Visits → Purple fill (22% opacity)
3. **KPI Pills** - Show split counts: `[●12 | ●3] Jobs` where blue dot = Service, purple dot = Visit
4. **No empty space** - Calendar fills available viewport in all views

