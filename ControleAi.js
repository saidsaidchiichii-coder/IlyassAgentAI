const AI = {
  messagesBox: null,
  API_URL: null,

  init(box, api) {
    this.messagesBox = document.getElementById(box);
    this.API_URL = api;
  },

  user(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper";
    
    const div = document.createElement("div");
    div.className = "msg user";
    div.textContent = text;
    
    wrapper.appendChild(div);
    this.messagesBox.appendChild(wrapper);
    this.scroll();
  },

  thinking() {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper";
    
    const thinkingDiv = document.createElement("div");
    thinkingDiv.className = "msg ai thinking-container";
    thinkingDiv.innerHTML = `
        <div class="loader-dots">
            <span></span><span></span><span></span>
        </div>
        <span class="thinking-text">Thinking...</span>
    `;
    
    wrapper.appendChild(thinkingDiv);
    this.messagesBox.appendChild(wrapper);
    this.scroll();
    return wrapper;
  },

  async ask(message) {
    const load = this.thinking();

    try {
      const res = await fetch(this.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message })
      });

      const data = await res.json();
      load.remove();
      
      let reply = data?.reply || "I'm sorry, I couldn't process that.";
      this.renderAIResponse(reply);

    } catch (e) {
      load.remove();
      const wrapper = document.createElement("div");
      wrapper.className = "msg-wrapper";
      
      const err = document.createElement("div");
      err.className = "msg ai error";
      err.textContent = "Error: Connection Failed.";
      
      wrapper.appendChild(err);
      this.messagesBox.appendChild(wrapper);
    }
  },

  renderAIResponse(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper";
    
    const container = document.createElement("div");
    container.className = "msg ai";
    wrapper.appendChild(container);
    this.messagesBox.appendChild(wrapper);
    
    // Simple typewriter effect
    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            container.textContent += text.charAt(i);
            i++;
            this.scroll();
        } else {
            clearInterval(interval);
        }
    }, 20);
  },

  scroll() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
};
