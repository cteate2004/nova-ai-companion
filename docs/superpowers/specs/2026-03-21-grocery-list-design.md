# Grocery List Feature — Design Spec

## Overview

A dedicated grocery list screen in Nova with category grouping, check-off, manual add form and voice-driven entry via chat, AirPrint via browser print dialog, and sharing via `navigator.share()` Web Share API (native iOS share sheet) with `sms:`/`mailto:` fallbacks. iOS-only target (PWA on iPhone).

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
| updated_at | TEXT    | Timestamp, updated on changes         |

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

Added as the 4th tab in the tab bar, shifting Alerts and Settings right. Tab order becomes: Home, Chat, Tasks, Grocery, Alerts, Settings (6 tabs). Tab bar uses icon-only display (no labels) to fit on smaller iPhone screens.

### Screen: `GroceryScreen.jsx`

**Layout (top to bottom):**

1. **Header row** — "Grocery List" title + action buttons (Print, Share)
2. **Category sections** — one section per category that has items, in the fixed display order above. Each section has:
   - Section header with category name
   - List of items in that category (unchecked first, then checked, alphabetical within each)
3. **Empty state** — "Your grocery list is empty" with icon when no items exist
4. **Clear checked button** — appears at bottom when any items are checked; removes all checked items
5. **Clear all button** — appears next to clear checked; clears the entire list (with confirmation prompt) for starting a new shopping trip
5. **FAB (+)** — floating action button to open add form

**Item row:**
- Checkbox (circle, fills with checkmark when checked)
- Item name (strikethrough when checked)
- Quantity badge (if set, shown as muted text after name)
- Delete button (x)

**Add form (bottom sheet modal, same pattern as TasksScreen):**
- Item name input (required)
- Quantity input (optional)
- Category dropdown (defaults to "Other", auto-selects based on item name via category map)
- Add button

**Voice entry:** Users add items via voice through the Chat tab (e.g. "add milk and eggs to my grocery list"). No mic button on the Grocery screen itself — the Chat tab already handles voice input and routes to grocery tools.

### Print view

A hidden `<div>` with class `grocery-print` that contains a clean, formatted version of the list grouped by category. Styled with `@media print` CSS rules:
- Hides all app chrome (tab bar, header buttons, FAB)
- Shows only unchecked items (checked items excluded from print)
- Category headers in bold
- Each item as a checkbox line (empty square + name + quantity)
- Compact layout for paper

Triggered by a Print button in the header that calls `window.print()`. On iOS Safari this opens the native AirPrint dialog.

### Share

A Share button in the header. Uses `navigator.share()` (Web Share API) as the primary method — this opens the native iOS share sheet with all available apps (Messages, Mail, Notes, AirDrop, etc.) in one tap. The share payload is a plain-text version of unchecked grocery items grouped by category.

Fallback for browsers without Web Share API support:
- **Text Message** — opens `sms:?body={encoded list}` (iOS only)
- **Email** — opens `mailto:?subject=Grocery List&body={encoded list}`

## Backend

### API Routes

| Method | Route                   | Description                    |
|--------|-------------------------|--------------------------------|
| GET    | /api/grocery            | Get all grocery items          |
| POST   | /api/grocery            | Add item {name, category, quantity} |
| PATCH  | /api/grocery/:id        | Update item {checked, name, category, quantity} |
| DELETE | /api/grocery/:id        | Delete single item             |
| POST   | /api/grocery/clear-checked | Delete all checked items     |
| POST   | /api/grocery/clear-all   | Delete all items               |

Note: clear-checked and clear-all use POST instead of DELETE to avoid route conflicts with the `/:id` param route. These routes must be registered before `/:id` routes.

### Database functions

- `getGroceryItems()` — returns all items ordered by category display order, then checked status (unchecked first), then name
- `createGroceryItem(name, category, quantity)` — inserts item, returns created row
- `updateGroceryItem(id, updates)` — partial update, returns updated row
- `deleteGroceryItem(id)` — deletes single item
- `clearCheckedGroceryItems()` — deletes all items where checked = 1
- `clearAllGroceryItems()` — deletes all items

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

Implementation: Add grocery tools to Claude's tool definitions in `claude.js`. The auto-categorization logic lives in a category keyword map in `database.js`.

### Tool definitions

```json
{
  "name": "add_grocery_items",
  "description": "Add items to the grocery list. Auto-categorizes based on item name.",
  "input_schema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string", "description": "Item name" },
            "quantity": { "type": "string", "description": "Optional quantity/unit" },
            "category": { "type": "string", "description": "Optional category override" }
          },
          "required": ["name"]
        }
      }
    },
    "required": ["items"]
  }
}

{
  "name": "check_grocery_items",
  "description": "Check off items from the grocery list by name.",
  "input_schema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Item names to check off"
      }
    },
    "required": ["items"]
  }
}

{
  "name": "remove_grocery_items",
  "description": "Remove items from the grocery list by name.",
  "input_schema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Item names to remove"
      }
    },
    "required": ["items"]
  }
}

{
  "name": "get_grocery_list",
  "description": "Get the current grocery list.",
  "input_schema": {
    "type": "object",
    "properties": {}
  }
}
```

### Name matching (for check/remove)

Name matching uses case-insensitive `LIKE '%name%'` against the `name` column. If multiple items match, all are affected (e.g. "check off milk" checks off both "milk" and "almond milk"). This matches user expectations — if they want precision they can be specific.

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

Matching is case-insensitive. Multi-word keywords (e.g. "ice cream", "peanut butter") are checked first (longest match wins). Then single-word keywords. First category match in display order wins. Falls back to "Other" if no match.

## UI Behavior

- **Optimistic updates:** Toggle and delete update local state immediately, then call the API. Revert on error (same pattern as TasksScreen).
- **Auto-refresh:** Re-fetch list when the Grocery tab becomes active to pick up items added via chat.

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
