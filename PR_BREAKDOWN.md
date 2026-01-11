# PR Breakdown

This document outlines how to split the current changes into smaller, focused pull requests.

## PR 1: Remove action buttons from mobile view

**Files:** `frontend/src/components/WeekView/MobileView.tsx`
**Changes:**

- Remove plus icon button for creating events
- Remove "Idag" (Today) button
- Remove "Uppgifter" (Tasks) button from view mode selector
- Clean up unused props (`onCreateEvent`, `onGoToToday`, `navigate`)

**Rationale:** Simplifies mobile UI by removing redundant action buttons.

---

## PR 2: Add calendar icon to top navigation

**Files:** `frontend/src/App.tsx`
**Changes:**

- Add calendar icon button to top navigation bar (before user icon and task icon)
- Calendar icon navigates to calendar view using last saved view mode
- Update TasksLayout to include calendar icon

**Rationale:** Improves navigation accessibility by adding calendar icon to main navigation.

---

## PR 3: Refactor tasks out of viewMode logic

**Files:** `frontend/src/App.tsx`
**Changes:**

- Remove 'tasks' from ViewMode type
- Create separate `TasksLayout` component
- Update routes to use TasksLayout for `/tasks` route
- Remove tasks-related logic from MainLayout
- Update navigation handlers to exclude tasks

**Rationale:** Separates tasks view from calendar views, making the codebase cleaner and more maintainable.

---

## PR 4: Optimize view mode state management

**Files:** `frontend/src/App.tsx`
**Changes:**

- Read viewMode directly from URL using `useLocation` instead of props
- Remove viewMode prop from MainLayout interface
- Update button active state to use URL-based viewMode
- Optimize useEffect dependencies to reduce unnecessary re-runs

**Rationale:** Improves performance by eliminating prop drilling and reducing re-renders. Button state updates immediately.

---

## PR 5: Fix localStorage to only store calendar views

**Files:** `frontend/src/App.tsx`
**Changes:**

- Ensure localStorage only saves calendar views (day, grid, user, hour)
- Fix calendar icon navigation to use last saved view mode
- Update getDefaultViewPath to handle calendar views only

**Rationale:** Prevents tasks view from overwriting the last calendar view mode in localStorage.

---

## PR Status

✅ **PR 1: Remove action buttons from mobile view** - Pushed to `pr/remove-mobile-action-buttons`
✅ **PR 2: Add calendar icon to top navigation** - Pushed to `pr/add-calendar-icon-navigation`  
✅ **PR 3: Refactor tasks out of viewMode logic** - Pushed to `pr/refactor-tasks-out-of-viewmode`

**Note:** PR 3 already includes the optimizations from PR 4 (reading viewMode from URL) and the localStorage fixes from PR 5 (only storing calendar views). Therefore, PR 4 and PR 5 are not needed as separate PRs.

## Suggested PR Order (for review/merge)

1. PR 1 (UI cleanup) - Simplest, no dependencies - **Ready for review**
2. PR 2 (Navigation) - Independent feature - **Ready for review**  
3. PR 3 (Tasks refactor) - Core architectural change - **Ready for review** (includes PR 4 & PR 5 changes)
