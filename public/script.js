// script.js — Index page logic
// Renders vehicle cards and handles search/filter/sort.
//

const grid = document.getElementById("listing-grid");
const emptyState = document.getElementById("empty-state");
const resultsHeading = document.getElementById("results-heading");
const searchForm = document.getElementById("search-form");
const sortSelect = document.getElementById("sort");

async function getListings() {
  const res = await fetch('http://localhost:3000/api/listings');
  return await res.json();
}

// Builds the HTML for a single listing card.
function renderCard(listing) {
  const stars = "★".repeat(Math.round(listing.rating));
  return `
    <a class="card" href="item-detail.html?id=${listing._id}">
      <div class="card-media">
        <span class="card-price-tag">$${listing.pricePerDay}/day</span>
        Photo coming soon
      </div>
      <div class="card-body">
        <h3 class="card-title">${listing.title}</h3>
        <p class="card-meta">${listing.location}</p>
        <div class="card-specs">
          <span class="spec-chip">${listing.mpg} MPG</span>
          <span class="spec-chip">${listing.seats} seats</span>
          <span class="spec-chip">${listing.transmission}</span>
        </div>
        <div class="card-footer">
          <span class="card-rating"><span class="star">${stars}</span> ${listing.rating.toFixed(1)} (${listing.reviewCount})</span>
        </div>
      </div>
    </a>
  `;
}

function renderListings(listings) {
  if (listings.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    resultsHeading.textContent = "No results";
    return;
  }
  emptyState.hidden = true;
  resultsHeading.textContent = `Available now (${listings.length})`;
  grid.innerHTML = listings.map(renderCard).join("");
}

// Applies the current search form values + sort order to the full list.
function applyFilters(allListings) {
  const location = document.getElementById("location").value.trim().toLowerCase();
  const vehicleType = document.getElementById("vehicle-type").value;
  const maxPrice = document.getElementById("max-price").value;
  const sortBy = sortSelect.value;

  let filtered = allListings.filter((listing) => {
    const matchesLocation =
      !location || listing.location.toLowerCase().includes(location);
    const matchesType = !vehicleType || listing.type === vehicleType;
    const matchesPrice = !maxPrice || listing.pricePerDay <= Number(maxPrice);
    return matchesLocation && matchesType && matchesPrice;
  });

  if (sortBy === "price-asc") {
    filtered = filtered.slice().sort((a, b) => a.pricePerDay - b.pricePerDay);
  } else if (sortBy === "price-desc") {
    filtered = filtered.slice().sort((a, b) => b.pricePerDay - a.pricePerDay);
  }

  return filtered;
}

async function init() {
  const allListings = await getListings();
  renderListings(allListings);

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    renderListings(applyFilters(allListings));
  });

  sortSelect.addEventListener("change", () => {
    renderListings(applyFilters(allListings));
  });
}

init();
