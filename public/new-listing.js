// new-listing.js — List Your Vehicle page logic
//
// Sends the signed-in user's real name as ownerName; the backend now
// derives ownerID from the session token itself (POST /api/listings
// requires sign-in and sets ownerID = req.userId), so newly created
// listings are bookable right away.

const signedOutMessage = document.getElementById("signed-out-message");
const content = document.getElementById("new-listing-content");

if (!isSignedIn()) {
  signedOutMessage.hidden = false;
  content.hidden = true;
}

document.getElementById("new-listing-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("new-listing-error");
  errorEl.hidden = true;

  const userRes = await authFetch(`/api/users/${getUserId()}`);
  const user = userRes.ok ? await userRes.json() : null;

  const payload = {
    title: document.getElementById("title").value.trim(),
    type: document.getElementById("type").value,
    location: document.getElementById("location").value.trim(),
    pricePerDay: Number(document.getElementById("pricePerDay").value),
    mpg: Number(document.getElementById("mpg").value),
    seats: Number(document.getElementById("seats").value),
    transmission: document.getElementById("transmission").value,
    description: document.getElementById("description").value.trim(),
    ownerName: user ? user.name : "NeedARide user",
  };

  try {
    const res = await authFetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || "Couldn't create that listing.";
      errorEl.hidden = false;
      return;
    }
    window.location.href = "profile.html";
  } catch (err) {
    errorEl.textContent = "Couldn't reach the server.";
    errorEl.hidden = false;
  }
});
