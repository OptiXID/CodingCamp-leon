/* ============================================================
   Expense & Budget Visualizer — app.js
   Stack   : Vanilla JavaScript (no frameworks)
   Storage : browser localStorage
   Chart   : Chart.js (loaded via CDN in index.html)

   Features:
     - Add / delete transactions (persisted in localStorage)
     - Total balance (auto-updated)
     - Pie chart by category (auto-updated)
     - Dark / Light mode toggle (preference persisted)
     - Custom categories (persisted, shown in dropdown + chart)
     - Monthly summary + filter (filter list & chart by month)
   ============================================================ */

'use strict';

// ── Storage keys ──────────────────────────────────────────────
const STORAGE_KEY_TX        = 'expense_visualizer_transactions';
const STORAGE_KEY_THEME     = 'expense_visualizer_theme';
const STORAGE_KEY_CATEGORIES = 'expense_visualizer_custom_categories';

// ── Built-in categories & colours ─────────────────────────────
const BUILTIN_CATEGORIES = ['Food', 'Transport', 'Fun'];

const BUILTIN_COLORS = {
  Food:      '#22c55e',
  Transport: '#3b82f6',
  Fun:       '#f97316',
};

// Palette for auto-assigning colours to custom categories
const CUSTOM_COLOR_PALETTE = [
  '#a855f7', '#ec4899', '#14b8a6', '#f59e0b',
  '#6366f1', '#10b981', '#ef4444', '#0ea5e9',
  '#84cc16', '#e879f9', '#fb923c', '#38bdf8',
];

// ── Chart.js instance ─────────────────────────────────────────
let spendingChart = null;

// ── Active month filter (null = show all) ─────────────────────
// Format: "YYYY-MM" string or null
let activeMonthFilter = null;

// ── DOM references ────────────────────────────────────────────
const form               = document.getElementById('transactionForm');
const itemNameInput      = document.getElementById('itemName');
const amountInput        = document.getElementById('amount');
const categorySelect     = document.getElementById('category');
const newCategoryGroup   = document.getElementById('newCategoryGroup');
const newCategoryInput   = document.getElementById('newCategoryInput');
const saveCategoryBtn    = document.getElementById('saveCategoryBtn');
const newCategoryError   = document.getElementById('newCategoryError');

const itemNameError      = document.getElementById('itemNameError');
const amountError        = document.getElementById('amountError');
const categoryError      = document.getElementById('categoryError');

const totalBalanceEl     = document.getElementById('totalBalance');
const transactionList    = document.getElementById('transactionList');
const emptyMsg           = document.getElementById('emptyMsg');
const chartEmptyMsg      = document.getElementById('chartEmptyMsg');
const chartCanvas        = document.getElementById('spendingChart');

const themeToggle        = document.getElementById('themeToggle');
const themeIcon          = document.getElementById('themeIcon');

const monthFilterInput   = document.getElementById('monthFilter');
const clearMonthFilterBtn = document.getElementById('clearMonthFilter');
const summaryTotal       = document.getElementById('summaryTotal');
const summaryMonthLabel  = document.getElementById('summaryMonthLabel');
const summaryAmount      = document.getElementById('summaryAmount');
const filterBadge        = document.getElementById('filterBadge');

const customCategoryList = document.getElementById('customCategoryList');
const categoryManagerCard = document.getElementById('categoryManagerCard');

// ============================================================
// SECTION 1 — HELPERS
// ============================================================

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a number as a "$X.XX" currency string.
 */
function formatCurrency(value) {
  return '$' + Number(value).toFixed(2);
}

/**
 * Generate a simple unique ID.
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Convert a Date object to "YYYY-MM" string (local time).
 */
function toYearMonth(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Format "YYYY-MM" into a human-readable label like "September 2026".
 */
function formatMonthLabel(ym) {
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

// ============================================================
// SECTION 2 — LOCALSTORAGE
// ============================================================

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TX);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
}

function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomCategories(categories) {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
}

// ============================================================
// SECTION 3 — CATEGORY COLOUR RESOLUTION
// ============================================================

