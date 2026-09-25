firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');

// If already signed in (e.g. came back to this page by mistake), skip straight to the ledger.
auth.onAuthStateChanged((user) => {
  if (user) window.location.href = 'ledger.html';
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
    window.location.href = 'ledger.html';
  } catch (err) {
    loginError.textContent = friendlyAuthError(err);
    loginError.hidden = false;
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});

function friendlyAuthError(err) {
  const code = err && err.code;
  if (code === 'auth/invalid-email') return 'That email address doesn\u2019t look right.';
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts — wait a moment and try again.';
  if (code === 'auth/unauthorized-domain') return 'This site\u2019s domain isn\u2019t authorized in Firebase yet.';
  console.error('Login error:', err);
  return 'Couldn\u2019t sign in. Please try again.';
}
