# Budget Pro Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Nova to Budget Pro's REST API so users can list, pay, add, and summarize budget items via chat.

**Architecture:** Nova's backend (`budget.js`) calls Budget Pro's PHP API over HTTPS using an API key header. Budget Pro gets a small auth bypass (`api_auth.php`) that sets the user session from the API key. Five Claude tools are added to `claude.js`.

**Tech Stack:** Node.js (fetch), PHP (Budget Pro), MySQL (Hostinger-hosted)

**Spec:** `docs/superpowers/specs/2026-03-21-budget-integration-design.md`

---

### Task 1: Look up cliftont user ID from Budget Pro

We need the numeric user_id for the API key auth bypass. Since we can't query MySQL directly, we'll use the Budget Pro login endpoint or check the code.

**Files:**
- Read: `/root/budget-pro/public_html/api/settings.php` (has user lookup)

- [ ] **Step 1: Get the user ID**

SSH into Hostinger or use the Budget Pro app to find the numeric `users.id` for username `cliftont`. If not possible directly, we'll add a temporary endpoint or check the login flow. Alternatively, curl the login endpoint:

```bash
curl -s -c /tmp/bp-cookies.txt -X POST https://ctdevbudget.com/api/auth.php \
  -d 'username=cliftont&password=PASSWORD_HERE' \
  && curl -s -b /tmp/bp-cookies.txt https://ctdevbudget.com/api/settings.php | jq '.user_id'
```

If the user doesn't know the ID, we can add a temporary lookup in `api_auth.php` that queries by username on first use.

- [ ] **Step 2: Note the user ID for use in Task 2**

Record the numeric ID (likely 1 or 2) for the `api_auth.php` file.

---

### Task 2: Generate API key and add to Budget Pro config

**Files:**
- Modify: `/root/budget-pro/public_html/config.php` (add NOVA_API_KEY constant after line 14)

- [ ] **Step 1: Generate a secure random API key**

```bash
openssl rand -hex 32
```

Save the output — it will be used in both Budget Pro and Nova.

- [ ] **Step 2: Add the API key to Budget Pro's config.php**

Add after line 14 (after `ANOMALY_THRESHOLD_PERCENT`):

```php
define('NOVA_API_KEY', '<the-generated-key>');
```

- [ ] **Step 3: Commit**

```bash
cd /root/budget-pro && git add public_html/config.php && git commit -m "feat: add NOVA_API_KEY for Nova integration"
```

---

### Task 3: Create api_auth.php in Budget Pro

**Files:**
- Create: `/root/budget-pro/public_html/includes/api_auth.php`

- [ ] **Step 1: Create the auth bypass file**

```php
<?php
// API key authentication for Nova integration.
// Must be included AFTER functions.php (which loads config.php and calls session_start()).
// When X-API-Key header matches NOVA_API_KEY, sets session user context
// so existing isLoggedIn()/getCurrentUserId() checks pass transparently.

if (
    isset($_SERVER['HTTP_X_API_KEY'])
    && defined('NOVA_API_KEY')
    && hash_equals(NOVA_API_KEY, $_SERVER['HTTP_X_API_KEY'])
) {
    $_SESSION['user_id'] = <CLIFTONT_USER_ID>;
    $_SESSION['is_admin'] = 0;
}
```

Replace `<CLIFTONT_USER_ID>` with the actual numeric ID from Task 1.

- [ ] **Step 2: Commit**

```bash
cd /root/budget-pro && git add public_html/includes/api_auth.php && git commit -m "feat: add API key auth bypass for Nova"
```

---

### Task 4: Include api_auth.php in Budget Pro API endpoints

**Files:**
- Modify: `/root/budget-pro/public_html/api/budgets.php`
- Modify: `/root/budget-pro/public_html/api/budget-items.php`
- Modify: `/root/budget-pro/public_html/api/dashboard.php`
- Modify: `/root/budget-pro/public_html/api/categories.php`
- Modify: `/root/budget-pro/public_html/api/accounts.php`

- [ ] **Step 1: Add the include to all 5 API files**

In each file, add `require_once __DIR__ . '/../includes/api_auth.php';` immediately **after** the `require_once functions.php` line and **before** the `isLoggedIn()` check. This is critical — `api_auth.php` needs `session_start()` (loaded via functions.php chain) and must set `$_SESSION['user_id']` before `isLoggedIn()` runs.

**budgets.php** — insert after line 2 (before the blank line and `if (!isLoggedIn())` on line 4):
```php
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/api_auth.php';
```

