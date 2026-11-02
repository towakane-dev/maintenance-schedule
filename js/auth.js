/* Prototype-only local login. This is not a replacement for server authentication. */
(() => {
  'use strict';

  const SESSION_KEY = 'kbb-hrga-login';
  const DEMO_USERNAME = 'admin';
  const DEMO_PASSWORD = 'admin123';
  const loginScreen = document.querySelector('#login-screen');
  const loginForm = document.querySelector('#login-form');
  const loginError = document.querySelector('#login-error');
  const logoutButton = document.querySelector('#logout');

  const isLoggedIn = () => {
    try {
      return localStorage.getItem(SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const setLoggedIn = (loggedIn) => {
    document.body.classList.toggle('authenticated', loggedIn);
    loginScreen.classList.toggle('show', !loggedIn);
  };

  setLoggedIn(isLoggedIn());

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm));
    if (data.username !== DEMO_USERNAME || data.password !== DEMO_PASSWORD) {
      loginError.textContent = 'Username atau password salah.';
      loginError.hidden = false;
      return;
    }

    localStorage.setItem(SESSION_KEY, 'true');
    loginForm.reset();
    loginError.hidden = true;
    setLoggedIn(true);
  });

  logoutButton.addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    setLoggedIn(false);
    loginForm.elements.username.focus();
  });
})();
