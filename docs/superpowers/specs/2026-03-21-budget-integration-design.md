# Nova — Budget Pro Integration

**Date:** 2026-03-21
**Status:** Draft

## Problem

The user manages a monthly budget in Budget Pro (PHP/MySQL app on Hostinger shared hosting at https://ctdevbudget.com). They want Nova to read and update budget data via natural conversation — listing items, marking payments, adding items, and showing summaries.

## Approach

Nova's backend connects to Budget Pro's existing REST API over HTTPS using an API key for authentication. A small auth bypass is added to Budget Pro so Nova doesn't need to manage PHP sessions.

**Why direct MySQL wasn't chosen:** The MySQL database runs on Hostinger's shared hosting (localhost-only access). This VPS cannot connect directly.

## Scope

Five capabilities, all chat-driven (no frontend changes):

| # | Capability | Tool Name | Budget Pro Endpoint |
|---|-----------|-----------|-------------------|
| 1 | List current month's budget items | `get_budget_items` | GET `/api/budgets.php` + GET `/api/budget-items.php` |
| 2 | Mark item as paid | `mark_budget_item_paid` | PATCH `/api/budget-items.php` |
| 3 | Upcoming/overdue bills (7-day window) | `get_upcoming_bills` | GET `/api/dashboard.php?action=upcoming` |
| 4 | Add new budget item | `add_budget_item` | POST `/api/budget-items.php` |
| 5 | Budget summary (totals, remaining) | `get_budget_summary` | GET `/api/budgets.php` + GET `/api/budget-items.php` |

## Architecture

```
User (chat) → Claude → executeTool() → budget.js → HTTPS → Budget Pro API
                                                          ↓
                                                    MySQL (Hostinger)
```

## Budget Pro Changes

### 1. Add API key constant to `config.php`

```php
define('NOVA_API_KEY', '<generated-key>');
```

### 2. Create `includes/api_auth.php`

Checks for `X-API-Key` header. If it matches `NOVA_API_KEY`, sets `$_SESSION['user_id']` to the cliftont user's ID, bypassing the normal login check. Only applies when the header is present — normal session auth is unaffected.

```php
<?php
if (isset($_SERVER['HTTP_X_API_KEY']) && $_SERVER['HTTP_X_API_KEY'] === NOVA_API_KEY) {
    $_SESSION['user_id'] = <cliftont_user_id>;
    $_SESSION['is_admin'] = 0;
}
```

### 3. Include `api_auth.php` in each API endpoint

Add `require_once __DIR__ . '/../includes/api_auth.php';` after the existing config/db includes in each API file Nova will call:
- `api/budgets.php`
- `api/budget-items.php`
- `api/dashboard.php`

## Nova Backend Changes

### 1. New file: `backend/budget.js`

HTTP client module that wraps Budget Pro API calls. Uses Node's built-in `fetch`.

**Configuration:**
- `BUDGET_API_URL` — base URL (https://ctdevbudget.com)
- `BUDGET_API_KEY` — API key (from `.env`)

**Functions:**

#### `getCurrentBudgetId()`
- GET `/api/budgets.php`
- Finds budget where `budget_month` matches current month (YYYY-MM-01)
- Returns budget ID or null

#### `getBudgetItems()`
- Calls `getCurrentBudgetId()` then GET `/api/budget-items.php?budget_id=<id>`
- Returns array of items with: description, amount, actual_amount, due_date, is_paid, paid_date, category, account

#### `markItemPaid(itemId, actualAmount)`
- PATCH `/api/budget-items.php` with `id=<itemId>&is_paid=1&paid_date=<today>&actual_amount=<amount>`
- Returns success/failure

#### `getUpcoming()`
- GET `/api/dashboard.php?action=upcoming`
- Returns items due within 7 days

#### `addBudgetItem(budgetId, description, amount, dueDate, itemType, categoryId, accountId)`
- POST `/api/budget-items.php`
- Creates new item in specified budget
- Returns created item

#### `getBudgetSummary()`
- Calls `getBudgetItems()` and computes:
  - Total budgeted income / expenses
  - Total actual income / expenses
  - Remaining (budgeted - actual for expenses)
  - Count of paid vs unpaid items
- Returns summary object

### 2. Modified: `backend/claude.js`

**Add 5 tool definitions to `ALWAYS_TOOLS`:**

```javascript
{
  name: 'get_budget_items',
  description: 'Get all budget items for the current month including bills, income, and expenses with their amounts, due dates, and paid status',
  input_schema: { type: 'object', properties: {}, required: [] }
}

{
  name: 'mark_budget_item_paid',
  description: 'Mark a budget item as paid. Use get_budget_items first to find the item ID.',
  input_schema: {
    type: 'object',
    properties: {
      item_id: { type: 'number', description: 'The budget item ID' },
      actual_amount: { type: 'number', description: 'The actual amount paid (if different from budgeted)' }
    },
    required: ['item_id']
  }
}

{
  name: 'get_upcoming_bills',
  description: 'Get bills and expenses due in the next 7 days',
  input_schema: { type: 'object', properties: {}, required: [] }
}

{
  name: 'add_budget_item',
  description: 'Add a new item to the current month budget',
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'Item description (e.g. "Electric bill")' },
      amount: { type: 'number', description: 'Budgeted amount' },
      due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
      item_type: { type: 'string', enum: ['income', 'expense'], description: 'Whether this is income or expense' }
    },
    required: ['description', 'amount', 'item_type']
  }
}

{
  name: 'get_budget_summary',
  description: 'Get a summary of the current month budget showing totals for budgeted vs actual income and expenses, and remaining balance',
  input_schema: { type: 'object', properties: {}, required: [] }
}
```

**Add cases to `executeTool()` switch:**

```javascript
case 'get_budget_items':
  return await budget.getBudgetItems();
case 'mark_budget_item_paid':
  return await budget.markItemPaid(input.item_id, input.actual_amount);
case 'get_upcoming_bills':
  return await budget.getUpcoming();
case 'add_budget_item':
  return await budget.addBudgetItem(input);
case 'get_budget_summary':
  return await budget.getBudgetSummary();
```

### 3. Modified: `backend/.env`

Add:
```
BUDGET_API_URL=https://ctdevbudget.com
BUDGET_API_KEY=<generated-key>
```

## Conversation Examples

**List items:**
> "What's on my budget this month?"
> Nova calls `get_budget_items`, responds: "Here's your March budget — you have 15 items totaling $3,200. Rent ($1,500) is paid, electric ($120) is due the 25th..."

**Mark paid:**
> "I just paid the electric bill, it was $118"
> Nova calls `get_budget_items` to find the electric item ID, then `mark_budget_item_paid` with actual_amount=118

**Upcoming:**
> "What bills are coming up?"
> Nova calls `get_upcoming_bills`, lists items due in next 7 days

**Add item:**
> "Add a $50 expense for car wash on the 28th"
> Nova calls `add_budget_item` with description="Car wash", amount=50, due_date="2026-03-28", item_type="expense"

**Summary:**
> "How's my budget looking?"
> Nova calls `get_budget_summary`, responds with totals and remaining balance

## Security

- API key is a long random string, transmitted over HTTPS only
- API key grants access only to the cliftont user account — not admin
- No session cookies or credentials stored in Nova
- Budget Pro's existing CSRF/session auth remains intact for browser access

## Out of Scope

- No Nova frontend changes (all via chat)
- No budget creation (use Budget Pro UI for that)
- No recurring item management
- No debt tracking integration
- No account balance updates
