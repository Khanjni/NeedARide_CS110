// item-detail.js — Item Detail page logic
//

async function getListingById(id) {
  try {
    const authToken = localStorage.getItem("authToken");
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    const res = await fetch(`http://localhost:3000/api/listings/${id}`, { headers });
    if (!res.ok) throw new Error("Listing request failed");
    const listing = await res.json();
    return { ...listing, id: listing._id };
  } catch (error) {
    return MOCK_LISTINGS.find((listing) => listing.id === id) || null;
  }
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

// Recommendation system (v1): same-category matching, excluding the
// listing currently being viewed.
async function getSimilarListings(listing) {
  try {
    const res = await fetch('http://localhost:3000/api/listings');
    if (!res.ok) throw new Error("Listings request failed");
    const allListings = await res.json();
    return allListings
      .map((item) => ({ ...item, id: item._id }))
      .filter((item) => item.type === listing.type && item.id !== listing.id)
      .slice(0, 3);
  } catch (error) {
    return MOCK_LISTINGS
      .filter((item) => item.type === listing.type && item.id !== listing.id)
      .slice(0, 3);
  }
}

function starString(rating) {
  const rounded = Math.round(Number(rating || 0));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
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
        <span>${Number(listing.rating || 0).toFixed(1)} (${listing.reviewCount || 0} reviews)</span>
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

  document.getElementById("book-btn").addEventListener("click", async () => {
    const userId = localStorage.getItem("userId");
    const authToken = localStorage.getItem("authToken");
    if (!userId || !authToken) {
      window.location.href = "login.html";
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error);
        return;
      }
      alert("Booking requested. A conversation with the owner is ready in Messages.");
    } catch (error) {
      alert("Booking is unavailable while the backend is offline.");
    }
  });
}

