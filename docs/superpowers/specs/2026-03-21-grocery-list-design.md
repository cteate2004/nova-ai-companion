# Grocery List Feature — Design Spec

## Overview

A dedicated grocery list screen in Nova with category grouping, check-off, manual and voice-driven item entry, AirPrint via browser print dialog, and sharing via SMS/email using native `sms:` and `mailto:` URL schemes.

## Data Model

### New table: `grocery_items`

| Column     | Type    | Description                          |
|------------|---------|--------------------------------------|
| id         | INTEGER | Primary key, autoincrement           |
| name       | TEXT    | Item name (e.g. "Milk")              |
| category   | TEXT    | Category for grouping (default "Other") |
| quantity   | TEXT    | Optional quantity/unit (e.g. "2 lbs") |
| checked    | INTEGER | 0 = unchecked, 1 = checked           |
| created_at | TEXT    | Timestamp, default CURRENT_TIMESTAMP  |

### Categories (fixed list, display order)

1. Produce
2. Dairy
3. Meat & Seafood
4. Bakery
5. Frozen
6. Pantry
7. Beverages
8. Snacks
9. Household
10. Other

## Frontend

### New tab: Grocery (🛒)

Added as the 4th tab in the tab bar, shifting Alerts and Settings right. Tab order becomes: Home, Chat, Tasks, Grocery, Alerts, Settings.

### Screen: `GroceryScreen.jsx`

**Layout (top to bottom):**

1. **Header row** — "Grocery List" title + action buttons (Print, Share)
2. **Category sections** — one section per category that has items, in the fixed display order above. Each section has:
   - Section header with category name
   - List of items in that category
3. **Empty state** — "Your grocery list is empty" with icon when no items exist
4. **Clear checked button** — appears at bottom when any items are checked; removes all checked items
5. **FAB (+)** — floating action button to open add form

**Item row:**
- Checkbox (circle, fills with checkmark when checked)
- Item name (strikethrough when checked)
- Quantity badge (if set, shown as muted text after name)
- Delete button (x)

**Add form (bottom sheet modal, same pattern as TasksScreen):**
- Item name input (required)
- Quantity input (optional)
- Category dropdown (defaults to "Other")
- Add button

### Print view

A hidden `<div>` with class `grocery-print` that contains a clean, formatted version of the list grouped by category. Styled with `@media print` CSS rules:
- Hides all app chrome (tab bar, header buttons, FAB)
- Shows only unchecked items (checked items excluded from print)
- Category headers in bold
- Each item as a checkbox line (empty square + name + quantity)
- Compact layout for paper

Triggered by a Print button in the header that calls `window.print()`. On iOS Safari this opens the native AirPrint dialog.

### Share

A Share button in the header opens a small action menu with two options:

- **Text Message** — builds a plain-text version of the unchecked grocery items grouped by category, opens `sms:?body={encoded list}`
- **Email** — same plain-text list, opens `mailto:?subject=Grocery List&body={encoded list}`

Both open the native iOS app (Messages / Mail) with the list pre-filled. User taps send.

## Backend

### API Routes

| Method | Route                   | Description                    |
|--------|-------------------------|--------------------------------|
| GET    | /api/grocery            | Get all grocery items          |
| POST   | /api/grocery            | Add item {name, category, quantity} |
| PATCH  | /api/grocery/:id        | Update item {checked, name, category, quantity} |
| DELETE | /api/grocery/:id        | Delete single item             |
| DELETE | /api/grocery/checked     | Delete all checked items       |

### Database functions

- `getGroceryItems()` — returns all items ordered by category, then name
- `createGroceryItem(name, category, quantity)` — inserts item, returns created row
- `updateGroceryItem(id, updates)` — partial update, returns updated row
- `deleteGroceryItem(id)` — deletes single item
- `clearCheckedGroceryItems()` — deletes all items where checked = 1

## Chat Integration

Nova recognizes grocery-related intents in conversation:

- **Adding items:** "add milk, eggs, and bread to my grocery list"
  - Parses item names from the message
  - Auto-categorizes when possible using a simple keyword map (e.g. milk/cheese/yogurt → Dairy, apples/bananas/lettuce → Produce)
  - Falls back to "Other" if no category match
  - Confirms what was added: "Added milk (Dairy), eggs (Dairy), and bread (Bakery) to your grocery list!"

- **Checking off items:** "check off milk" / "got the eggs"
  - Marks matching items as checked
  - Confirms: "Checked off milk!"

- **Removing items:** "remove bread from grocery list"
  - Deletes matching items
  - Confirms: "Removed bread from your grocery list."

- **Viewing list:** "what's on my grocery list?"
  - Returns the current list grouped by category

Implementation: Add grocery tools to Claude's tool definitions in `claude.js` — `add_grocery_items`, `check_grocery_items`, `remove_grocery_items`, `get_grocery_list`. The auto-categorization logic lives in a category keyword map in `database.js`.

### Category auto-mapping (keyword → category)

```
Produce: apple, banana, orange, lemon, lime, avocado, tomato, potato, onion, garlic,
         lettuce, spinach, kale, carrot, celery, broccoli, pepper, cucumber, mushroom,
         corn, berry, strawberry, blueberry, grape, melon, watermelon, peach, pear,
         mango, pineapple, cilantro, basil, ginger, jalapeño, green onion, zucchini

Dairy: milk, cheese, yogurt, butter, cream, sour cream, eggs, creamer, half and half

Meat & Seafood: chicken, beef, pork, turkey, salmon, shrimp, fish, steak, bacon,
                sausage, ground beef, ham, lamb, crab, lobster, tuna

Bakery: bread, bagel, tortilla, roll, muffin, croissant, bun, pita, cake, donut

Frozen: ice cream, frozen pizza, frozen vegetables, frozen fruit, popsicle,
        frozen dinner, frozen waffle

Pantry: rice, pasta, cereal, flour, sugar, oil, vinegar, sauce, soup, beans, canned,
        peanut butter, jelly, honey, salt, pepper, spice, seasoning, oatmeal, noodle

Beverages: water, juice, soda, coffee, tea, wine, beer, sparkling, kombucha, lemonade

Snacks: chips, crackers, cookies, popcorn, nuts, granola bar, pretzels, candy, trail mix

Household: paper towels, toilet paper, dish soap, laundry detergent, trash bags,
           sponge, aluminum foil, plastic wrap, napkins, cleaning spray, bleach
```

Matching is case-insensitive and uses substring/word matching (e.g. "almond milk" matches "milk" → Dairy, "chicken breast" matches "chicken" → Meat & Seafood).

## Styling

Follows existing app patterns:
- Glass morphism cards for category groups (`.glass-border`)
- Same checkbox style as TaskItem
- Same FAB style as TasksScreen
- Same bottom sheet modal pattern for add form
- Section headers use `.section-title` class
- Print styles scoped to `@media print` to avoid affecting normal view

## Files Changed

| File | Change |
|------|--------|
| `backend/database.js` | Add `grocery_items` table + CRUD functions + category map |
| `backend/server.js` | Add `/api/grocery` routes |
| `backend/claude.js` | Add grocery tools to Claude tool definitions |
| `frontend/src/App.jsx` | Add Grocery tab + GroceryScreen component |
| `frontend/src/components/TabBar.jsx` | Add Grocery tab (🛒) |
| `frontend/src/components/GroceryScreen.jsx` | New — full grocery list screen |
| `frontend/src/styles/global.css` | Grocery screen styles + print styles |