**budget-items.php, dashboard.php, categories.php, accounts.php** — insert after line 2 (before `isLoggedIn()` check on line 3):
```php
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/api_auth.php';
if (!isLoggedIn()) { ...
```

- [ ] **Step 2: Commit**

```bash
cd /root/budget-pro && git add public_html/api/budgets.php public_html/api/budget-items.php public_html/api/dashboard.php public_html/api/categories.php public_html/api/accounts.php && git commit -m "feat: include api_auth.php in API endpoints for Nova access"
```

---

### Task 5: Patch dashboard.php to include overdue + remove LIMIT

**Files:**
- Modify: `/root/budget-pro/public_html/api/dashboard.php`

- [ ] **Step 1: Update the non-admin query to include overdue unpaid items and remove LIMIT 5**

Replace lines 16-20 (the non-admin upcoming query):

```php
    } else {
        $rows = db()->fetchAll("SELECT bi.*, c.category_name as category FROM budget_items bi
          JOIN budgets b ON b.id=bi.budget_id
          JOIN categories c ON c.id=bi.category_id
          WHERE b.user_id=? AND bi.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
          ORDER BY bi.due_date LIMIT 5", [$uid]);
    }
```

With:

```php
    } else {
        $rows = db()->fetchAll("SELECT bi.*, c.category_name as category FROM budget_items bi
          JOIN budgets b ON b.id=bi.budget_id
          JOIN categories c ON c.id=bi.category_id
          WHERE b.user_id=? AND bi.is_paid = 0
            AND (bi.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                 OR bi.due_date < CURDATE())
          ORDER BY bi.due_date ASC", [$uid]);
    }
```

- [ ] **Step 2: Commit**

```bash
cd /root/budget-pro && git add public_html/api/dashboard.php && git commit -m "fix: upcoming bills includes overdue unpaid, removes LIMIT 5"
```

---

### Task 6: Deploy Budget Pro changes to Hostinger

**Files:**
- All modified files from Tasks 2-5

- [ ] **Step 1: Push or upload changes to Hostinger**

The Budget Pro code at `/root/budget-pro` needs to be deployed to the live Hostinger hosting. The deployment method depends on the user's setup (git push, SFTP, rsync, Hostinger file manager, etc.).

```bash
# If using rsync over SSH (port 65002):
rsync -avz --include='public_html/config.php' \
  --include='public_html/includes/api_auth.php' \
  --include='public_html/api/budgets.php' \
  --include='public_html/api/budget-items.php' \
  --include='public_html/api/dashboard.php' \
  --include='public_html/api/categories.php' \
  --include='public_html/api/accounts.php' \
  --exclude='*' \
  /root/budget-pro/ user@hostinger-server:/path/to/budget-pro/
```

- [ ] **Step 2: Verify API key auth works**

```bash
curl -s -H "X-API-Key: <the-generated-key>" https://ctdevbudget.com/api/budgets.php | jq .
```

Expected: JSON array of budgets (not `{"error":"Unauthorized"}`).

---

### Task 7: Add budget env vars to Nova

**Files:**
- Modify: `/opt/nova/backend/.env` (append 2 lines)

- [ ] **Step 1: Add BUDGET_API_URL and BUDGET_API_KEY to .env**

Append to `/opt/nova/backend/.env`:

```
BUDGET_API_URL=https://ctdevbudget.com
BUDGET_API_KEY=<the-same-key-from-task-2>
```

- [ ] **Step 2: Verify env is loaded**

No commit needed (.env is gitignored). Verify it loads:

```bash
cd /opt/nova/backend && node -e "require('dotenv').config(); console.log(process.env.BUDGET_API_URL)"
```

Expected: `https://ctdevbudget.com`

---

### Task 8: Create backend/budget.js

**Files:**
- Create: `/opt/nova/backend/budget.js`

- [ ] **Step 1: Create the budget module**

