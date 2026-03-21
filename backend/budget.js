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
