const API_BASE = "http://localhost:3000";
const userId = localStorage.getItem("userId");
const authToken = localStorage.getItem("authToken");
const authHeaders = { Authorization: `Bearer ${authToken}` };

const tabListings = document.getElementById("tab-listings");
const tabBookings = document.getElementById("tab-bookings");
const panelListings = document.getElementById("panel-listings");
const panelBookings = document.getElementById("panel-bookings");
const editBtn = document.getElementById("edit-profile-btn");
const editForm = document.getElementById("edit-profile-form");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const profileName = document.getElementById("profile-name");
const profileBio = document.getElementById("profile-bio");
const profilePhoto = document.getElementById("profile-photo");
const profileInitials = document.getElementById("profile-initials");
const profileRating = document.getElementById("profile-rating");

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);
}

function showPhoto(name, photoUrl) {
  profileInitials.textContent = initials(name);
  profilePhoto.hidden = !photoUrl;
  profileInitials.hidden = Boolean(photoUrl);
  profilePhoto.src = photoUrl || "";
}

profilePhoto.addEventListener("error", () => {
  profilePhoto.hidden = true;
  profileInitials.hidden = false;
});

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

function statusClass(status) {
  if (status === "Confirmed") return "status-confirmed";
  if (status === "Requested") return "status-requested";
  return "status-completed";
}

async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/users/${userId}`, { headers: authHeaders });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "login.html";
      return;
    }
    if (!res.ok) throw new Error("Profile request failed");
    const profile = await res.json();
    profileName.textContent = profile.name;
    profileBio.textContent = profile.bio || "No bio added yet.";
    showPhoto(profile.name, profile.profilePhoto);
    const reputation = Number(profile.reputationScore || 0);
    profileRating.innerHTML = `<span class="star">${"★".repeat(Math.round(reputation))}${"☆".repeat(5 - Math.round(reputation))}</span> ${reputation.toFixed(1)} reputation (${profile.reviewCount || 0} reviews)`;
    document.getElementById("edit-name").value = profile.name;
    document.getElementById("edit-bio").value = profile.bio || "";
    document.getElementById("edit-photo").value = profile.profilePhoto || "";
  } catch (error) {
    profileName.textContent = "Profile unavailable";
    profileBio.textContent = "Your profile could not be loaded while the backend is offline.";
    profileRating.textContent = "Reputation unavailable";
    editBtn.hidden = true;
  }
}

async function renderMyListings() {
  const grid = document.getElementById("my-listings-grid");
  let mine;
  try {
    const res = await fetch(`${API_BASE}/api/users/${userId}/listings`, { headers: authHeaders });
    if (!res.ok) throw new Error("Listings request failed");
    mine = await res.json();
  } catch (error) {
    grid.innerHTML = `<p class="empty-state">Your listings are unavailable while the backend is offline.</p>`;
    return;
  }
  if (mine.length === 0) {
    grid.innerHTML = `<p class="empty-state">You haven't listed a vehicle yet.</p>`;
    return;
  }
  grid.innerHTML = mine.map((listing) => `
    <a class="card" href="item-detail.html?id=${listing._id}">
      <div class="card-media"><span class="card-price-tag">$${listing.pricePerDay}/day</span>Photo coming soon</div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(listing.title)}</h3>
        <p class="card-meta">${escapeHtml(listing.location)}</p>
        <div class="card-footer"><span class="card-rating"><span class="star">★</span> ${Number(listing.rating || 0).toFixed(1)} (${listing.reviewCount || 0})</span></div>
      </div>
    </a>
  `).join("");
}

async function renderMyBookings() {
  const list = document.getElementById("my-bookings-list");
  let bookings;
  let listings;
  try {
    const [bookingRes, listingRes] = await Promise.all([
      fetch(`${API_BASE}/api/users/${userId}/bookings`, { headers: authHeaders }),
      fetch(`${API_BASE}/api/listings`),
    ]);
    if (!bookingRes.ok || !listingRes.ok) throw new Error("Bookings request failed");
    bookings = await bookingRes.json();
    listings = await listingRes.json();
  } catch (error) {
    list.innerHTML = `<p class="empty-state">Your bookings are unavailable while the backend is offline.</p>`;
    return;
  }
  if (bookings.length === 0) {
    list.innerHTML = `<p class="empty-state">You haven't booked a vehicle yet.</p>`;
    return;
  }
  list.innerHTML = bookings.map((booking) => {
    const listing = listings.find((item) => item._id === booking.listingId);
    return `
      <a class="booking-row" href="item-detail.html?id=${booking.listingId}">
        <div class="booking-row-main">
          <span class="booking-row-title">${listing ? escapeHtml(listing.title) : "Vehicle"}</span>
          <span class="booking-row-dates">${escapeHtml(booking.startDate)} → ${escapeHtml(booking.endDate)}</span>
        </div>
        <span class="status-badge ${statusClass(booking.status)}">${booking.status}</span>
      </a>
    `;
  }).join("");
}

tabListings.addEventListener("click", showListingsTab);
tabBookings.addEventListener("click", showBookingsTab);
editBtn.addEventListener("click", () => {
  editForm.hidden = false;
  editBtn.hidden = true;
});
cancelEditBtn.addEventListener("click", () => {
  editForm.hidden = true;
  editBtn.hidden = false;
});
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const profile = {
    name: document.getElementById("edit-name").value.trim(),
    bio: document.getElementById("edit-bio").value.trim(),
    profilePhoto: document.getElementById("edit-photo").value.trim(),
  };
  try {
    const res = await fetch(`${API_BASE}/api/users/${userId}`, {
      method: "PATCH",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      alert((await res.json()).error);
      return;
    }
    await loadProfile();
    editForm.hidden = true;
    editBtn.hidden = false;
  } catch (error) {
    alert("Profile changes cannot be saved while the backend is offline.");
  }
});

if (!userId || !authToken) {
  window.location.href = "login.html";
} else {
  loadProfile();
  renderMyListings();
  renderMyBookings();
}
