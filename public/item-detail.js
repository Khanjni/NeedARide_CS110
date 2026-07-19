// item-detail.js — Item Detail page logic
//

async function getListingById(id) {
  const res = await fetch(`http://localhost:3000/api/listings/${id}`);
  if (!res.ok) {
    return null;
  }
  const listing = await res.json();
  return {...listing, id: listing._id};
}

// Recommendation system (v1): same-category matching, excluding the
// listing currently being viewed.
async function getSimilarListings(listing) {
  const res = await fetch('http://localhost:3000/api/listings');
  const allListings = await res.json();
  return allListings .map(l => ({...l, id: l._id})) .filter ((l) => l.type === listing.type && l.id != listing.id) .slice (0,3);

}

function starString(rating) {
  return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
}

function renderDetail(listing) {
  document.title = `${listing.title} — NeedARide`;
  document.getElementById("detail-grid").innerHTML = `
    <div class="detail-media">
      <div class="detail-media-placeholder">Photo coming soon</div>
    </div>
    <div class="detail-info">
      <h1 class="detail-title">${listing.title}</h1>
      <p class="detail-location">${listing.location}</p>

      <div class="detail-rating">
        <span class="star">${starString(listing.rating)}</span>
        <span>${listing.rating.toFixed(1)} (${listing.reviewCount} reviews)</span>
      </div>

      <p class="detail-desc">${listing.description}</p>

      <div class="spec-grid">
        <div class="spec-box"><span class="spec-label">MPG</span><span class="spec-value">${listing.mpg}</span></div>
        <div class="spec-box"><span class="spec-label">Seats</span><span class="spec-value">${listing.seats}</span></div>
        <div class="spec-box"><span class="spec-label">Transmission</span><span class="spec-value">${listing.transmission}</span></div>
        <div class="spec-box"><span class="spec-label">Owner</span><span class="spec-value">${listing.ownerName}</span></div>
      </div>

      <div class="booking-box">
        <div class="booking-price">
          <span class="booking-price-num">$${listing.pricePerDay}</span>
          <span class="booking-price-unit">/ day</span>
        </div>
        <button class="btn btn-primary book-btn" id="book-btn">Book now</button>
        <p class="booking-note">You won't be charged yet — the owner confirms your request first.</p>
      </div>
    </div>
  `;

  document.getElementById("book-btn").addEventListener("click", () => {
    alert("Booking request flow goes here once the backend is connected.");
  });
}

function renderReviews(listing) {
  const list = document.getElementById("reviews-list");
  if (!listing.reviews || listing.reviews.length === 0) {
    list.innerHTML = `<p class="empty-state">No reviews yet.</p>`;
    return;
  }
  list.innerHTML = listing.reviews
    .map(
      (r) => `
      <div class="review-card">
        <div class="review-head">
          <span class="review-author">${r.author}</span>
          <span class="star">${starString(r.rating)}</span>
        </div>
        <p class="review-comment">${r.comment}</p>
      </div>
    `
    )
    .join("");
}

function renderSimilar(listings) {
  const grid = document.getElementById("similar-grid");
  if (listings.length === 0) {
    grid.innerHTML = `<p class="empty-state">No similar vehicles found.</p>`;
    return;
  }
  grid.innerHTML = listings
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
            <span class="card-rating"><span class="star">★</span> ${l.rating.toFixed(1)}</span>
          </div>
        </div>
      </a>
    `
    )
    .join("");
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "1"; // fallback so the page still works if opened directly

  const listing = await getListingById(id);
  if (!listing) {
    document.getElementById("detail-grid").innerHTML =
      `<p class="empty-state">Vehicle not found.</p>`;
    return;
  }

  renderDetail(listing);
  renderReviews(listing);
  renderSimilar(await getSimilarListings(listing));
}

init();
