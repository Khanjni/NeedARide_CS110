// item-detail.js — Item Detail page logic
//
// Reviews now come back embedded directly on the listing from
// GET /api/listings/:id — including per-review helpful/not-helpful
// counts and whether the current signed-in user already voted or
// wrote it. Book Now creates a real booking (which auto-creates a
// message thread with the owner). A "Leave a review" form appears
// only when the backend says the current user is eligible
// (renter with a completed, unreviewed booking for this vehicle).

async function getListingById(id) {
  const res = await authFetch(`/api/listings/${id}`);
  if (!res.ok) return null;
  const listing = await res.json();
  return { ...listing, id: listing._id };
}

// Recommendation system (v1): same-category matching, excluding the
// listing currently being viewed. No dedicated endpoint for this yet,
// so we fetch all listings and filter client-side.
async function getSimilarListings(listing) {
  const res = await fetch("/api/listings");
  if (!res.ok) return [];
  const all = await res.json();
  return all
    .map((l) => ({ ...l, id: l._id }))
    .filter((l) => l.type === listing.type && l.id !== listing.id)
    .slice(0, 3);
}

function starString(rating) {
  const r = Math.round(rating || 0);
  return "★".repeat(r) + "☆".repeat(5 - r);
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
        <span>${(listing.rating || 0).toFixed(1)} (${listing.reviewCount || 0} reviews)</span>
      </div>

      <p class="detail-desc">${listing.description || "No description provided yet."}</p>

      <div class="spec-grid">
        <div class="spec-box"><span class="spec-label">MPG</span><span class="spec-value">${listing.mpg}</span></div>
        <div class="spec-box"><span class="spec-label">Seats</span><span class="spec-value">${listing.seats}</span></div>
        <div class="spec-box"><span class="spec-label">Transmission</span><span class="spec-value">${listing.transmission}</span></div>
        <div class="spec-box"><span class="spec-label">Owner</span><span class="spec-value">${listing.ownerName || "—"}</span></div>
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

  document.getElementById("book-btn").addEventListener("click", async () => {
    if (!isSignedIn()) {
      window.location.href = "login.html";
      return;
    }
    try {
      const res = await authFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Couldn't create that booking.");
        return;
      }
      alert("Booking requested! You can message the owner from your Messages page.");
      window.location.href = "messages.html";
    } catch (err) {
      alert("Couldn't reach the server.");
    }
  });
}

async function voteReview(reviewId, helpful) {
  const endpoint = helpful ? "helpful" : "not-helpful";
  const res = await authFetch(`/api/reviews/${reviewId}/${endpoint}`, { method: "POST" });
  if (!res.ok) return null;
  return res.json();
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
      <div class="review-card" data-review-id="${r._id}">
        <div class="review-head">
          <span class="review-author">${r.author}</span>
          <span class="star">${starString(r.rating)}</span>
        </div>
        <p class="review-comment">${r.comment}</p>
        ${
          isSignedIn() && !r.isOwnReview
            ? `
        <div class="review-votes">
          <button type="button" class="vote-btn ${r.helpfulByCurrentUser ? "active" : ""}" data-vote="helpful">
            Helpful (${r.helpfulCount || 0})
          </button>
          <button type="button" class="vote-btn ${r.notHelpfulByCurrentUser ? "active" : ""}" data-vote="not-helpful">
            Not helpful (${r.notHelpfulCount || 0})
          </button>
        </div>`
            : ""
        }
      </div>
    `
    )
    .join("");

  list.querySelectorAll(".vote-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".review-card");
      const reviewId = card.dataset.reviewId;
      const helpful = btn.dataset.vote === "helpful";
      const result = await voteReview(reviewId, helpful);
      if (!result) return;
      const helpfulBtn = card.querySelector('[data-vote="helpful"]');
      const notHelpfulBtn = card.querySelector('[data-vote="not-helpful"]');
      helpfulBtn.textContent = `Helpful (${result.helpfulCount})`;
      notHelpfulBtn.textContent = `Not helpful (${result.notHelpfulCount})`;
      helpfulBtn.classList.toggle("active", result.helpful);
      notHelpfulBtn.classList.toggle("active", result.notHelpful);
    });
  });
}

// --- Leave a review, only shown if the backend says this user is eligible ---
async function renderReviewForm(listingId) {
  const section = document.getElementById("review-form-section");
  if (!isSignedIn()) {
    section.hidden = true;
    return;
  }
  const res = await authFetch(`/api/listings/${listingId}/review-eligibility`);
  const eligibility = res.ok ? await res.json() : { eligible: false };

  if (!eligibility.eligible) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  section.innerHTML = `
    <h2>Leave a review</h2>
    <form id="review-form" class="review-form">
      <div class="field">
        <label for="review-rating">Rating (1–5)</label>
        <select id="review-rating">
          <option value="5">5 — Excellent</option>
          <option value="4">4 — Good</option>
          <option value="3">3 — Okay</option>
          <option value="2">2 — Not great</option>
          <option value="1">1 — Poor</option>
        </select>
      </div>
      <div class="field">
        <label for="review-comment">Comment</label>
        <textarea id="review-comment" rows="3" required></textarea>
      </div>
      <p class="form-error" id="review-error" hidden></p>
      <button type="submit" class="btn btn-primary">Submit review</button>
    </form>
  `;

  document.getElementById("review-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const rating = Number(document.getElementById("review-rating").value);
    const comment = document.getElementById("review-comment").value.trim();
    const errorEl = document.getElementById("review-error");

    try {
      const res = await authFetch(`/api/bookings/${eligibility.bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || "Couldn't submit review.";
        errorEl.hidden = false;
        return;
      }
      // Reload so the new review shows up in the list above.
      window.location.reload();
    } catch (err) {
      errorEl.textContent = "Couldn't reach the server.";
      errorEl.hidden = false;
    }
  });
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
            <span class="card-rating"><span class="star">★</span> ${(l.rating || 0).toFixed(1)}</span>
          </div>
        </div>
      </a>
    `
    )
    .join("");
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    document.getElementById("detail-grid").innerHTML = `<p class="empty-state">No vehicle specified.</p>`;
    return;
  }

  const listing = await getListingById(id);
  if (!listing) {
    document.getElementById("detail-grid").innerHTML =
      `<p class="empty-state">Vehicle not found.</p>`;
    return;
  }

  renderDetail(listing);
  renderReviews(listing);
  renderReviewForm(listing.id);
  renderSimilar(await getSimilarListings(listing));
}

init();
