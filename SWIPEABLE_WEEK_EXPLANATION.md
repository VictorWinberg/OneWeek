# Swipeable Week Implementation - Detailed Explanation

## Architecture Overview

The swipeable week feature uses a **three-panel carousel pattern** where three weeks are rendered side-by-side and CSS transforms are used to slide between them.

## Component Structure

```
MobileView
└── SwipeableWeekContainer (manages swipe logic & layout)
    └── Render Prop (called 3x for prev/current/next weeks)
        └── DndContext + Header + Content (full mobile view)
```

## How It Works

### 1. **SwipeableWeekContainer** - The Core Container

**Layout Strategy:**

- Creates a horizontal flex container with **3 week panels** side-by-side
- Layout: `[Previous Week] [Current Week] [Next Week]`
- Each panel is exactly `containerWidth` pixels wide
- Total container width: `containerWidth * 3`

**Transform Logic:**

```typescript
baseOffset = -containerWidth  // Start position showing current week
transformX = baseOffset + swipeState.offsetX  // Add swipe offset
```

- **Default position**: `translateX(-containerWidth)` shows the middle (current) week
- **Swipe right** (positive offset): Reveals previous week
- **Swipe left** (negative offset): Reveals next week

**Data Fetching:**

- Fetches events for all 3 weeks simultaneously using `useWeekEvents`
- Pre-renders all weeks for smooth transitions
- Each week position gets its own `WeekData` with date, weekDays, blocks, isLoading

### 2. **useSwipeNavigation Hook** - Touch Event Handler

**Touch Detection:**

1. **Touch Start**: Records initial touch position
2. **Touch Move**:
   - Requires minimum 10px horizontal movement to start
   - Cancels if vertical movement > 50px (prevents conflicts with scrolling)
   - Updates `offsetX` state as user drags
3. **Touch End**:
   - If swipe distance ≥ 100px threshold → triggers navigation
   - Calls `onPrevWeek()` or `onNextWeek()` callback
   - Resets offset after animation

**Swipe Prevention:**

- Disabled if `activeBlock` exists (event being dragged)
- Disabled if touching buttons/links/interactive elements
- Uses `touchAction: 'pan-y'` to allow vertical scrolling

### 3. **MobileView** - Content Rendering

**Render Prop Pattern:**

- `SwipeableWeekContainer` calls its `children` function 3 times
- Each call receives different `WeekData` (prev/current/next)
- Same component structure rendered 3 times with different data

**Drag and Drop:**

- Uses `useWeekEvents(selectedDate)` to get current week's blocks
- `useMobileDragAndDrop` hook manages drag state
- `activeBlock` tracked at MobileView level

## Data Flow

```
1. User swipes right
   ↓
2. useSwipeNavigation updates offsetX
   ↓
3. SwipeableWeekContainer applies transform: translateX(baseOffset + offsetX)
   ↓
4. User releases finger
   ↓
5. If threshold met → onPrevWeek() called
   ↓
6. Parent updates selectedDate in store
   ↓
7. SwipeableWeekContainer detects date change
   ↓
8. Resets transform to show new current week centered
   ↓
9. Fetches new adjacent weeks (prev/next of new current)
```

## Issues Identified

### 🔴 **Critical Issue #1: Drag and Drop Block Mismatch**

**Problem:**

```typescript
// MobileView.tsx line 44
const { data: currentWeekBlocks = [] } = useWeekEvents(selectedDate);

// MobileView.tsx line 50
const { activeBlock: currentActiveBlock, ... } = useMobileDragAndDrop(
  currentWeekBlocks,  // ← Always uses CURRENT week's blocks
  { updateEventTime, moveEvent }
);

// But render prop receives blocks from ANY week position
{({ date, weekDays, blocks, isLoading }) => {
  // blocks could be from prev/current/next week!
  // But drag handlers only know about currentWeekBlocks
}}
```

**Impact:**

- When viewing previous/next week panels, drag and drop won't work correctly
- `handleDragStart` tries to find block in `currentWeekBlocks`, but the block might be from a different week
- Drag overlay might show wrong data or fail to find the block

**Solution:**

