/* ================================================================
   IlyassAgentAI — ControleAi.js  (Grok-level features)
   ================================================================ */

const AI = {
  messagesBox:           null,
  API_URL:               null,
  currentMode:           'auto',
  abortController:       null,
  conversations:         [],
  currentConvId:         null,
  isStreaming:           false,

  /* ──────────────────────────────────────────────
     SYNTAX HIGHLIGHT
  ────────────────────────────────────────────── */
  highlight(code) {
    return code
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/(\/\/[^\n]*)/g,           '<span class="cmt">$1</span>')
      .replace(/(#[^\n]*)/g,              '<span class="cmt">$1</span>')
      .replace(/(["'`])(.*?)\1/g,         '<span class="str">$1$2$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g,        '<span class="num">$1</span>')
      .replace(/\b(import|export|from|default|return|if|else|for|while|do|switch|case|break|continue|function|const|let|var|class|new|this|super|extends|async|await|try|catch|finally|throw|typeof|instanceof|in|of|null|undefined|true|false|void|delete)\b/g,
               '<span class="kw">$1</span>')
      .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, '<span class="fn">$1</span>(');
  },

  /* ──────────────────────────────────────────────
     MARKDOWN PARSER
  ────────────────────────────────────────────── */
  parseMarkdown(text) {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // inline code
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // links
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Process lines
    const lines  = html.split('\n');
    const result = [];
    let inUL = false, inOL = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // headings
      const h3 = line.match(/^###\s+(.+)/);
      const h2 = line.match(/^##\s+(.+)/);
      const h1 = line.match(/^#\s+(.+)/);
      if (h3) { this._closeList(result, inUL, inOL); inUL=false; inOL=false; result.push(`<h3>${h3[1]}</h3>`); continue; }
      if (h2) { this._closeList(result, inUL, inOL); inUL=false; inOL=false; result.push(`<h2>${h2[1]}</h2>`); continue; }
      if (h1) { this._closeList(result, inUL, inOL); inUL=false; inOL=false; result.push(`<h1>${h1[1]}</h1>`); continue; }

      // blockquote
      const bq = line.match(/^>\s+(.+)/);
      if (bq) { this._closeList(result, inUL, inOL); inUL=false; inOL=false; result.push(`<blockquote>${bq[1]}</blockquote>`); continue; }

      // unordered list
      const ul = line.match(/^[-*+]\s+(.+)/);
      if (ul) { if (!inUL) { this._closeOL(result, inOL); inOL=false; result.push('<ul>'); inUL=true; } result.push(`<li>${ul[1]}</li>`); continue; }

      // ordered list
      const ol = line.match(/^\d+\.\s+(.+)/);
      if (ol) { if (!inOL) { this._closeUL(result, inUL); inUL=false; result.push('<ol>'); inOL=true; } result.push(`<li>${ol[1]}</li>`); continue; }

      // close lists
      if (inUL) { result.push('</ul>'); inUL=false; }
      if (inOL) { result.push('</ol>'); inOL=false; }

      // empty line = paragraph break
      if (!line.trim()) { result.push('<br>'); continue; }

      result.push(`<p>${line}</p>`);
    }

    if (inUL) result.push('</ul>');
    if (inOL) result.push('</ol>');

    return result.join('');
  },

  _closeList(arr, ul, ol) { if (ul) arr.push('</ul>'); if (ol) arr.push('</ol>'); },
  _closeUL(arr, ul)       { if (ul) arr.push('</ul>'); },
  _closeOL(arr, ol)       { if (ol) arr.push('</ol>'); },

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  init(boxId, apiUrl) {
    this.messagesBox = document.getElementById(boxId);
    this.API_URL     = apiUrl;
    this.loadConversations();
    this._bindScrollBtn();
  },

  /* ──────────────────────────────────────────────
     SCROLL-TO-BOTTOM BINDING
  ────────────────────────────────────────────── */
  _bindScrollBtn() {
    const box = this.messagesBox;
    if (!box) return;
    box.addEventListener('scroll', () => {
      const btn = document.getElementById('scrollDownBtn');
      if (!btn) return;
      const distFromBottom = box.scrollHeight - box.scrollTop - box.clientHeight;
      btn.classList.toggle('visible', distFromBottom > 120);
    });
  },

  /* ──────────────────────────────────────────────
     CONVERSATION PERSISTENCE
  ────────────────────────────────────────────── */
  loadConversations() {
    try { this.conversations = JSON.parse(localStorage.getItem('aiConvs') || '[]'); }
    catch { this.conversations = []; }
    this._renderSidebar();
  },

  _saveToStorage() {
    localStorage.setItem('aiConvs', JSON.stringify(this.conversations.slice(0, 50)));
  },

  _saveMessage(role, text) {
    if (!this.currentConvId) this.currentConvId = Date.now().toString();
    let conv = this.conversations.find(c => c.id === this.currentConvId);
    if (!conv) {
      conv = { id: this.currentConvId, title: this._makeTitle(text), msgs: [], at: Date.now() };
      this.conversations.unshift(conv);
    }
    conv.msgs.push({ role, text, t: Date.now() });
    this._saveToStorage();
    this._renderSidebar();
  },

  _makeTitle(text) {
    return text.replace(/[#*`]/g, '').slice(0, 45).trim() + (text.length > 45 ? '…' : '');
  },

  _renderSidebar() {
    const el = document.getElementById('conversationsList');
    if (!el) return;

    if (!this.conversations.length) {
      el.innerHTML = '<div class="no-conversations">No conversations yet</div>';
      return;
    }

    // Group by date
    const now = Date.now();
    const groups = { 'Today': [], 'Yesterday': [], 'This Week': [], 'Earlier': [] };
    this.conversations.forEach(c => {
      const diff = (now - c.at) / 86400000;
      if (diff < 1)       groups['Today'].push(c);
      else if (diff < 2)  groups['Yesterday'].push(c);
      else if (diff < 7)  groups['This Week'].push(c);
      else                groups['Earlier'].push(c);
    });

    let html = '';
    for (const [label, items] of Object.entries(groups)) {
      if (!items.length) continue;
      html += `<div class="conv-group-label">${label}</div>`;
      items.forEach(c => {
        const active = c.id === this.currentConvId ? 'active' : '';
        html += `
          <div class="conv-item ${active}" data-id="${c.id}" onclick="AI.loadConv('${c.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" flex-shrink="0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="conv-title">${c.title}</span>
            <button class="conv-del-btn" onclick="event.stopPropagation(); AI.deleteConv('${c.id}')" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`;
      });
    }
    el.innerHTML = html;
  },

  loadConv(id) {
    const conv = this.conversations.find(c => c.id === id);
    if (!conv) return;
    this.currentConvId = id;

    // Show chat view
    const hv = document.getElementById('homeView');
    const cv = document.getElementById('chatView');
    if (hv) hv.style.display = 'none';
    if (cv) cv.style.display = 'flex';

    // Render messages
    if (this.messagesBox) {
      this.messagesBox.innerHTML = '';
      conv.msgs.forEach(m => {
        if (m.role === 'user') this._renderUserMsg(m.text, false);
        else                   this._renderAIMsg(m.text);
      });
    }
    this._renderSidebar();
  },

  deleteConv(id) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    this._saveToStorage();
    if (this.currentConvId === id) {
      this.currentConvId = null;
      const hv = document.getElementById('homeView');
      const cv = document.getElementById('chatView');
      if (hv) hv.style.display = 'flex';
      if (cv) cv.style.display = 'none';
      if (this.messagesBox) this.messagesBox.innerHTML = '';
    }
    this._renderSidebar();
    showToast('Conversation deleted');
  },

  /* ──────────────────────────────────────────────
     RENDER USER MESSAGE
  ────────────────────────────────────────────── */
  _renderUserMsg(text, save = true) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'msg user';
    bubble.textContent = text;

    // Edit button
    const actions = document.createElement('div');
    actions.className = 'msg-actions user-actions';
    actions.innerHTML = `
      <button class="msg-action-btn" title="Edit" onclick="AI._editMsg(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Edit
      </button>
      <button class="msg-action-btn" title="Copy" onclick="AI._copyText(this,'${this._esc(text)}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>`;

    wrapper.appendChild(bubble);
    wrapper.appendChild(actions);
    this.messagesBox.appendChild(wrapper);
    if (save) { this._saveMessage('user', text); this.scroll(); }
  },

  user(text) {
    this._renderUserMsg(text, true);
  },

  _esc(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  },

  _editMsg(btn) {
    const wrapper = btn.closest('.msg-wrapper');
    const bubble  = wrapper.querySelector('.msg.user');
    const old     = bubble.textContent;
    bubble.contentEditable = 'true';
    bubble.focus();
    // select all
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(bubble);
    sel.removeAllRanges();
    sel.addRange(range);

    bubble.onblur = () => {
      bubble.contentEditable = 'false';
    };
    bubble.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        bubble.contentEditable = 'false';
        const newText = bubble.textContent.trim();
        if (newText && newText !== old) {
          // Remove everything after this message
          let next = wrapper.nextElementSibling;
          while (next) { const n = next.nextElementSibling; next.remove(); next = n; }
          AI.ask(newText);
        }
      }
      if (e.key === 'Escape') {
        bubble.textContent = old;
        bubble.contentEditable = 'false';
      }
    };
  },

  /* ──────────────────────────────────────────────
     THINKING INDICATOR
  ────────────────────────────────────────────── */
  thinking() {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper ai';

    wrapper.innerHTML = `
      <div class="ai-avatar">
        <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14">
          <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 3.5c2.006 0 3.89.524 5.522 1.44L7.94 21.522A10.45 10.45 0 0 1 5.5 16C5.5 9.649 10.649 4.5 17 4.5h-1zm0 21c-2.006 0-3.89-.524-5.522-1.44L24.06 10.478A10.45 10.45 0 0 1 26.5 16c0 6.351-5.149 11.5-11.5 11.5h1z"/>
        </svg>
      </div>
      <div class="thinking-container">
        <div class="loader-dots"><span></span><span></span><span></span></div>
        <span class="thinking-text">Thinking…</span>
      </div>`;

    this.messagesBox.appendChild(wrapper);
    this.scroll();
    return wrapper;
  },

  /* ──────────────────────────────────────────────
     ASK  (with AbortController + stop btn)
  ────────────────────────────────────────────── */
  async ask(message) {
    this.isStreaming = true;
    this._setStopBtn(true);

    this.abortController = new AbortController();
    const load = this.thinking();

    try {
      const payload = {
        message,
        files: [],
        mode: this.currentMode,
        timestamp: new Date().toISOString()
      };

      const fileInput = document.getElementById('chatFileInput2') || document.getElementById('homeFileInput') || document.getElementById('chatFileInput');
      if (fileInput && fileInput.files.length > 0) {
        for (let file of fileInput.files) {
          const reader = new FileReader();
          await new Promise(res => { reader.onload = e => { payload.files.push({ name: file.name, type: file.type, data: e.target.result }); res(); }; reader.readAsDataURL(file); });
        }
        if (payload.files.some(f => f.type.startsWith('image/'))) payload.hasImages = true;
      }

      const timeout = this.currentMode === 'thinking' ? 45000 : 15000;

      const res = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.any
          ? AbortSignal.any([this.abortController.signal, AbortSignal.timeout(timeout)])
          : this.abortController.signal
      });

      const data = await res.json();
      load.remove();

      // 🎨 IMAGE RESPONSE — render image card
      if (data?.type === 'image' && data?.imageUrl) {
        const imgPrompt = data.prompt || '';
        const imgHtml = `<div class="ai-image-card">
          <p>🎨 Generated image for: <em>${imgPrompt}</em></p>
          <img src="${data.imageUrl}"
               alt="${imgPrompt}"
               style="max-width:100%;border-radius:12px;margin-top:8px;display:block;"
               onerror="this.alt='⚠️ Image failed to load. Try again.';this.style.display='none';this.parentElement.innerHTML+='<p style=color:red>⚠️ Image failed to load. Try again.</p>'"
          />
          <small style="opacity:0.6;font-size:11px">Powered by Pollinations.ai · Free</small>
        </div>`;
        this._renderHTML(imgHtml);
        this._saveMessage('assistant', `![${imgPrompt}](${data.imageUrl})`);
        return;
      }

      // 💬 TEXT RESPONSE — normal chat
      const reply = data?.reply || data?.message || 'No response from server.';
      await this.streamRender(reply);
      this._saveMessage('assistant', reply);

      // 🔊 VOICE MODE: speak AI response if voice mode is ON
      if (window.voiceModeActive && window.speakText) {
        window.speakText(reply);
      }

    } catch (e) {
      load.remove();
      const msg = e.name === 'AbortError' ? 'Generation stopped.' : 'Connection error. Please try again.';
      this._renderError(msg);
    } finally {
      this.isStreaming = false;
      this.abortController = null;
      this._setStopBtn(false);
    }
  },

  stop() {
    if (this.abortController) this.abortController.abort();
  },

  _setStopBtn(show) {
    // Update both home and chat zone buttons
    ['homeSendBtn','chatSendBtn','sendBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = show ? 'none' : 'flex';
    });
    ['homeStopBtn','chatStopBtn','stopBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = show ? 'flex' : 'none';
    });
  },

  _renderError(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper ai';
    wrapper.innerHTML = `<div class="msg ai error-msg">${msg}</div>`;
    this.messagesBox.appendChild(wrapper);
    this.scroll();
  },

  // 🎨 Render raw HTML block (used for image cards)
  _renderHTML(html) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper ai';
    wrapper.innerHTML = `
      <div class="ai-avatar">
        <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14">
          <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 3.5c2.006 0 3.89.524 5.522 1.44L7.94 21.522A10.45 10.45 0 0 1 5.5 16C5.5 9.649 10.649 4.5 17 4.5h-1zm0 21c-2.006 0-3.89-.524-5.522-1.44L24.06 10.478A10.45 10.45 0 0 1 26.5 16c0 6.351-5.149 11.5-11.5 11.5h1z"/>        </svg>
      </div>
      <div class="msg ai">${html}</div>
      <div class="msg-actions">
        <button class="msg-action-btn copy-btn" title="Copy" onclick="AI._copy(this)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>`;
    this.messagesBox.appendChild(wrapper);
    this.scroll();
  },

  /* ──────────────────────────────────────────────
     STREAM RENDER  (with markdown + actions)
  ────────────────────────────────────────────── */
  async streamRender(fullText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper ai';

    // AI avatar
    wrapper.innerHTML = `
      <div class="ai-avatar">
        <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14">
          <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 3.5c2.006 0 3.89.524 5.522 1.44L7.94 21.522A10.45 10.45 0 0 1 5.5 16C5.5 9.649 10.649 4.5 17 4.5h-1zm0 21c-2.006 0-3.89-.524-5.522-1.44L24.06 10.478A10.45 10.45 0 0 1 26.5 16c0 6.351-5.149 11.5-11.5 11.5h1z"/>
        </svg>
      </div>`;

    const container = document.createElement('div');
    container.className = 'msg ai';
    wrapper.appendChild(container);
    this.messagesBox.appendChild(wrapper);

    // Split on code fences
    const parts = fullText.split(/```(\w*)\n?([\s\S]*?)```/g);
    let plainText = '';

    if (parts.length === 1) {
      // No code blocks — stream word by word
      plainText = fullText;
      const div = document.createElement('div');
      div.className = 'ai-text';
      container.appendChild(div);
      const words = fullText.split(' ');
      for (const word of words) {
        if (!this.isStreaming && this.abortController === null) break;
        div.innerHTML = this.parseMarkdown(plainText.slice(0, div.innerText.length + word.length + 1));
        this.scroll();
        await new Promise(r => setTimeout(r, 12 + Math.random() * 18));
      }
      div.innerHTML = this.parseMarkdown(fullText);
    } else {
      // Has code blocks — use regex split: [text, lang, code, text, lang, code, ...]
      const segments = fullText.split(/(```(?:\w+)?\n[\s\S]*?```)/g);
      for (const seg of segments) {
        const codeMatch = seg.match(/```(\w*)\n?([\s\S]*?)```/);
        if (codeMatch) {
          const lang = codeMatch[1] || 'code';
          const code = codeMatch[2].trim();
          container.appendChild(this._codeBlock(lang, code));
        } else if (seg.trim()) {
          plainText += seg;
          const div = document.createElement('div');
          div.className = 'ai-text';
          div.innerHTML = this.parseMarkdown(seg);
          container.appendChild(div);
        }
        this.scroll();
      }
    }

    // Action buttons
    this._addAIActions(wrapper, fullText);
    this.scroll();
  },

  _renderAIMsg(text) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper ai';
    wrapper.innerHTML = `
      <div class="ai-avatar">
        <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14">
          <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 3.5c2.006 0 3.89.524 5.522 1.44L7.94 21.522A10.45 10.45 0 0 1 5.5 16C5.5 9.649 10.649 4.5 17 4.5h-1zm0 21c-2.006 0-3.89-.524-5.522-1.44L24.06 10.478A10.45 10.45 0 0 1 26.5 16c0 6.351-5.149 11.5-11.5 11.5h1z"/>
        </svg>
      </div>`;
    const container = document.createElement('div');
    container.className = 'msg ai';
    container.innerHTML = this.parseMarkdown(text);
    wrapper.appendChild(container);
    this._addAIActions(wrapper, text);
    this.messagesBox.appendChild(wrapper);
  },

  /* ──────────────────────────────────────────────
     CODE BLOCK BUILDER
  ────────────────────────────────────────────── */
  _codeBlock(lang, code) {
    const box = document.createElement('div');
    box.className = 'code-box';

    const header = document.createElement('div');
    header.className = 'code-header';
    header.innerHTML = `
      <span class="code-lang">${lang}</span>
      <button class="copy-btn" onclick="AI._copyCode(this, this.parentElement.nextElementSibling.querySelector('code'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>`;

    const pre  = document.createElement('pre');
    const code_el = document.createElement('code');
    code_el.innerHTML = this.highlight(code);
    pre.appendChild(code_el);

    box.appendChild(header);
    box.appendChild(pre);
    return box;
  },

  _copyCode(btn, codeEl) {
    if (!codeEl) return;
    navigator.clipboard.writeText(codeEl.innerText || codeEl.textContent).then(() => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => { btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 2000);
    });
  },

  /* ──────────────────────────────────────────────
     AI MESSAGE ACTION BAR
  ────────────────────────────────────────────── */
  _addAIActions(wrapper, fullText) {
    const bar = document.createElement('div');
    bar.className = 'msg-actions ai-actions';
    bar.innerHTML = `
      <button class="msg-action-btn" title="Copy" onclick="AI._copyText(this, \`${this._esc(fullText)}\`)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
      <button class="msg-action-btn like-btn" title="Good response" onclick="AI._react(this,'like')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
      </button>
      <button class="msg-action-btn dislike-btn" title="Bad response" onclick="AI._react(this,'dislike')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
      </button>
      <button class="msg-action-btn" title="Read aloud" onclick="AI._speak(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      </button>
      <button class="msg-action-btn" title="Regenerate" onclick="AI._regenerate(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.76"/></svg>
      </button>`;
    wrapper.appendChild(bar);
  },

  _copyText(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
      btn.style.color = '#4ade80';
      showToast('Copied to clipboard');
      setTimeout(() => btn.style.color = '', 1500);
    });
  },

  _react(btn, type) {
    const bar = btn.closest('.msg-actions');
    bar.querySelectorAll('.like-btn,.dislike-btn').forEach(b => b.classList.remove('reacted'));
    btn.classList.toggle('reacted');
    showToast(type === 'like' ? 'Feedback noted 👍' : 'Feedback noted 👎');
  },

  _speak(btn) {
    const wrapper  = btn.closest('.msg-wrapper');
    const textEl   = wrapper.querySelector('.msg.ai');
    const text     = textEl ? textEl.innerText || textEl.textContent : '';
    if (!text) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      btn.classList.remove('speaking');
      return;
    }

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9; utt.lang = 'en-US';
    const voices = speechSynthesis.getVoices();
    const best = voices.find(v => /Google|Microsoft|Apple/i.test(v.name)) || voices[0];
    if (best) utt.voice = best;

    btn.classList.add('speaking');
    utt.onend = utt.onerror = () => btn.classList.remove('speaking');
    speechSynthesis.speak(utt);
  },

  _regenerate(btn) {
    const wrapper  = btn.closest('.msg-wrapper');
    // find previous user message
    let prev = wrapper.previousElementSibling;
    while (prev && !prev.querySelector('.msg.user')) prev = prev.previousElementSibling;
    const text = prev?.querySelector('.msg.user')?.textContent?.trim();
    if (!text) return;

    wrapper.remove();
    this.ask(text);
  },

  /* ──────────────────────────────────────────────
     IMAGE ANALYSIS
  ────────────────────────────────────────────── */
  async analyzeImages(files) {
    const out = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const data = await new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(f);
      });
      out.push({ name: f.name, type: f.type, data, size: f.size });
    }
    return out;
  },

  /* ──────────────────────────────────────────────
     LEGACY VOICE BUTTON (kept for backwards compat)
  ────────────────────────────────────────────── */
  addVoiceButton() {},

  speakText(text, btn) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9; utt.lang = 'en-US';
    speechSynthesis.speak(utt);
  },

  /* ──────────────────────────────────────────────
     SCROLL
  ────────────────────────────────────────────── */
  scroll() {
    if (!this.messagesBox) return;
    this.messagesBox.scrollTo({ top: this.messagesBox.scrollHeight, behavior: 'smooth' });
  },
};
