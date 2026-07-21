// messages.js — Messaging page logic
//
// Threads now come pre-decorated from the backend with `otherPerson`
// and `listingTitle` already filled in, so no separate lookups are
// needed. Messages use `senderId` (compare against our userId) and
// `sentAt` (an ISO date string) rather than the old mock field names.
//
// KNOWN GAP: there's still no way to start a brand-new thread from
// scratch — threads are only created automatically when a booking is
// made (see item-detail.js). That's expected, not a bug here.

const userId = getUserId();

let threads = [];
let activeThreadId = null;

function formatTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function renderThreadList() {
  const container = document.getElementById("thread-list");
  if (!isSignedIn()) {
    container.innerHTML = `<p class="empty-state">Sign in to see your messages.</p>`;
    return;
  }
  if (threads.length === 0) {
    container.innerHTML = `<p class="empty-state">No conversations yet.</p>`;
    return;
  }
  container.innerHTML = threads
    .map((t) => {
      const msgs = t.messages || [];
      const lastMsg = msgs[msgs.length - 1];
      const isActive = t._id === activeThreadId;
      return `
      <button class="thread-item ${isActive ? "active" : ""}" data-thread-id="${t._id}">
        <span class="thread-item-name">${t.otherPerson || "Conversation"}</span>
        <span class="thread-item-listing">${t.listingTitle || "Vehicle"}</span>
        <span class="thread-item-preview">${lastMsg ? lastMsg.text : "No messages yet"}</span>
      </button>
    `;
    })
    .join("");

  container.querySelectorAll(".thread-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeThreadId = btn.dataset.threadId;
      renderThreadList();
      renderActiveThread();
    });
  });
}

function renderActiveThread() {
  const thread = threads.find((t) => t._id === activeThreadId);
  const head = document.getElementById("thread-panel-head");
  const messagesEl = document.getElementById("thread-messages");

  if (!thread) {
    head.innerHTML = "";
    messagesEl.innerHTML = `<p class="empty-state">Select a conversation.</p>`;
    return;
  }

  head.innerHTML = `
    <span class="thread-panel-name">${thread.otherPerson || "Conversation"}</span>
    <a class="thread-panel-listing" href="item-detail.html?id=${thread.listingId}">${thread.listingTitle || "Vehicle"}</a>
  `;

  messagesEl.innerHTML = (thread.messages || [])
    .map(
      (m) => `
      <div class="msg-bubble-row ${m.senderId === userId ? "from-me" : "from-them"}">
        <div class="msg-bubble">
          <p class="msg-text">${m.text}</p>
          <span class="msg-time">${formatTime(m.sentAt)}</span>
        </div>
      </div>
    `
    )
    .join("");

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

document.getElementById("thread-input-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("thread-input");
  const text = input.value.trim();
  if (!text || !activeThreadId) return;

  let sentMessage;
  try {
    const res = await authFetch(`/api/threads/${activeThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to send message.");
      return;
    }
    sentMessage = await res.json();
  } catch (err) {
    console.error("Failed to send message:", err);
    alert("Couldn't reach the server.");
    return;
  }

  const thread = threads.find((t) => t._id === activeThreadId);
  if (thread) {
    thread.messages = thread.messages || [];
    thread.messages.push(sentMessage);
  }
  input.value = "";
  renderThreadList();
  renderActiveThread();
});

async function init() {
  if (!isSignedIn()) {
    renderThreadList();
    renderActiveThread();
    return;
  }
  const res = await authFetch(`/api/users/${userId}/threads`);
  threads = res.ok ? await res.json() : [];
  activeThreadId = threads[0] ? threads[0]._id : null;
  renderThreadList();
  renderActiveThread();
}

init();