- Use the `blocks` from the render prop for drag and drop, not `currentWeekBlocks`
- But hooks can't be called conditionally inside render props
- **Better approach**: Create drag handlers that work with any blocks array, or merge all three weeks' blocks

### 🟡 **Issue #2: Multiple DndContext Instances**

**Problem:**

- Each week panel (prev/current/next) creates its own `<DndContext>`
- All three share the same `sensors` and `handleDragStart`/`handleDragEnd` from parent
- This could cause conflicts if multiple contexts try to handle the same drag

**Impact:**

- Potential race conditions
- Drag events might fire multiple times
- Unclear which context owns the drag

**Solution:**

- Only create one DndContext at MobileView level, outside SwipeableWeekContainer
- Or ensure only the visible week's context is active

### 🟡 **Issue #3: Container Width Initialization**

**Problem:**

```typescript
const [containerWidth, setContainerWidth] = useState(0);
// Initially 0, updated in useEffect
```

**Impact:**

- On first render, `containerWidth = 0`
- Transform calculations: `width: ${0 * 3}px` = `0px`
- `transformX = -0 + offsetX` = incorrect positioning
- Only fixes after resize event fires

**Solution:**

- Use `ResizeObserver` or measure immediately on mount
- Add fallback/default width
- Show loading state until width is measured

### 🟡 **Issue #4: Touch Event Conflicts**

**Problem:**

- Touch events attached to container, but buttons inside might capture events
- `touchAction: 'pan-y'` allows vertical scrolling, but horizontal swipes might conflict
- Event cards have `[data-event-card]` check, but other interactive elements might not

**Impact:**

- Swipes might not trigger on certain areas
- Button clicks might be delayed or prevented
- Scrolling might be blocked during swipe attempts

### 🟢 **Issue #5: Performance Considerations**

**Problem:**

- Three complete week views rendered simultaneously
- Each includes header, view mode buttons, and full content
- All three fetch data from API simultaneously

**Impact:**

- Higher memory usage
- More DOM nodes
- More API calls on initial load

**Mitigation:**

- React Query caching helps
- Only visible week is interactive
- Consider lazy loading adjacent weeks

### 🟢 **Issue #6: Date Change Flicker Prevention**

**Current Implementation:**

```typescript
const dateChanged = prevSelectedDate.getTime() !== selectedDate.getTime();
const effectiveOffsetX = dateChanged && !isDragging && !isAnimating ? 0 : swipeState.offsetX;
```

**How it works:**

- When date changes, temporarily ignores swipe offset
- Prevents flicker during transition
- Uses `useLayoutEffect` for synchronous updates

**Potential Issue:**

- If user swipes very quickly, might see brief flicker
- Race condition between date update and swipe reset

## Recommendations

### Priority 1: Fix Drag and Drop

1. Merge all three weeks' blocks for drag and drop
2. Or create a unified block lookup that searches all weeks
3. Ensure `activeBlock` matches the actual week being viewed

### Priority 2: Single DndContext

- Move DndContext outside SwipeableWeekContainer
- Wrap entire swipeable container, not individual weeks

### Priority 3: Container Width

- Add ResizeObserver for immediate measurement
- Show skeleton/loading until width is known

### Priority 4: Performance

- Consider virtualizing or lazy loading adjacent weeks
- Debounce resize events
- Memoize expensive calculations

## Code Flow Diagram

```
User Touch
    ↓
useSwipeNavigation.handleTouchStart
    ↓ (if valid swipe)
useSwipeNavigation.handleTouchMove
    ↓ (updates offsetX)
SwipeableWeekContainer transform
    ↓ (visual feedback)
User Releases
    ↓ (if threshold met)
onPrevWeek/onNextWeek callback
    ↓
Parent updates selectedDate
    ↓
SwipeableWeekContainer detects change
    ↓
Resets transform + fetches new weeks
```

## Testing Scenarios

1. ✅ Swipe right → previous week
2. ✅ Swipe left → next week
3. ✅ Swipe during event drag → should be disabled
4. ✅ Swipe on button → should not trigger
5. ✅ Rapid swipes → should handle gracefully
6. ❌ Drag event from previous week panel → might fail
7. ❌ Container width = 0 on mount → incorrect layout
8. ✅ Vertical scroll during horizontal swipe attempt → should work
