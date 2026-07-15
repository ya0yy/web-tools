# Base URL History Combobox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the native Base URL datalist with a styled, keyboard-accessible history combobox that supports deleting individual entries.

**Architecture:** Extract deterministic history operations into `curlModifierUtils.ts` so they can be covered by the existing Node test setup. Keep open state, highlighted index, outside-click handling, and rendering inside `CurlModifier.tsx` without introducing another UI dependency.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, lucide-react, Node test runner, Vite.

---

### Task 1: Base URL history operations

**Files:**
- Modify: `src/utils/curlModifierUtils.ts`
- Modify: `src/__tests__/curlModifierUtils.test.ts`

**Step 1: Write the failing tests**

Add tests proving that history filtering is case-insensitive, selecting an entry moves it to the front without duplicates, history is limited to 20 items, and deleting removes only the requested URL.

**Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/__tests__/curlModifierUtils.test.ts`

Expected: FAIL because the new history helper exports do not exist.

**Step 3: Implement minimal helpers**

Add pure helpers for filtering, adding/promoting, and removing Base URL history entries.

**Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/__tests__/curlModifierUtils.test.ts`

Expected: all tests pass.

### Task 2: Styled combobox UI

**Files:**
- Modify: `src/components/CurlModifier.tsx`

**Step 1: Replace native datalist markup**

Render a relative input wrapper, chevron button, and absolute listbox using the tested history helpers.

**Step 2: Add interaction behavior**

Support opening, filtering, mouse selection, ArrowUp/ArrowDown, Enter, Escape, outside click, and individual deletion without clearing the current input.

**Step 3: Run static verification**

Run: `npm run lint`

Expected: TypeScript exits successfully.

### Task 3: Full verification

**Files:**
- Verify: `src/components/CurlModifier.tsx`
- Verify: `src/utils/curlModifierUtils.ts`

**Step 1: Run the production build**

Run: `npm run build`

Expected: Vite production build succeeds.

**Step 2: Verify in a real browser**

Start `npm run dev`, then use Playwright CLI to check desktop and mobile layouts, selection, deletion, filtering, and outside-click closing. Save screenshots under `output/playwright/`.

**Step 3: Review the final diff**

Run: `git diff --check` and `git diff --stat`.

Expected: no whitespace errors and only scoped files are changed.