```javascript
const BUDGET_API_URL = process.env.BUDGET_API_URL;
const BUDGET_API_KEY = process.env.BUDGET_API_KEY;

const headers = { 'X-API-Key': BUDGET_API_KEY };

async function apiFetch(path, options = {}) {
  const url = `${BUDGET_API_URL}${path}`;
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Budget API returned non-JSON response (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error || `Budget API error: ${res.status}`);
  }
  return data;
}

async function getCurrentBudgetId() {
  const data = await apiFetch('/api/budgets.php');
  const budgets = data.items || data.budgets || data;
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const current = (Array.isArray(budgets) ? budgets : []).find(
    (b) => b.budget_month && b.budget_month.startsWith(prefix)
  );

  if (!current) {
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    throw new Error(`No budget found for ${monthName}. Create one in Budget Pro first.`);
  }
  return current.id;
}

async function getBudgetItems() {
  const budgetId = await getCurrentBudgetId();
  const data = await apiFetch(`/api/budget-items.php?budget_id=${budgetId}`);
  return data.items || data;
}

async function markItemPaid(itemId, actualAmount) {
  const params = new URLSearchParams({ id: itemId, is_paid: '1', paid_date: new Date().toISOString().slice(0, 10) });
  if (actualAmount !== undefined && actualAmount !== null) {
    params.set('actual_amount', String(actualAmount));
  }
  const data = await apiFetch('/api/budget-items.php', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  return data;
}

async function getUpcoming() {
  const data = await apiFetch('/api/dashboard.php?action=upcoming');
  return data.items || data;
}

async function getCategories() {
  const data = await apiFetch('/api/categories.php');
  return data.items || data.categories || data;
}

async function getAccounts() {
  const data = await apiFetch('/api/accounts.php');
  return data.items || data.accounts || data;
}

function fuzzyMatch(list, nameField, query) {
  if (!query) return list[0];
  const lower = query.toLowerCase();
  return (
    list.find((item) => item[nameField].toLowerCase() === lower) ||
    list.find((item) => item[nameField].toLowerCase().includes(lower)) ||
    list[0]
  );
}

async function addBudgetItem({ description, amount, due_date, item_type, category, account }) {
  const budgetId = await getCurrentBudgetId();

  const [categories, accounts] = await Promise.all([getCategories(), getAccounts()]);

  const matchedCategory = fuzzyMatch(
    Array.isArray(categories) ? categories : [],
    'category_name',
    category
  );
  const matchedAccount = fuzzyMatch(
    Array.isArray(accounts) ? accounts : [],
    'account_name',
    account
  );

  if (!matchedCategory) throw new Error('No categories found in Budget Pro. Create one first.');
  if (!matchedAccount) throw new Error('No accounts found in Budget Pro. Create one first.');

  // Default due_date to last day of current month
  let dueDate = due_date;
  if (!dueDate) {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    dueDate = lastDay.toISOString().slice(0, 10);
  }

  const params = new URLSearchParams({
    budget_id: String(budgetId),
    item_type: item_type === 'income' ? 'income' : 'expense',
    account_id: String(matchedAccount.id),
    category_id: String(matchedCategory.id),
    amount: String(amount),
    due_date: dueDate,
    description: description || '',
  });

  const data = await apiFetch('/api/budget-items.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  return { created: true, id: data.id, description, amount, due_date: dueDate, item_type, category: matchedCategory.category_name, account: matchedAccount.account_name };
}

async function getBudgetSummary() {
  const items = await getBudgetItems();
  const list = Array.isArray(items) ? items : [];

  const summary = {
    total_budgeted_income: 0,
    total_budgeted_expenses: 0,
    total_actual_income: 0,
    total_actual_expenses: 0,
    paid_count: 0,
    unpaid_count: 0,
    items_count: list.length,
  };

  for (const item of list) {
    const amt = parseFloat(item.amount) || 0;
    const actual = parseFloat(item.actual_amount) || 0;
    const isPaid = item.is_paid == 1;

    if (item.item_type === 'income') {
      summary.total_budgeted_income += amt;
      summary.total_actual_income += actual;
    } else {
      summary.total_budgeted_expenses += amt;
      summary.total_actual_expenses += actual;
    }

    if (isPaid) summary.paid_count++;
    else summary.unpaid_count++;
  }

  summary.net_budgeted = summary.total_budgeted_income - summary.total_budgeted_expenses;
  summary.net_actual = summary.total_actual_income - summary.total_actual_expenses;
  summary.remaining_expenses = summary.total_budgeted_expenses - summary.total_actual_expenses;

  return summary;
}

module.exports = { getBudgetItems, markItemPaid, getUpcoming, addBudgetItem, getBudgetSummary };
```

- [ ] **Step 2: Verify module loads without errors**

```bash
cd /opt/nova/backend && node -e "require('dotenv').config(); const b = require('./budget'); console.log('budget.js loaded OK');"
```

Expected: `budget.js loaded OK`

- [ ] **Step 3: Commit**

```bash
cd /opt/nova && git add backend/budget.js && git commit -m "feat: add budget.js module for Budget Pro API integration"
```

---

### Task 9: Add budget tools to claude.js

