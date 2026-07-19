// profile.js — User Profile page logic
//
// NOTE FOR LATER: once the backend exists, replace the mock lookups
// below with real fetch calls scoped to the logged-in user, e.g.:
//   const res = await fetch('/api/users/me/listings');
//   const res = await fetch('/api/users/me/bookings');
// Rendering code can stay the same.

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

// --- Edit profile toggle ---
editBtn.addEventListener("click", () => {
  editForm.hidden = false;
  editBtn.hidden = true;
});
cancelEditBtn.addEventListener("click", () => {
  editForm.hidden = true;
  editBtn.hidden = false;
});
editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const newName = document.getElementById("edit-name").value.trim();
  const newBio = document.getElementById("edit-bio").value.trim();
  if (newName) {
    profileName.textContent = newName;
    profileAvatar.textContent = newName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  profileBio.textContent = newBio;
  editForm.hidden = true;
  editBtn.hidden = false;
  // Placeholder — once the backend exists, PATCH the change to /api/users/me here.
});

// --- My Listings (for now: just show the first 2 mock listings as "mine") ---
function renderMyListings() {
  const mine = MOCK_LISTINGS.slice(0, 2);
  const grid = document.getElementById("my-listings-grid");
  if (mine.length === 0) {
    grid.innerHTML = `<p class="empty-state">You haven't listed a vehicle yet.</p>`;
    return;
  }
  grid.innerHTML = mine
    .map(
      (l) => `
      <a class="card" href="item-detail.html?id=${l.id}">
        <div class="card-media">
          <span class="card-price-tag">$${l.pricePerDay}/day</span>
          Photo coming soon
        </div>
        <div class="card-body">
          <h3 class="card-title">${l.title}</h3>
          <p class="card-meta">${l.location}</p>
          <div class="card-footer">
            <span class="card-rating"><span class="star">★</span> ${l.rating.toFixed(1)} (${l.reviewCount})</span>
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
  if (status === "Requested") return "status-requested";
  return "status-completed";
}

function renderMyBookings() {
  const list = document.getElementById("my-bookings-list");
  if (MOCK_BOOKINGS.length === 0) {
    list.innerHTML = `<p class="empty-state">You haven't booked a vehicle yet.</p>`;
    return;
  }
  list.innerHTML = MOCK_BOOKINGS.map((b) => {
    const listing = MOCK_LISTINGS.find((l) => l.id === b.listingId);
    if (!listing) return "";
    return `
      <a class="booking-row" href="item-detail.html?id=${listing.id}">
        <div class="booking-row-main">
          <span class="booking-row-title">${listing.title}</span>
          <span class="booking-row-dates">${b.startDate} → ${b.endDate}</span>
        </div>
        <span class="status-badge ${statusClass(b.status)}">${b.status}</span>
      </a>
    `;
  }).join("");
}

renderMyListings();
renderMyBookings();
