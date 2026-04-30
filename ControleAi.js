const AI = {
  messagesBox: null,
  API_URL: null,
  currentMode: 'auto',

  history: [],

  init(box, api) {
    this.messagesBox = document.getElementById(box);
    this.API_URL = api;
  },

  /* =========================
     👤 USER MESSAGE
  ========================= */
  user(text) {
    const wrap = document.createElement("div");
    wrap.className = "msg-wrapper";

    const div = document.createElement("div");
    div.className = "msg user";
    div.textContent = text;

    wrap.appendChild(div);
    this.messagesBox.appendChild(wrap);

    this.history.push({ role: "user", content: text });

    this.scroll();
  },

  /* =========================
     🧠 THINKING UI
  ========================= */
  thinking() {
    const wrap = document.createElement("div");
    wrap.className = "msg-wrapper ai";

    const div = document.createElement("div");
    div.className = "msg ai";
    div.innerHTML = "🤖 Thinking...";

    wrap.appendChild(div);
    this.messagesBox.appendChild(wrap);

    this.scroll();
    return wrap;
  },

  /* =========================
     🤖 ASK AI
  ========================= */
  async ask(message) {
    const loader = this.thinking();

    try {

      const payload = {
        message,
        mode: this.currentMode,
        history: this.history.slice(-10)
      };

      const res = await fetch(this.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      loader.remove();

      const reply = data?.reply || "No response";

      this.history.push({ role: "assistant", content: reply });

      this.stream(reply);

    } catch (err) {
      loader.remove();

      this.error("API Error / Connection Failed");
    }
  },

  /* =========================
     🌊 STREAM TYPE EFFECT
  ========================= */
  async stream(text) {
    const wrap = document.createElement("div");
    wrap.className = "msg-wrapper ai";

    const div = document.createElement("div");
    div.className = "msg ai";

    wrap.appendChild(div);
    this.messagesBox.appendChild(wrap);

    const words = text.split(" ");

    for (let w of words) {
      div.textContent += w + " ";
      this.scroll();
      await new Promise(r => setTimeout(r, 15));
    }

    this.addCopy(div, text);
  },

  /* =========================
     📋 COPY BUTTON
  ========================= */
  addCopy(element, text) {
    const btn = document.createElement("button");
    btn.textContent = "Copy";
    btn.className = "copy-btn";

    btn.onclick = () => {
      navigator.clipboard.writeText(text);
      btn.textContent = "Copied";
      setTimeout(() => btn.textContent = "Copy", 1500);
    };

    element.appendChild(btn);
  },

  /* =========================
     ❌ ERROR
  ========================= */
  error(msg) {
    const div = document.createElement("div");
    div.className = "msg ai error";
    div.textContent = msg;
    this.messagesBox.appendChild(div);
  },

  /* =========================
     📜 SCROLL
  ========================= */
  scroll() {
    this.messagesBox.scrollTop = this.messagesBox.scrollHeight;
  }
};
