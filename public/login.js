// login.js — Login / Sign In page logic
//
// If login succeeds, redirect to profile.html. If it fails, show the
// error message returned by the server in the .form-error element.

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

function showLogin() {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.hidden = false;
  registerForm.hidden = true;
}

function showRegister() {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.hidden = false;
  loginForm.hidden = true;
}

tabLogin.addEventListener("click", showLogin);
tabRegister.addEventListener("click", showRegister);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const error = document.getElementById('login-error');
  error.hidden = true;
  try {
    const res = await fetch('http://localhost:3000/api/auth/login' , { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ email, password }), });
    const info = await res.json();
    if (res.ok) {
      localStorage.setItem('userId', info.userId);
      localStorage.setItem('authToken', info.token);
      window.location.href = 'profile.html';
      return;
    }
    error.textContent = info.error;
  } catch (requestError) {
    error.textContent = 'Sign in is unavailable while the backend is offline.';
  }
  error.hidden = false;
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const error = document.getElementById('register-error');
  error.hidden = true;
  try {
    const res = await fetch('http://localhost:3000/api/auth/register' , { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ name, email, password }), });
    const info = await res.json();
    if (res.ok) {
      localStorage.setItem('userId', info.userId);
      localStorage.setItem('authToken', info.token);
      window.location.href = 'profile.html';
      return;
    }
    error.textContent = info.error;
  } catch (requestError) {
    error.textContent = 'Account creation is unavailable while the backend is offline.';
  }
  error.hidden = false;
});
