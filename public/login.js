// login.js — Login / Sign In page logic
//
// The backend returns a session token on successful register/login.
// saveSession() (from auth.js) stores it, and other pages use
// authFetch() to send it along on protected requests.

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");

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

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(loginError, data.error || "Login failed.");
      return;
    }

    saveSession(data.userId, data.token);
    window.location.href = "profile.html";
  } catch (err) {
    showError(loginError, "Couldn't reach the server. Is the backend running?");
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerError.hidden = true;

  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  // Note: the ID verification photo upload isn't wired to the backend
  // yet — there's no endpoint to receive a file. Skipped for now.

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(registerError, data.error || "Registration failed.");
      return;
    }

    saveSession(data.userId, data.token);
    window.location.href = "profile.html";
  } catch (err) {
    showError(registerError, "Couldn't reach the server. Is the backend running?");
  }
});