async function renderReviewForm(listing) {
  const container = document.getElementById("review-form-container");
  const userId = localStorage.getItem("userId");
  const authToken = localStorage.getItem("authToken");
  if (!userId || !authToken) {
    container.innerHTML = `<h3 class="review-form-title">Leave a review</h3><p class="review-status">Sign in to leave a review.</p>`;
    return;
  }
  let res;
  try {
    res = await fetch(`http://localhost:3000/api/listings/${listing.id}/review-eligibility`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  } catch (error) {
    container.innerHTML = `<p class="form-error">Review eligibility is unavailable while the backend is offline.</p>`;
    return;
  }
  if (!res.ok) {
    container.innerHTML = `<p class="form-error">Your review eligibility could not be verified.</p>`;
    return;
  }
  const eligibility = await res.json();
  if (eligibility.userId && eligibility.userId !== userId) {
    container.innerHTML = `<h3 class="review-form-title">Leave a review</h3><p class="form-error">Your browser session does not match this account. Sign in again to leave a review.</p>`;
    return;
  }
  const accountLabel = eligibility.accountEmail
    ? `<p class="review-account">Signed in as ${escapeHtml(eligibility.accountEmail)}</p>`
    : "";
  if (eligibility.listingId && eligibility.listingId !== listing.id) {
    container.innerHTML = `<h3 class="review-form-title">Leave a review</h3><p class="form-error">Review eligibility was returned for a different vehicle. Reload this page and try again.</p>`;
    return;
  }
  if (!eligibility.eligible) {
    container.innerHTML = `<h3 class="review-form-title">Leave a review</h3>${accountLabel}<p class="review-status">${escapeHtml(eligibility.reason || "You are not eligible to review this vehicle yet.")}</p>`;
    return;
  }
  container.innerHTML = `
    <form class="review-form" id="review-form">
      <h3 class="review-form-title">Leave a review</h3>
      ${accountLabel}
      <div class="field">
        <span class="review-rating-label">Rating</span>
        <div class="review-rating-input" role="radiogroup" aria-label="Review rating">
          ${[1, 2, 3, 4, 5].map((rating) => `<button type="button" class="review-rating-star" data-rating="${rating}" role="radio" aria-checked="false" aria-label="${rating} star${rating === 1 ? "" : "s"}">★</button>`).join("")}
        </div>
        <input type="hidden" id="review-rating" value="" />
        <p class="form-error" id="review-rating-error" hidden>Please select a 1–5 star rating.</p>
      </div>
      <div id="review-fields" hidden>
        <div class="field">
          <label for="review-comment">Written review</label>
          <textarea id="review-comment" rows="3" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Submit review</button>
      </div>
    </form>
  `;
  const ratingInput = document.getElementById("review-rating");
  const commentInput = document.getElementById("review-comment");
  const ratingButtons = [...document.querySelectorAll(".review-rating-star")];
  ratingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedRating = Number(button.dataset.rating);
      ratingInput.value = String(selectedRating);
      ratingButtons.forEach((star) => {
        const selected = Number(star.dataset.rating) <= selectedRating;
        star.classList.toggle("selected", selected);
        star.setAttribute("aria-checked", star === button ? "true" : "false");
      });
      document.getElementById("review-rating-error").hidden = true;
      document.getElementById("review-fields").hidden = false;
      commentInput.focus();
    });
  });
  document.getElementById("review-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const rating = Number(ratingInput.value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      document.getElementById("review-rating-error").hidden = false;
      return;
    }
    const reviewRes = await fetch(`http://localhost:3000/api/bookings/${eligibility.bookingId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        rating,
        comment: commentInput.value.trim(),
      }),
    });
    const result = await reviewRes.json();
    if (!reviewRes.ok) {
      alert(result.error);
      return;
    }
    container.innerHTML = "";
    const updatedListing = await getListingById(listing.id);
    renderDetail(updatedListing);
    renderReviews(updatedListing);
    renderReviewForm(updatedListing);
  });
}

function renderReviews(listing) {
  const list = document.getElementById("reviews-list");
  if (!listing.reviews || listing.reviews.length === 0) {
    list.innerHTML = `<p class="empty-state">No reviews yet.</p>`;
    return;
  }
  const loggedIn = Boolean(localStorage.getItem("userId") && localStorage.getItem("authToken"));
  list.innerHTML = listing.reviews
    .map(
      (r) => `
      <div class="review-card">
        <div class="review-head">
          <span class="review-author">${escapeHtml(r.author)}</span>
          <span class="star">${starString(r.rating)}</span>
        </div>
        <p class="review-comment">${escapeHtml(r.comment)}</p>
        <div class="review-votes">
          <button type="button" class="review-helpful${r.helpfulByCurrentUser ? " selected" : ""}" data-review-id="${r._id}" data-vote="helpful" ${!loggedIn || r.isOwnReview ? "disabled" : ""} title="${r.isOwnReview ? "You cannot vote on your own review." : !loggedIn ? "Sign in to vote on reviews." : "Mark this review helpful."}">Helpful${r.helpfulByCurrentUser ? " ✓" : ""} (${r.helpfulCount || 0})</button>
          <button type="button" class="review-helpful${r.notHelpfulByCurrentUser ? " selected" : ""}" data-review-id="${r._id}" data-vote="not-helpful" ${!loggedIn || r.isOwnReview ? "disabled" : ""} title="${r.isOwnReview ? "You cannot vote on your own review." : !loggedIn ? "Sign in to vote on reviews." : "Mark this review not helpful."}">Not helpful${r.notHelpfulByCurrentUser ? " ✓" : ""} (${r.notHelpfulCount || 0})</button>
        </div>
      </div>
    `
    )
    .join("");
  list.querySelectorAll(".review-helpful:not([disabled])").forEach((button) => {
    button.addEventListener("click", async () => {
      const authToken = localStorage.getItem("authToken");
      try {
        const res = await fetch(`http://localhost:3000/api/reviews/${button.dataset.reviewId}/${button.dataset.vote}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const result = await res.json();
        if (!res.ok) {
          alert(result.error);
          return;
        }
        const updatedListing = await getListingById(listing.id);
        renderReviews(updatedListing);
      } catch (error) {
        alert("Helpful votes are unavailable while the backend is offline.");
      }
    });
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
            <span class="card-rating"><span class="star">★</span> ${Number(l.rating || 0).toFixed(1)}</span>
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

  const listing = await getListingById(id);
  if (!listing) {
    document.getElementById("detail-grid").innerHTML =
      `<p class="empty-state">Vehicle not found.</p>`;
    return;
  }

  renderDetail(listing);
  renderReviews(listing);
  renderReviewForm(listing);
  renderSimilar(await getSimilarListings(listing));
}

init();