**Files:**
- Modify: `/opt/nova/backend/claude.js`

- [ ] **Step 1: Add the budget require at the top of claude.js**

After line 6 (`const db = require('./database');`), add:

```javascript
const budget = require('./budget');
```

- [ ] **Step 2: Add 5 budget tool definitions to ALWAYS_TOOLS**

Before the closing `];` of `ALWAYS_TOOLS` (line 236), add:

```javascript
  {
    name: 'get_budget_items',
    description: 'Get all budget items for the current month including bills, income, and expenses with their amounts, due dates, and paid status.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mark_budget_item_paid',
    description: 'Mark a budget item as paid. Use get_budget_items first to find the item ID.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'number', description: 'The budget item ID' },
        actual_amount: { type: 'number', description: 'The actual amount paid (if different from budgeted amount)' },
      },
      required: ['item_id'],
    },
  },
  {
    name: 'get_upcoming_bills',
    description: 'Get unpaid bills due in the next 7 days and any overdue unpaid bills.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'add_budget_item',
    description: 'Add a new item to the current month budget.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Item description (e.g. "Electric bill")' },
        amount: { type: 'number', description: 'Budgeted amount' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format. Defaults to end of current month if omitted.' },
        item_type: { type: 'string', enum: ['income', 'expense'], description: 'Whether this is income or expense' },
        category: { type: 'string', description: 'Category name (e.g. "Utilities", "Groceries"). Resolved to ID automatically.' },
        account: { type: 'string', description: 'Account name (e.g. "Checking", "Credit Card"). Resolved to ID automatically.' },
      },
      required: ['description', 'amount', 'item_type'],
    },
  },
  {
    name: 'get_budget_summary',
    description: 'Get a summary of the current month budget showing totals for budgeted vs actual income and expenses, and remaining balance.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
```

- [ ] **Step 3: Add budget tool handlers to executeTool()**

In the first `switch (name)` block inside `executeTool()`, add these cases before the closing of that switch (before line 401 `}`):

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

- [ ] **Step 4: Commit**

```bash
cd /opt/nova && git add backend/claude.js && git commit -m "feat: add 5 budget tools to Claude tool definitions"
```

---

### Task 10: Update Nova's system prompt to mention budget tools

**Files:**
- Modify: `/opt/nova/backend/claude.js` (NOVA_PERSONALITY string, line 11)

- [ ] **Step 1: Add budget tool mention to NOVA_PERSONALITY**

At the end of the `NOVA_PERSONALITY` string (before the closing backtick on line 41), add:

```
You also have tools for managing the monthly budget. You can list budget items, mark bills as paid (with actual amount), see upcoming and overdue bills, add new budget items, and get a budget summary. When the user talks about paying bills, checking their budget, or asking what's due, use the budget tools.
```

- [ ] **Step 2: Commit**

```bash
cd /opt/nova && git add backend/claude.js && git commit -m "feat: add budget tools to Nova personality prompt"
```

---

### Task 11: Restart Nova and end-to-end test

**Files:**
- None (runtime verification)

- [ ] **Step 1: Restart Nova backend**

```bash
cd /opt/nova/backend && pkill -f "node server.js"; nohup node server.js > /tmp/nova-server.log 2>&1 &
```

Wait 2 seconds, then verify it started:

```bash
curl -s http://localhost:8000/api/health | jq .
```

Expected: health check response (not an error).

- [ ] **Step 2: Test get_budget_items via chat**

Open Nova at https://nova.srv1042999.hstgr.cloud and ask: "What's on my budget this month?"

Expected: Nova lists current month's budget items with descriptions, amounts, and paid status.

- [ ] **Step 3: Test get_upcoming_bills via chat**

Ask: "What bills are coming up?"

Expected: Nova shows upcoming bills due in next 7 days + any overdue unpaid.

- [ ] **Step 4: Test get_budget_summary via chat**

Ask: "How's my budget looking?"

Expected: Nova shows totals — budgeted vs actual, paid vs unpaid count, remaining.

- [ ] **Step 5: Test mark_budget_item_paid via chat**

Ask: "I paid [item name], it was $[amount]"

Expected: Nova finds the item, marks it paid, confirms.

- [ ] **Step 6: Test add_budget_item via chat**

Ask: "Add a $25 expense for haircut on the 30th"

Expected: Nova creates the item, confirms with details.

- [ ] **Step 7: Check server logs for errors**

```bash
tail -20 /tmp/nova-server.log
```

Expected: No budget-related errors. Tool calls logged normally.
