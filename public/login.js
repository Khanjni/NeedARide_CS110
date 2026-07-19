// login.js — Login / Sign In page logic
//
// NOTE FOR LATER: once the backend exists, replace the alert() calls
// below with real fetch() calls, e.g.:
//   const res = await fetch('/api/auth/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, password }),
//   });
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

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  // Placeholder until the backend auth endpoint exists.
  alert(`Would sign in as ${email} once the backend is connected.`);
});

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  // Placeholder until the backend auth endpoint exists.
  alert(`Would create an account for ${name} once the backend is connected.`);
});
