import React, { useState, useEffect, useCallback } from 'react';

const CATEGORY_ORDER = ['Produce', 'Dairy', 'Meat & Seafood', 'Bakery', 'Frozen', 'Pantry', 'Beverages', 'Snacks', 'Household', 'Other'];
const CATEGORY_MAP = {
  'Produce': ['green onion','sweet potato','bell pepper','apple','banana','orange','lemon','lime','avocado','tomato','potato','onion','garlic','lettuce','spinach','kale','carrot','celery','broccoli','pepper','cucumber','mushroom','corn','berry','strawberry','blueberry','grape','melon','peach','pear','mango','pineapple','cilantro','basil','ginger','zucchini'],
  'Dairy': ['half and half','sour cream','milk','cheese','yogurt','butter','cream','eggs','creamer'],
  'Meat & Seafood': ['ground beef','chicken','beef','pork','turkey','salmon','shrimp','fish','steak','bacon','sausage','ham','lamb','crab','lobster','tuna'],
  'Bakery': ['bread','bagel','tortilla','roll','muffin','croissant','bun','pita','cake','donut'],
  'Frozen': ['ice cream','frozen pizza','frozen vegetables','frozen fruit','popsicle'],
  'Pantry': ['peanut butter','rice','pasta','cereal','flour','sugar','oil','vinegar','sauce','soup','beans','jelly','honey','salt','spice','oatmeal','noodle'],
  'Beverages': ['water','juice','soda','coffee','tea','wine','beer','sparkling','kombucha','lemonade'],
  'Snacks': ['granola bar','trail mix','chips','crackers','cookies','popcorn','nuts','pretzels','candy'],
  'Household': ['paper towels','toilet paper','dish soap','laundry detergent','trash bags','sponge','aluminum foil','plastic wrap','napkins'],
};

function guessCategory(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return 'Other';
}

function buildShareText(items) {
  const unchecked = items.filter(i => !i.checked);
  if (unchecked.length === 0) return 'Grocery list is empty!';
  const grouped = {};
  for (const item of unchecked) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  let text = 'Grocery List\n';
  for (const cat of CATEGORY_ORDER) {
    if (!grouped[cat]) continue;
    text += `\n${cat}:\n`;
    for (const item of grouped[cat]) {
      text += `  - ${item.name}${item.quantity ? ` (${item.quantity})` : ''}\n`;
    }
  }
  return text;
}

