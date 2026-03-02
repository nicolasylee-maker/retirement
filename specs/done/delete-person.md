# Spec: Delete Person

## Description

Expose the existing `handleDeleteUser` function via a "Delete Person" menu item in the header actions dropdown. The handler already exists and is fully implemented; this spec covers only the UI wire-up.

## Acceptance Criteria

1. A "Delete Person" button appears in the header actions menu, **below** "Delete Plan", inside the same red-danger section.
2. The button is **hidden** when `users.length <= 1` (cannot delete the last person), matching the existing "Delete Plan" hide pattern.
3. Clicking the button calls `handleDeleteUser`, which:
   - Shows a confirmation dialog: `Delete "${name}" and all their scenarios?`
   - On confirm: removes the user, switches `currentUserId` to the first remaining user, navigates to their dashboard.
   - On cancel: does nothing.
4. No changes to engine logic, data shape, or test files required.

## Edge Cases

- **Only one user**: button is not rendered at all.
- **User has multiple scenarios**: all scenarios are deleted with the user (existing behavior — no change needed).
- **Deleted user was current user**: auto-switch to `users[0]` (existing behavior — no change needed).

## Files to Modify

| File | Change |
|------|--------|
| `src/App.jsx` | Add "Delete Person" `<button>` in the menu JSX, inside the existing `users.length > 1` danger-zone block |

## Files to Create

None.

## Dependencies

- `handleDeleteUser` (already implemented at `App.jsx:189`)

## Out of Scope

- Any UI for deleting individual plans independent of deleting the person (that's "Delete Plan", already present)
- Undo / soft-delete
- Bulk-delete multiple people at once