/**
 * Return the colour for any category (built-in or custom).
 * Custom categories get colours from the palette, cycling if needed.
 */
function getCategoryColor(categoryName) {
  if (BUILTIN_COLORS[categoryName]) return BUILTIN_COLORS[categoryName];
  const customs = loadCustomCategories();
  const idx = customs.indexOf(categoryName);
  if (idx === -1) return '#94a3b8'; // fallback grey
  return CUSTOM_COLOR_PALETTE[idx % CUSTOM_COLOR_PALETTE.length];
}

// ============================================================
// SECTION 4 — DARK / LIGHT MODE
// ============================================================

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  // If no preference saved, respect OS preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(STORAGE_KEY_THEME, next);
}

// ============================================================
// SECTION 5 — CUSTOM CATEGORIES
// ============================================================

/**
 * Rebuild the <select> options: placeholder + built-ins +
 * custom categories + "Add New" sentinel.
 */
function rebuildCategoryDropdown() {
  const customs = loadCustomCategories();
  const currentValue = categorySelect.value;

  // Clear all options
  categorySelect.innerHTML = '';

  // Placeholder
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select Category --';
  categorySelect.appendChild(placeholder);

  // Built-in
  BUILTIN_CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // Custom
  customs.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // Add new sentinel
  const addOpt = document.createElement('option');
  addOpt.value = '__add_new__';
  addOpt.textContent = '＋ Add New Category';
  categorySelect.appendChild(addOpt);

  // Restore previous selection if still valid
  if (currentValue && currentValue !== '__add_new__') {
    categorySelect.value = currentValue;
  }
}

/**
 * Render the custom category manager card (chip list).
 */
function renderCustomCategoryManager() {
  const customs = loadCustomCategories();

  if (customs.length === 0) {
    categoryManagerCard.style.display = 'none';
    return;
  }

  categoryManagerCard.style.display = 'block';
  customCategoryList.innerHTML = '';

  customs.forEach(cat => {
    const li = document.createElement('li');
    const color = getCategoryColor(cat);
    li.style.borderColor = color;

    const dot = document.createElement('span');
    dot.style.cssText = `
      display:inline-block;
      width:10px; height:10px;
      border-radius:50%;
      background:${color};
      flex-shrink:0;
    `;

    const label = document.createElement('span');
    label.textContent = escapeHTML(cat);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-category';
    removeBtn.setAttribute('aria-label', `Remove category ${escapeHTML(cat)}`);
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => removeCustomCategory(cat));

    li.appendChild(dot);
    li.appendChild(label);
    li.appendChild(removeBtn);
    customCategoryList.appendChild(li);
  });
}

/**
 * Add a new custom category, persist, refresh UI.
 */
function addCustomCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;

  const allExisting = [
    ...BUILTIN_CATEGORIES,
    ...loadCustomCategories(),
  ].map(c => c.toLowerCase());

  if (allExisting.includes(trimmed.toLowerCase())) return false; // duplicate

  const customs = loadCustomCategories();
  customs.push(trimmed);
  saveCustomCategories(customs);

  rebuildCategoryDropdown();
  renderCustomCategoryManager();

  // Auto-select the newly added category
  categorySelect.value = trimmed;
  newCategoryGroup.style.display = 'none';
  newCategoryInput.value = '';

  return true;
}

/**
 * Remove a custom category and clean up transactions that used it.
 */
function removeCustomCategory(name) {
  const customs = loadCustomCategories().filter(c => c !== name);
  saveCustomCategories(customs);

  // Reassign transactions that had this category to empty so user knows
  const transactions = loadTransactions().map(tx =>
    tx.category === name ? { ...tx, category: 'Uncategorised' } : tx
  );
  saveTransactions(transactions);

  rebuildCategoryDropdown();
  renderCustomCategoryManager();
  renderAll();
}

// ============================================================
// SECTION 6 — MONTH FILTER
// ============================================================

/**
 * Return only the transactions matching the active month filter.
 * If filter is null, returns all transactions.
 */
