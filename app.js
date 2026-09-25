// ===================== INIT =====================
// firebaseConfig comes from firebase-config.js (loaded before this file)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userChip = document.getElementById('user-chip');

let unsubscribeEntries = null;
let allEntries = [];
let selectedType = 'expense';

// ===================== AUTH =====================

auth.onAuthStateChanged((user) => {
  if (user) {
    loginView.hidden = true;
    appView.hidden = false;
    userChip.textContent = user.email;
    startListening();
  } else {
    loginView.hidden = false;
    appView.hidden = true;
    if (unsubscribeEntries) { unsubscribeEntries(); unsubscribeEntries = null; }
    allEntries = [];
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    loginForm.reset();
  } catch (err) {
    loginError.textContent = friendlyAuthError(err);
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});

logoutBtn.addEventListener('click', () => auth.signOut());

function friendlyAuthError(err) {
  const code = err && err.code;
  if (code === 'auth/invalid-email') return 'That email address doesn\u2019t look right.';
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts — wait a moment and try again.';
  return 'Couldn\u2019t sign in. Please try again.';
}

// ===================== ENTRIES =====================

const entryForm = document.getElementById('entry-form');
const entryError = document.getElementById('entry-error');
const entryDate = document.getElementById('entry-date');
const typeExpenseBtn = document.getElementById('type-expense');
const typeIncomeBtn = document.getElementById('type-income');

entryDate.valueAsDate = new Date();

typeExpenseBtn.addEventListener('click', () => setType('expense'));
typeIncomeBtn.addEventListener('click', () => setType('income'));

function setType(type) {
  selectedType = type;
  typeExpenseBtn.classList.toggle('active', type === 'expense');
  typeIncomeBtn.classList.toggle('active', type === 'income');
}

entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  entryError.hidden = true;

  const desc = document.getElementById('entry-desc').value.trim();
  const category = document.getElementById('entry-category').value;
  const amount = parseFloat(document.getElementById('entry-amount').value);
  const date = document.getElementById('entry-date').value;
  const user = auth.currentUser;

  if (!desc || !amount || amount <= 0 || !date || !user) {
    entryError.textContent = 'Fill in a description, a positive amount, and a date.';
    entryError.hidden = false;
    return;
  }

  const submitBtn = document.getElementById('entry-submit');
  submitBtn.disabled = true;

  try {
    await db.collection('transactions').add({
      desc,
      category,
      amount,
      type: selectedType,
      date,
      uid: user.uid,
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    entryForm.reset();
    entryDate.valueAsDate = new Date();
    setType('expense');
  } catch (err) {
    entryError.textContent = 'Couldn\u2019t save that entry. Check your connection and try again.';
    entryError.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

function startListening() {
  if (unsubscribeEntries) unsubscribeEntries();
  unsubscribeEntries = db.collection('transactions')
    .orderBy('date', 'desc')
    .onSnapshot((snapshot) => {
      allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      populateCategoryFilter();
      render();
    }, (err) => {
      console.error('Firestore listen failed:', err);
    });
}

// ===================== RENDER =====================

const registerList = document.getElementById('register-list');
const registerEmpty = document.getElementById('register-empty');
const filterSelect = document.getElementById('filter-category');
const sumBalance = document.getElementById('sum-balance');
const sumIncome = document.getElementById('sum-income');
const sumExpense = document.getElementById('sum-expense');

filterSelect.addEventListener('change', render);

function populateCategoryFilter() {
  const current = filterSelect.value;
  const categories = [...new Set(allEntries.map(e => e.category).filter(Boolean))].sort();
  filterSelect.innerHTML = '<option value="">All categories</option>' +
    categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  filterSelect.value = categories.includes(current) ? current : '';
}

function render() {
  const filterCat = filterSelect.value;
  const entries = filterCat ? allEntries.filter(e => e.category === filterCat) : allEntries;

  let income = 0, expense = 0;
  allEntries.forEach(e => {
    if (e.type === 'income') income += e.amount;
    else expense += e.amount;
  });

  sumIncome.textContent = formatAmount(income);
  sumExpense.textContent = formatAmount(expense);
  sumBalance.textContent = formatAmount(income - expense);

  registerEmpty.hidden = entries.length !== 0;
  registerList.innerHTML = entries.map(rowHtml).join('');

  registerList.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.deleteId));
  });
}

function rowHtml(e) {
  const sign = e.type === 'income' ? '+' : '\u2212';
  const cls = e.type === 'income' ? 'in' : 'out';
  return `
    <div class="register-row">
      <span class="row-date">${formatDate(e.date)}</span>
      <span class="row-desc">
        <span class="row-desc-text">${escapeHtml(e.desc)}</span>
        <span class="row-category">${escapeHtml(e.category)} \u00b7 ${escapeHtml(e.email || '')}</span>
      </span>
      <span class="row-amount ${cls}">${sign}${formatAmount(e.amount)}</span>
      <button class="row-delete" data-delete-id="${e.id}" title="Delete entry">Remove</button>
    </div>
  `;
}

async function deleteEntry(id) {
  if (!confirm('Remove this entry from the ledger?')) return;
  try {
    await db.collection('transactions').doc(id).delete();
  } catch (err) {
    alert('Couldn\u2019t delete that entry. Please try again.');
  }
}

function formatAmount(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
