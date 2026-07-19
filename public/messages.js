// messages.js — Messaging page logic
//
// NOTE FOR LATER: once the backend exists, replace MOCK_THREADS with a
// real fetch, e.g. `fetch('/api/users/me/threads')`, and POST new
// messages to something like `/api/threads/:id/messages`. Rendering
// logic below can stay mostly the same.

let activeThreadId = MOCK_THREADS[0] ? MOCK_THREADS[0].id : null;

function getListingTitle(listingId) {
  const listing = MOCK_LISTINGS.find((l) => l.id === listingId);
  return listing ? listing.title : "Vehicle";
}

function renderThreadList() {
  const container = document.getElementById("thread-list");
  if (MOCK_THREADS.length === 0) {
    container.innerHTML = `<p class="empty-state">No conversations yet.</p>`;
    return;
  }
  container.innerHTML = MOCK_THREADS.map((t) => {
    const lastMsg = t.messages[t.messages.length - 1];
    const isActive = t.id === activeThreadId;
    return `
      <button class="thread-item ${isActive ? "active" : ""}" data-thread-id="${t.id}">
        <span class="thread-item-name">${t.otherPerson}</span>
        <span class="thread-item-listing">${getListingTitle(t.listingId)}</span>
        <span class="thread-item-preview">${lastMsg ? lastMsg.text : ""}</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll(".thread-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeThreadId = btn.dataset.threadId;
      renderThreadList();
      renderActiveThread();
    });
  });
}

function renderActiveThread() {
  const thread = MOCK_THREADS.find((t) => t.id === activeThreadId);
  const head = document.getElementById("thread-panel-head");
  const messagesEl = document.getElementById("thread-messages");

  if (!thread) {
    head.innerHTML = "";
    messagesEl.innerHTML = `<p class="empty-state">Select a conversation.</p>`;
    return;
  }

  head.innerHTML = `
    <span class="thread-panel-name">${thread.otherPerson}</span>
    <a class="thread-panel-listing" href="item-detail.html?id=${thread.listingId}">${getListingTitle(thread.listingId)}</a>
  `;

  messagesEl.innerHTML = thread.messages
    .map(
      (m) => `
      <div class="msg-bubble-row ${m.from === "me" ? "from-me" : "from-them"}">
        <div class="msg-bubble">
          <p class="msg-text">${m.text}</p>
          <span class="msg-time">${m.time}</span>
        </div>
      </div>
    `
    )
    .join("");

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

document.getElementById("thread-input-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("thread-input");
  const text = input.value.trim();
  if (!text) return;

  const thread = MOCK_THREADS.find((t) => t.id === activeThreadId);
  if (!thread) return;

  thread.messages.push({ from: "me", text, time: "Just now" });
  input.value = "";
  renderThreadList();
  renderActiveThread();
  // Placeholder — once the backend exists, POST this message to the server here.
});

renderThreadList();
renderActiveThread();