function getFilteredTransactions() {
  const all = loadTransactions();
  if (!activeMonthFilter) return all;
  return all.filter(tx => tx.date && toYearMonth(tx.date) === activeMonthFilter);
}

/**
 * Update the monthly summary text and filter badge.
 */
function renderMonthlySummary() {
  if (!activeMonthFilter) {
    summaryTotal.style.display = 'none';
    filterBadge.style.display = 'none';
    return;
  }

  const filtered = getFilteredTransactions();
  const total = filtered.reduce((sum, tx) => sum + Number(tx.amount), 0);

  summaryMonthLabel.textContent = formatMonthLabel(activeMonthFilter);
  summaryAmount.textContent = formatCurrency(total);
  summaryTotal.style.display = 'block';

  filterBadge.textContent = formatMonthLabel(activeMonthFilter);
  filterBadge.style.display = 'inline-block';
}

// ============================================================
// SECTION 7 — RENDERING
// ============================================================

/**
 * Render a single transaction DOM element.
 */
function createTransactionEl(tx) {
  const item = document.createElement('div');
  item.className = 'transaction-item';
  item.dataset.id = tx.id;
  item.dataset.category = tx.category;

  // Apply left-border colour for custom categories via inline style
  if (!BUILTIN_COLORS[tx.category]) {
    item.style.borderLeftWidth = '4px';
    item.style.borderLeftStyle = 'solid';
    item.style.borderLeftColor = getCategoryColor(tx.category);
  }

  const dateStr = tx.date
    ? new Date(tx.date).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  item.innerHTML = `
    <div class="transaction-info">
      <span class="transaction-name">${escapeHTML(tx.name)}</span>
      <span class="transaction-amount">${formatCurrency(tx.amount)}</span>
      <span class="transaction-category">${escapeHTML(tx.category)}</span>
      ${dateStr ? `<span style="font-size:0.72rem;color:var(--color-muted);">${dateStr}</span>` : ''}
    </div>
    <button class="btn-delete" aria-label="Delete ${escapeHTML(tx.name)}">Delete</button>
  `;

  item.querySelector('.btn-delete').addEventListener('click', () => {
    deleteTransaction(tx.id);
  });

  return item;
}

/**
 * Re-render the transaction list (respects active month filter).
 */
function renderTransactions() {
  const transactions = getFilteredTransactions();

  Array.from(transactionList.querySelectorAll('.transaction-item')).forEach(el => el.remove());

  if (transactions.length === 0) {
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
    transactions.forEach(tx => transactionList.appendChild(createTransactionEl(tx)));
  }
}

/**
 * Update the TOTAL BALANCE (always uses ALL transactions, not filtered).
 */
function renderBalance() {
  const all = loadTransactions();
  const total = all.reduce((sum, tx) => sum + Number(tx.amount), 0);
  totalBalanceEl.textContent = formatCurrency(total);
}

/**
 * Update (or create) the Chart.js pie chart.
 * Uses filtered transactions so it reflects the active month filter.
 */
