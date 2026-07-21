const API_BASE = "http://localhost:3000";
const userId = localStorage.getItem("userId");
const authToken = localStorage.getItem("authToken");
const authHeaders = { Authorization: `Bearer ${authToken}` };
let threads = [];
let activeThreadId = null;
const messageInput = document.getElementById("thread-input");
const sendButton = document.getElementById("thread-send") || document.querySelector("#thread-input-form button");

function threadId(thread) {
  return String(thread._id || thread.id || "");
}

function setComposerEnabled(enabled) {
  messageInput.disabled = !enabled;
  sendButton.disabled = !enabled;
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

function renderThreadList() {
  const container = document.getElementById("thread-list");
  if (threads.length === 0) {
    container.innerHTML = `<p class="empty-state">No conversations yet. Conversations appear after you book a vehicle.</p>`;
    setComposerEnabled(false);
    return;
  }
  container.innerHTML = threads.map((thread) => {
    const id = threadId(thread);
    const messages = Array.isArray(thread.messages) ? thread.messages : [];
    const lastMessage = messages[messages.length - 1];
    return `
      <button class="thread-item ${id === activeThreadId ? "active" : ""}" data-thread-id="${id}">
        <span class="thread-item-name">${escapeHtml(thread.otherPerson)}</span>
        <span class="thread-item-listing">${escapeHtml(thread.listingTitle)}</span>
        <span class="thread-item-preview">${lastMessage ? escapeHtml(lastMessage.text) : "No messages yet"}</span>
      </button>
    `;
  }).join("");
  container.querySelectorAll(".thread-item").forEach((button) => {
    button.addEventListener("click", () => {
      activeThreadId = button.dataset.threadId;
      renderThreadList();
      renderActiveThread();
    });
  });
}

function renderActiveThread() {
  const thread = threads.find((item) => threadId(item) === activeThreadId);
  const head = document.getElementById("thread-panel-head");
  const messagesEl = document.getElementById("thread-messages");
  if (!thread) {
    head.innerHTML = "";
    messagesEl.innerHTML = `<p class="empty-state">Select a conversation.</p>`;
    setComposerEnabled(false);
    return;
  }
  setComposerEnabled(true);
  head.innerHTML = `
    <span class="thread-panel-name">${escapeHtml(thread.otherPerson)}</span>
    <a class="thread-panel-listing" href="item-detail.html?id=${thread.listingId}">${escapeHtml(thread.listingTitle)}</a>
  `;
  const messages = Array.isArray(thread.messages) ? thread.messages : [];
  messagesEl.innerHTML = messages.map((message) => {
    const fromMe = message.senderId === userId;
    const sentAt = message.sentAt ? new Date(message.sentAt).toLocaleString() : "";
    return `
      <div class="msg-bubble-row ${fromMe ? "from-me" : "from-them"}">
        <div class="msg-bubble">
          <p class="msg-text">${escapeHtml(message.text)}</p>
          <span class="msg-time">${sentAt}</span>
        </div>
      </div>
    `;
  }).join("");
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadThreads() {
  try {
    const res = await fetch(`${API_BASE}/api/users/${userId}/threads`, { headers: authHeaders });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "login.html";
      return;
    }
    if (!res.ok) throw new Error("Threads request failed");
    const responseThreads = await res.json();
    threads = Array.isArray(responseThreads) ? responseThreads : [];
    if (!threads.some((thread) => threadId(thread) === activeThreadId)) {
      activeThreadId = threads.length > 0 ? threadId(threads[0]) : null;
    }
    renderThreadList();
    renderActiveThread();
  } catch (error) {
    document.getElementById("thread-list").innerHTML = `<p class="empty-state">Messages are unavailable while the backend is offline.</p>`;
    document.getElementById("thread-panel-head").innerHTML = "";
    document.getElementById("thread-messages").innerHTML = `<p class="empty-state">Reconnect the backend to load your conversations.</p>`;
    setComposerEnabled(false);
  }
}

document.getElementById("thread-input-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !activeThreadId) return;
  try {
    const res = await fetch(`${API_BASE}/api/threads/${activeThreadId}/messages`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      alert((await res.json()).error);
      return;
    }
    const message = await res.json();
    const thread = threads.find((item) => threadId(item) === activeThreadId);
    if (thread) {
      if (!Array.isArray(thread.messages)) thread.messages = [];
      thread.messages.push(message);
    }
    messageInput.value = "";
    renderThreadList();
    renderActiveThread();
  } catch (error) {
    alert("Your message could not be sent while the backend is offline.");
  }
});

if (!userId || !authToken) {
  window.location.href = "login.html";
} else {
  loadThreads();
}
