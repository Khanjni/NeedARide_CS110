// auth.js — shared across pages that need to know who's signed in.
//
// The backend now issues a session token on register/login (not just
// a userId), and every protected route requires it as:
//   Authorization: Bearer <token>
// This file centralizes that so each page doesn't repeat it.

function getToken() {
  return localStorage.getItem("needaride_token");
}

function getUserId() {
  return localStorage.getItem("needaride_userId");
}

function isSignedIn() {
  return Boolean(getToken() && getUserId());
}

function saveSession(userId, token) {
  localStorage.setItem("needaride_userId", userId);
  localStorage.setItem("needaride_token", token);
}

function signOut() {
  localStorage.removeItem("needaride_userId");
  localStorage.removeItem("needaride_token");
}

// Wraps fetch() to automatically attach the Authorization header when
// a session exists. Use this instead of raw fetch() for any endpoint
// that requires sign-in (profile, bookings, messages, reviews, etc).
async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}