function renderChart() {
  const transactions = getFilteredTransactions();

  // Build totals map for every category present
  const totalsMap = {};
  transactions.forEach(tx => {
    if (!totalsMap[tx.category]) totalsMap[tx.category] = 0;
    totalsMap[tx.category] += Number(tx.amount);
  });

  const labels = Object.keys(totalsMap).filter(k => totalsMap[k] > 0);
  const data   = labels.map(k => totalsMap[k]);
  const colors = labels.map(k => getCategoryColor(k));

  if (labels.length === 0) {
    chartCanvas.style.display = 'none';
    chartEmptyMsg.style.display = 'block';
    if (spendingChart) {
      spendingChart.destroy();
      spendingChart = null;
    }
    return;
  }

  chartCanvas.style.display = 'block';
  chartEmptyMsg.style.display = 'none';

  if (spendingChart) {
    spendingChart.data.labels = labels;
    spendingChart.data.datasets[0].data = data;
    spendingChart.data.datasets[0].backgroundColor = colors;
    spendingChart.update();
  } else {
    spendingChart = new Chart(chartCanvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 12 }, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
}

/**
 * Run all render functions.
 */
function renderAll() {
  renderBalance();
  renderTransactions();
  renderChart();
  renderMonthlySummary();
}

// ============================================================
// SECTION 8 — CRUD
// ============================================================

/**
 * Add a new transaction (with current date attached) and persist.
 */
function addTransaction(name, amount, category) {
  const transactions = loadTransactions();
  transactions.push({
    id:       generateId(),
    name:     name.trim(),
    amount:   parseFloat(amount),
    category,
    date:     new Date().toISOString(), // store full ISO date for monthly filtering
  });
  saveTransactions(transactions);
  renderAll();
}

/**
 * Delete a transaction by ID and persist.
 */
function deleteTransaction(id) {
  const transactions = loadTransactions().filter(tx => tx.id !== id);
  saveTransactions(transactions);
  renderAll();
}

// ============================================================
// SECTION 9 — FORM VALIDATION
// ============================================================

function validateForm() {
  let valid = true;

  [itemNameInput, amountInput, categorySelect].forEach(el => el.classList.remove('is-invalid'));
  [itemNameError, amountError, categoryError].forEach(el => el.classList.remove('visible'));

  if (!itemNameInput.value.trim()) {
    itemNameInput.classList.add('is-invalid');
    itemNameError.classList.add('visible');
    valid = false;
  }

  const amt = parseFloat(amountInput.value);
  if (!amountInput.value.trim() || isNaN(amt) || amt <= 0) {
    amountInput.classList.add('is-invalid');
    amountError.classList.add('visible');
    valid = false;
  }

  // Reject if still on sentinel or empty
  if (!categorySelect.value || categorySelect.value === '__add_new__') {
    categorySelect.classList.add('is-invalid');
    categoryError.classList.add('visible');
    valid = false;
  }

  return valid;
}

// ============================================================
// SECTION 10 — EVENT LISTENERS
// ============================================================

// -- Theme toggle --
themeToggle.addEventListener('click', toggleTheme);

// -- Form submit --
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  addTransaction(itemNameInput.value, amountInput.value, categorySelect.value);

  form.reset();
  newCategoryGroup.style.display = 'none';
  [itemNameInput, amountInput, categorySelect].forEach(el => el.classList.remove('is-invalid'));
});

// -- Live clear of validation states --
[itemNameInput, amountInput].forEach(input => {
  input.addEventListener('input', () => {
    input.classList.remove('is-invalid');
    document.getElementById(input.id + 'Error').classList.remove('visible');
  });
});

// -- Category dropdown change --
categorySelect.addEventListener('change', () => {
  categorySelect.classList.remove('is-invalid');
  categoryError.classList.remove('visible');

  if (categorySelect.value === '__add_new__') {
    newCategoryGroup.style.display = 'flex';
    newCategoryInput.focus();
  } else {
    newCategoryGroup.style.display = 'none';
    newCategoryInput.value = '';
    newCategoryError.classList.remove('visible');
  }
});

// -- Save custom category --
saveCategoryBtn.addEventListener('click', () => {
  const name = newCategoryInput.value.trim();
  newCategoryError.classList.remove('visible');

  if (!name) {
    newCategoryError.classList.add('visible');
    newCategoryInput.focus();
    return;
  }

  const saved = addCustomCategory(name);
  if (!saved) {
    newCategoryError.textContent = 'Category already exists.';
    newCategoryError.classList.add('visible');
  } else {
    newCategoryError.textContent = 'Please enter a category name.';
  }
});

// Allow pressing Enter in the new-category input
newCategoryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveCategoryBtn.click();
  }
});

// -- Month filter --
monthFilterInput.addEventListener('change', () => {
  activeMonthFilter = monthFilterInput.value || null;
  renderAll();
});

clearMonthFilterBtn.addEventListener('click', () => {
  activeMonthFilter = null;
  monthFilterInput.value = '';
  renderAll();
});

// ============================================================
// SECTION 11 — INITIALISE
// ============================================================

loadTheme();
rebuildCategoryDropdown();
renderCustomCategoryManager();
renderAll();