export default function GroceryScreen({ authToken, isActive }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCat, setNewCat] = useState('Other');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/grocery', { headers });
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error('[GroceryScreen] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Auto-refresh when tab becomes active (picks up items added via chat)
  useEffect(() => {
    if (isActive) fetchItems();
  }, [isActive]);

  const handleToggle = async (id, checked) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked } : i));
    try {
      await fetch(`/api/grocery/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      });
    } catch (err) {
      console.error('[GroceryScreen] toggle error:', err);
      fetchItems();
    }
  };

  const handleDelete = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/grocery/${id}`, { method: 'DELETE', headers });
    } catch (err) {
      console.error('[GroceryScreen] delete error:', err);
      fetchItems();
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: newCat, quantity: newQty.trim() || undefined }),
      });
      if (res.ok) {
        const item = await res.json();
        setItems(prev => [...prev, item]);
      }
    } catch (err) {
      console.error('[GroceryScreen] add error:', err);
    }
    setNewName('');
    setNewQty('');
    setNewCat('Other');
    setShowAdd(false);
  };

  const handleClearChecked = async () => {
    setItems(prev => prev.filter(i => !i.checked));
    try {
      await fetch('/api/grocery/clear-checked', { method: 'POST', headers });
    } catch (err) {
      console.error('[GroceryScreen] clear checked error:', err);
      fetchItems();
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear the entire grocery list?')) return;
    setItems([]);
    try {
      await fetch('/api/grocery/clear-all', { method: 'POST', headers });
    } catch (err) {
      console.error('[GroceryScreen] clear all error:', err);
      fetchItems();
    }
  };

  const handleShare = async () => {
    const text = buildShareText(items);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Grocery List', text });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('[GroceryScreen] share error:', err);
      }
    } else {
      setShowShareMenu(true);
    }
  };

  const handlePrint = () => window.print();

  const handleNameChange = (val) => {
    setNewName(val);
    if (val.trim()) setNewCat(guessCategory(val));
  };

  const hasChecked = items.some(i => i.checked);
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc.push({ category: cat, items: catItems });
    return acc;
  }, []);

  return (
    <div className="screen-container grocery-screen">
      <div className="screen-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Grocery List</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="grocery-action-btn" onPointerDown={handlePrint} title="Print">{'\u{1F5A8}'}</button>
          <button className="grocery-action-btn" onPointerDown={handleShare} title="Share">{'\u{1F4E4}'}</button>
        </div>
      </div>

      {loading ? (
        <div className="screen-loading">Loading...</div>
      ) : items.length === 0 ? (
        <div className="screen-empty">
          <div>{'\u{1F6D2}'}</div>
          <p>Your grocery list is empty</p>
          <p className="screen-empty-hint">Tap + to add items or tell Nova what you need</p>
        </div>
      ) : (
        <>
          {grouped.map(({ category, items: catItems }) => (
            <div key={category} className="task-group">
              <div className="section-title">{category}</div>
              <div className="task-list-card">
                {catItems.map(item => (
                  <div key={item.id} className="grocery-item">
                    <button
                      className={`task-checkbox ${item.checked ? 'checked' : ''}`}
                      onPointerDown={() => handleToggle(item.id, item.checked ? 0 : 1)}
                    >
                      {item.checked ? '\u2713' : ''}
                    </button>
                    <span className={`grocery-item-name ${item.checked ? 'checked' : ''}`}>
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="grocery-item-qty">{item.quantity}</span>
                    )}
                    <button className="task-delete" onPointerDown={() => handleDelete(item.id)}>
                      {'\u00D7'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasChecked && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="settings-btn" style={{ flex: 1 }} onPointerDown={handleClearChecked}>
                Clear Checked
              </button>
              <button className="settings-btn" style={{ flex: 1 }} onPointerDown={handleClearAll}>
                Clear All
              </button>
            </div>
          )}
        </>
      )}

      {/* Share fallback menu */}
      {showShareMenu && (
        <div className="task-add-overlay" onPointerDown={() => setShowShareMenu(false)}>
          <div className="task-add-sheet" onPointerDown={e => e.stopPropagation()}>
            <div className="section-title" style={{ paddingTop: 12 }}>Share Grocery List</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px' }}>
              <a
                href={`sms:?body=${encodeURIComponent(buildShareText(items))}`}
                className="inline-submit"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Text Message
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Grocery List')}&body=${encodeURIComponent(buildShareText(items))}`}
                className="inline-submit"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Email
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add item modal */}
      {showAdd && (
        <div className="task-add-overlay" onPointerDown={() => setShowAdd(false)}>
          <div className="task-add-sheet" onPointerDown={e => e.stopPropagation()}>
            <div className="section-title" style={{ paddingTop: 12 }}>Add Item</div>
            <div className="inline-add" style={{ flexDirection: 'column', gap: 10 }}>
              <input
                className="inline-input"
                placeholder="Item name..."
                value={newName}
                onChange={e => handleNameChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <input
                className="inline-input"
                placeholder="Quantity (optional)..."
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <select
                className="inline-input"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {CATEGORY_ORDER.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="inline-submit" style={{ flex: 1 }} onPointerDown={handleAdd}>
                  Add Item
                </button>
                <button className="settings-btn" style={{ flex: 1 }} onPointerDown={() => setShowAdd(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print view — hidden, shown only when printing */}
      <div className="grocery-print">
        <h1>Grocery List</h1>
        {grouped.map(({ category, items: catItems }) => {
          const unchecked = catItems.filter(i => !i.checked);
          if (unchecked.length === 0) return null;
          return (
            <div key={category}>
              <h3>{category}</h3>
              <ul>
                {unchecked.map(item => (
                  <li key={item.id}>
                    {item.name}{item.quantity ? ` — ${item.quantity}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <button className="fab" onPointerDown={() => setShowAdd(true)} aria-label="Add grocery item">
        +
      </button>
    </div>
  );
}
