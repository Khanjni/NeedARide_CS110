// profile.js — User Profile page logic
//
// Uses authFetch() (from auth.js) so the session token is sent on
// every request. The backend now has a real GET /api/users/:userId,
// so the header (name/bio/reputation) is real data, not placeholder.
//
// KNOWN GAP: POST /api/listings still doesn't set an `ownerID` on new
// listings, so "My Listings" will stay empty until that's added —
// not a bug here, just something the vehicle-creation flow needs.

const userId = getUserId();

const signedOutMessage = document.getElementById("signed-out-message");
const profileContent = document.getElementById("profile-content");

if (!isSignedIn()) {
  signedOutMessage.hidden = false;
  profileContent.hidden = true;
}

const tabListings = document.getElementById("tab-listings");
const tabBookings = document.getElementById("tab-bookings");
const panelListings = document.getElementById("panel-listings");
const panelBookings = document.getElementById("panel-bookings");

const editBtn = document.getElementById("edit-profile-btn");
const editForm = document.getElementById("edit-profile-form");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const profileName = document.getElementById("profile-name");
const profileBio = document.getElementById("profile-bio");
const profileAvatar = document.getElementById("profile-avatar");
const profileRating = document.getElementById("profile-rating");

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function renderRating(score, count) {
  const rounded = Math.round(score || 0);
  const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);
  profileRating.innerHTML = `<span class="star">${stars}</span> ${(score || 0).toFixed(1)} reputation (${count || 0} reviews)`;
}

function showListingsTab() {
  tabListings.classList.add("active");
  tabBookings.classList.remove("active");
  panelListings.hidden = false;
  panelBookings.hidden = true;
}

function showBookingsTab() {
  tabBookings.classList.add("active");
  tabListings.classList.remove("active");
  panelBookings.hidden = false;
  panelListings.hidden = true;
}

tabListings.addEventListener("click", showListingsTab);
tabBookings.addEventListener("click", showBookingsTab);

// --- Load real profile info into the header ---
async function loadProfile() {
  if (!isSignedIn()) return;
  const res = await authFetch(`/api/users/${userId}`);
  if (!res.ok) return;
  const user = await res.json();

  profileName.textContent = user.name || "NeedARide user";
  profileBio.textContent = user.bio || "No bio yet.";
  profileAvatar.textContent = initials(user.name);
  renderRating(user.reputationScore, user.reviewCount);

  // Pre-fill the edit form with current values.
  document.getElementById("edit-name").value = user.name || "";
  document.getElementById("edit-bio").value = user.bio || "";
}

// --- Edit profile toggle ---
editBtn.addEventListener("click", () => {
  editForm.hidden = false;
  editBtn.hidden = true;
});
cancelEditBtn.addEventListener("click", () => {
  editForm.hidden = true;
  editBtn.hidden = false;
});
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newName = document.getElementById("edit-name").value.trim();
  const newBio = document.getElementById("edit-bio").value.trim();

  try {
    const res = await authFetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, bio: newBio }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to save profile changes.");
      return;
    }
  } catch (err) {
    console.error("Failed to save profile changes:", err);
    alert("Couldn't reach the server.");
    return;
  }

  profileName.textContent = newName;
  profileAvatar.textContent = initials(newName);
  profileBio.textContent = newBio;
  editForm.hidden = true;
  editBtn.hidden = false;
});

// --- My Listings ---
async function renderMyListings() {
  const grid = document.getElementById("my-listings-grid");
  if (!isSignedIn()) {
    grid.innerHTML = `<p class="empty-state">Sign in to see your listings.</p>`;
    return;
  }
  const res = await authFetch(`/api/users/${userId}/listings`);
  const mine = res.ok ? await res.json() : [];

  if (mine.length === 0) {
    grid.innerHTML = `<p class="empty-state">You haven't listed a vehicle yet.</p>`;
    return;
  }
  grid.innerHTML = mine
    .map(
      (l) => `
      <a class="card" href="item-detail.html?id=${l._id}">
        <div class="card-media">
          <span class="card-price-tag">$${l.pricePerDay}/day</span>
          Photo coming soon
        </div>
        <div class="card-body">
          <h3 class="card-title">${l.title}</h3>
          <p class="card-meta">${l.location}</p>
          <div class="card-footer">
            <span class="card-rating"><span class="star">★</span> ${(l.rating || 0).toFixed(1)} (${l.reviewCount || 0})</span>
          </div>
        </div>
      </a>
    `
    )
    .join("");
}

// --- My Bookings ---
function statusClass(status) {
  if (status === "Confirmed") return "status-confirmed";
  if (status === "Completed") return "status-completed";
  return "status-requested";
}

async function renderMyBookings() {
  const list = document.getElementById("my-bookings-list");
  if (!isSignedIn()) {
    list.innerHTML = `<p class="empty-state">Sign in to see your bookings.</p>`;
    return;
  }

  const [bookingsRes, listingsRes] = await Promise.all([
    authFetch(`/api/users/${userId}/bookings`),
    fetch("/api/listings"),
  ]);
  const bookings = bookingsRes.ok ? await bookingsRes.json() : [];
  const listings = listingsRes.ok ? await listingsRes.json() : [];
  const listingById = Object.fromEntries(listings.map((l) => [l._id, l]));

  if (bookings.length === 0) {
    list.innerHTML = `<p class="empty-state">You haven't booked a vehicle yet.</p>`;
    return;
  }
  list.innerHTML = bookings
    .map((b) => {
      const listing = listingById[b.listingId];
      return `
      <a class="booking-row" href="item-detail.html?id=${b.listingId}">
        <div class="booking-row-main">
          <span class="booking-row-title">${listing ? listing.title : "Vehicle"}</span>
          <span class="booking-row-dates">${b.startDate} → ${b.endDate}</span>
        </div>
        <span class="status-badge ${statusClass(b.status)}">${b.status}</span>
      </a>
    `;
    })
    .join("");
}

loadProfile();
renderMyListings();
renderMyBookings();
