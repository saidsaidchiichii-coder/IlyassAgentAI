/* ================================================================
   IlyassAgentAI — ControleAi.js  (Grok-level features) — FIXED
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
     SYNTAX HIGHLIGHT (FIXED - No HTML classes in output)
  ────────────────────────────────────────────── */
  highlight(code) {
    // First escape HTML entities
    let h = code
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;');

    // Use placeholder system to avoid conflicts
    const spans = [];
    const ph = (html) => { const i = spans.length; spans.push(html); return '\x00' + i + '\x00'; };

    // Strings FIRST — before comments/keywords so quotes don't bleed into span attributes
    h = h.replace(/(`[^`\n]*`)/g,              (_, s) => ph('<span class="str">' + s + '</span>'));
    h = h.replace(/("(?:\\.|[^"\\])*")/g,      (_, s) => ph('<span class="str">' + s + '</span>'));
    h = h.replace(/('(?:\\.|[^'\\])*')/g,      (_, s) => ph('<span class="str">' + s + '</span>'));

    // Comments
    h = h.replace(/(\/\/[^\n]*)/g,  (_, s) => ph('<span class="cmt">' + s + '</span>'));
    h = h.replace(/(#[^\n]*)/g,     (_, s) => ph('<span class="cmt">' + s + '</span>'));

    // Numbers
    h = h.replace(/\b(\d+\.?\d*)\b/g, (_, s) => ph('<span class="num">' + s + '</span>'));

    // Keywords (JS + C++ + Python)
    h = h.replace(/\b(import|export|from|default|return|if|else|for|while|do|switch|case|break|continue|function|const|let|var|class|new|this|super|extends|async|await|try|catch|finally|throw|typeof|instanceof|in|of|null|undefined|true|false|void|delete|int|double|char|float|bool|string|public|private|protected|static|include|using|namespace|std|def|print|pass|lambda|with|as|is|not|and|or|elif|except|raise|global|yield|interface|type|enum)\b/g,
      (_, k) => ph('<span class="kw">' + k + '</span>')
    );

    // Function calls
    h = h.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      (m, fn) => ph('<span class="fn">' + fn + '</span>(')
    );

    // Restore placeholders
    h = h.replace(/\x00(\d+)\x00/g, (_, i) => spans[+i]);
    return h;
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
    localStorage.setItem('aiConvs', JSON.stringify(this.conversations));
  },

  _saveMessage(role, text) {
    if (!this.currentConvId) {
      const id = 'conv_' + Date.now();
      this.currentConvId = id;
      this.conversations.push({ id, title: text.slice(0, 30), msgs: [] });
    }
    const conv = this.conversations.find(c => c.id === this.currentConvId);
    if (conv) {
      conv.msgs.push({ role, text });
      this._saveToStorage();
      this._renderSidebar();
    }
  },

  scroll() {
    if (this.messagesBox) {
      setTimeout(() => { this.messagesBox.scrollTop = this.messagesBox.scrollHeight; }, 10);
    }
  },

  _renderSidebar() {
    const el = document.getElementById('convList');
    if (!el) return;
    let html = '';
    if (this.conversations.length === 0) {
      html = '<div style="padding:12px;color:var(--text-muted);font-size:12px;">No conversations yet</div>';
    } else {
      html = this.conversations.map(c => `
          <div class="conv-item ${c.id === this.currentConvId ? 'active' : ''}" onclick="AI.loadConv('${c.id}')">
            <span class="conv-title">${c.title}</span>
            <button class="conv-del-btn" onclick="event.stopPropagation(); AI.deleteConv('${c.id}')" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`).join('');
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
    wrapper.className = 'msg-row user-row-msg';

    const innerWrapper = document.createElement('div');
    innerWrapper.className = 'msg-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'user-bubble';
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

    innerWrapper.appendChild(bubble);
    innerWrapper.appendChild(actions);
    wrapper.appendChild(innerWrapper);
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
  /* ── THINKING PANEL ── */
  thinking(userMessage) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper ai';

    const topic = this._analyzeIntent(userMessage || '');

    wrapper.innerHTML = `
      <div class="ai-avatar">
        <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14">
          <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 3.5c2.006 0 3.89.524 5.522 1.44L7.94 21.522A10.45 10.45 0 0 1 5.5 16C5.5 9.649 10.649 4.5 17 4.5h-1zm0 21c-2.006 0-3.89-.524-5.522-1.44L24.06 10.478A10.45 10.45 0 0 1 26.5 16c0 6.351-5.149 11.5-11.5 11.5h1z"/>
        </svg>
      </div>
      <div class="thinking-panel">
        <div class="thinking-header">
          <span class="tpulse"></span>
          <span class="thinking-label">Thinking</span>
        </div>
        <div class="thinking-steps">
          <div class="tstep tstep-show">
            <span class="tstep-icon">🔍</span>
            <span class="tstep-txt">The user is asking me for <em>${topic}</em>&hellip;</span>
          </div>
          <div class="tstep" id="ts2_${Date.now()}">
            <span class="tstep-icon">🧠</span>
            <span class="tstep-txt">Analyzing context and finding the best approach&hellip;</span>
          </div>
          <div class="tstep" id="ts3_${Date.now()}">
            <span class="tstep-icon">✍️</span>
            <span class="tstep-txt">Composing a precise, high-quality response&hellip;</span>
          </div>
        </div>
      </div>`;

    this.messagesBox.appendChild(wrapper);
    this.scroll();

    // Stagger animation
    const steps = wrapper.querySelectorAll('.tstep:not(.tstep-show)');
    steps.forEach((s, i) => {
      setTimeout(() => s.classList.add('tstep-show'), (i + 1) * 550);
    });

    return wrapper;
  },

  _analyzeIntent(msg) {
    const m = msg.toLowerCase();
    if (/code|function|script|debug|error|bug|python|javascript|html|css|sql|program|class|method/.test(m)) return 'code or programming help';
    if (/explain|what is|how does|definition|meaning|concept|why|tell me about/.test(m)) return 'an explanation';
    if (/write|essay|email|letter|story|poem|text|draft|article|blog|caption/.test(m)) return 'written content';
    if (/translate|arabic|english|french|spanish|darija|language/.test(m)) return 'a translation';
    if (/summarize|summary|tldr|brief|shorten|condense/.test(m)) return 'a summary';
    if (/compare|difference|vs|versus|better|pros.*cons|which is/.test(m)) return 'a comparison';
    if (/list|steps|how to|tutorial|guide|tips|instructions|walk me through/.test(m)) return 'a step-by-step guide';
    if (/math|calculate|equation|solve|formula|number|compute/.test(m)) return 'a calculation';
    if (/search|find|research|who is|where is|when did|latest|news/.test(m)) return 'research & information';
    if (/fix|improve|optimize|review|refactor|enhance|update/.test(m)) return 'code review or improvement';
    if (/image|photo|picture|generate|imagine|draw|design/.test(m)) return 'image generation';
    const words = msg.trim().split(' ').slice(0, 5).join(' ');
    return '"' + words + (msg.split(' ').length > 5 ? '…' : '') + '"';
  },


  async ask(message) {
    this.isStreaming = true;
    this._setStopBtn(true);

    this.abortController = new AbortController();
    const load = this.thinking(message);

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

      // IMAGE RESPONSE — render image card
      if (data?.type === 'image' && data?.imageUrl) {
        const imgPrompt = data.prompt || '';
        const imgHtml = `<div class="ai-image-card">
          <p>Generated image: <em>${imgPrompt}</em></p>
          <img src="${data.imageUrl}"
               alt="${imgPrompt}"
               style="max-width:100%;border-radius:12px;margin-top:8px;display:block;"
               onerror="this.alt='Image failed to load. Try again.';this.style.display='none';this.parentElement.innerHTML+='<p style=color:red>Failed to load image. Please try again.</p>'"
          />
          <small style="opacity:0.6;font-size:11px">Powered by Pollinations.ai · Free</small>
        </div>`;
        this._renderHTML(imgHtml);
        this._saveMessage('assistant', `![${imgPrompt}](${data.imageUrl})`);
        return;
      }

      // TEXT RESPONSE — normal chat
      const reply = data?.reply || data?.message || 'No response from server.';
      await this.streamRender(reply);
      this._saveMessage('assistant', reply);

      // VOICE MODE: speak AI response if voice mode is ON
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

  // Render raw HTML block (used for image cards)
  _renderHTML(html) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper ai';
    wrapper.innerHTML = `<div class="msg ai">${html}</div>`;
    this._addAIActions(wrapper, html);
    this.messagesBox.appendChild(wrapper);
  },

  /* ──────────────────────────────────────────────
     STREAM RENDER — Typewriter effect
  ────────────────────────────────────────────── */
  async streamRender(fullText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-wrapper ai';
    wrapper.innerHTML = `<div class="ai-avatar">
      <svg viewBox="0 0 32 32" fill="currentColor" width="14" height="14">
        <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 3.5c2.006 0 3.89.524 5.522 1.44L7.94 21.522A10.45 10.45 0 0 1 5.5 16C5.5 9.649 10.649 4.5 17 4.5h-1zm0 21c-2.006 0-3.89-.524-5.522-1.44L24.06 10.478A10.45 10.45 0 0 1 26.5 16c0 6.351-5.149 11.5-11.5 11.5h1z"/>
      </svg>
    </div>`;
    const container = document.createElement('div');
    container.className = 'msg ai';
    wrapper.appendChild(container);
    this.messagesBox.appendChild(wrapper);

    // Check if has code blocks
    const hasCodeBlocks = /```/.test(fullText);

    if (!hasCodeBlocks) {
      // No code blocks — stream as plain text
      let plainText = '';
      const words = fullText.split(/(\s+)/);
      const div = document.createElement('div');
      div.className = 'ai-text';
      container.appendChild(div);

      for (const word of words) {
        plainText += word;
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
     CODE BLOCK BUILDER (FIXED)
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
    // FIXED: Use textContent to avoid rendering HTML classes
    code_el.innerHTML = this.highlight(code);
    pre.appendChild(code_el);

    box.appendChild(header);
    box.appendChild(pre);
    return box;
  },

  _copyCode(btn, codeEl) {
    if (!codeEl) return;
    // Copy plain text without HTML tags
    const plainText = codeEl.innerText || codeEl.textContent;
    navigator.clipboard.writeText(plainText).then(() => {
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
    `;
    wrapper.appendChild(bar);
  },

  _copyText(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'; }, 1500);
    });
  },

  _speak(btn) {
    const msg = btn.closest('.msg-wrapper');
    const text = msg.innerText;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
      btn.style.opacity = '0.5';
      utterance.onend = () => { btn.style.opacity = '1'; };
    }
  },

  _react(btn, type) {
    btn.classList.toggle('active');
    showToast(type === 'like' ? '👍 Helpful!' : '👎 Not helpful');
  }
};
