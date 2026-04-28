const AI = {
  messagesBox: null,
  API_URL: null,
  currentMode: 'auto', // 'auto', 'fast', 'thinking'

  /* =========================
     🎨 SYNTAX HIGHLIGHT
  ========================= */
  highlight(code) {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/(\/\/.*)/g, '<span class="cmt">$1</span>')
      .replace(/(["\'`].*?["\'`])/g, '<span class="str">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>')
      .replace(/\b(int|bool|return|if|else|for|while|function|const|let|var|class|new|async|await|try|catch|fetch|throw)\b/g, '<span class="kw">$1</span>')
      .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\(/g, '<span class="fn">$1</span>(');
  },

  init(box, api) {
    this.messagesBox = document.getElementById(box);
    this.API_URL = api;
    this.setupModeSelector();
  },

  /* =========================
     🔄 MODE SELECTOR SETUP
  ========================= */
  setupModeSelector() {
    const modeSelectors = document.querySelectorAll('.mode-selector');
    modeSelectors.forEach(selector => {
      selector.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showModeMenu(selector);
      });
    });
  },

  showModeMenu(selector) {
    // Remove existing menu if any
    const existingMenu = document.querySelector('.mode-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'mode-menu';
    menu.innerHTML = `
      <div class="mode-option ${this.currentMode === 'auto' ? 'active' : ''}" data-mode="auto">
        <span class="mode-name">Auto</span>
        <span class="mode-desc">Smart selection</span>
      </div>
      <div class="mode-option ${this.currentMode === 'fast' ? 'active' : ''}" data-mode="fast">
        <span class="mode-name">Faster AI 5.2</span>
        <span class="mode-desc">Quick responses</span>
      </div>
      <div class="mode-option ${this.currentMode === 'thinking' ? 'active' : ''}" data-mode="thinking">
        <span class="mode-name">Thinking Longer</span>
        <span class="mode-desc">Deep analysis (~3s)</span>
      </div>
    `;

    menu.querySelectorAll('.mode-option').forEach(option => {
      option.addEventListener('click', () => {
        this.currentMode = option.dataset.mode;
        selector.querySelector('span').textContent = option.querySelector('.mode-name').textContent;
        menu.remove();
      });
    });

    document.body.appendChild(menu);
    
    // Position menu near selector
    const rect = selector.getBoundingClientRect();
    menu.style.top = (rect.bottom + 8) + 'px';
    menu.style.left = (rect.left - 50) + 'px';
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

  /* =========================
     🧠 ADVANCED THINKING EFFECT
  ========================= */
   thinking() {
  const wrapper = document.createElement("div");
  wrapper.className = "msg-wrapper ai";

  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "thinking-container";

  thinkingDiv.innerHTML = `
    <div class="thinking-bubble">
      <div class="loader-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="thinking-text">Thinking...</span>
    </div>
  `;

  wrapper.appendChild(thinkingDiv);
  this.messagesBox.appendChild(wrapper);
  this.scroll();

  // return full wrapper (so load.remove() works)
  return wrapper;
},
  












  
  /* =========================
     🌊 PIXEL-PERFECT STREAMING
  ========================= */
  async streamRender(fullText) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper ai";
    
    const container = document.createElement("div");
    container.className = "msg ai";
    wrapper.appendChild(container);
    this.messagesBox.appendChild(wrapper);
    
    const parts = fullText.split("```");
    let textContent = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // CODE BLOCK
      if (i % 2 === 1) {
        const codeBox = document.createElement("div");
        codeBox.className = "code-box";
        
        const header = document.createElement("div");
        header.className = "code-header";
        header.innerHTML = `<span class="code-lang">code</span><button class="copy-btn">Copy</button>`;
        
        const copyBtn = header.querySelector(".copy-btn");
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(part.trim());
          copyBtn.textContent = "Copied!";
          setTimeout(() => copyBtn.textContent = "Copy", 1500);
        };

        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.innerHTML = this.highlight(part.trim());
        
        pre.appendChild(code);
        codeBox.appendChild(header);
        codeBox.appendChild(pre);
        container.appendChild(codeBox);
      } 
      // TEXT WITH NATURAL TYPING
      else {
        const textDiv = document.createElement("div");
        container.appendChild(textDiv);
        
        const paragraphs = part.split("\n");
        for (const para of paragraphs) {
          if (para.trim()) {
            const p = document.createElement("p");
            p.style.marginBottom = "0.5rem";
            textDiv.appendChild(p);
            
            const words = para.trim().split(" ");
            for (const word of words) {
                p.textContent += word + " ";
                textContent += word + " ";
                this.scroll();
                await new Promise(r => setTimeout(r, 15 + Math.random() * 20));
            }
          }
        }
      }
      this.scroll();
    }
    
    // Add voice button after streaming is complete
    if (textContent.trim()) {
      this.addVoiceButton(container, textContent.trim());
    }
  },

  addVoiceButton(messageElement, text) {
    // Check if voice button already exists
    if (messageElement.querySelector('.voice-btn-play')) {
      return;
    }

    const voiceContainer = document.createElement('div');
    voiceContainer.className = 'voice-message';
    voiceContainer.style.animation = 'slideIn 0.3s ease-out';
    
    const playBtn = document.createElement('button');
    playBtn.className = 'voice-btn-play';
    playBtn.innerHTML = '<i data-lucide="volume-2"></i>';
    playBtn.onclick = () => this.speakText(text, playBtn);
    
    const duration = document.createElement('span');
    duration.className = 'voice-duration';
    duration.textContent = 'Listen';
    
    voiceContainer.appendChild(playBtn);
    voiceContainer.appendChild(duration);
    
    messageElement.appendChild(voiceContainer);
    lucide.createIcons();
  },

  /* =========================
     🔊 IMPROVED TEXT-TO-SPEECH
  ========================= */
  speakText(text, button) {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Enhanced TTS settings
      utterance.rate = 0.9;      // Slightly slower for clarity
      utterance.pitch = 1.0;     // Natural pitch
      utterance.volume = 1.0;    // Maximum volume
      utterance.lang = 'en-US';  // English US
      
      // Get available voices and select best one
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Prefer a natural-sounding voice
        const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Apple')) || voices[0];
        utterance.voice = preferredVoice;
      }
      
      // Visual feedback during playback
      if (button) {
        button.style.opacity = '0.6';
        button.style.transform = 'scale(1.1)';
      }
      
      utterance.onstart = () => {
        if (button) {
          button.innerHTML = '<i data-lucide="volume-x"></i>';
          lucide.createIcons();
        }
      };
      
      utterance.onend = () => {
        if (button) {
          button.innerHTML = '<i data-lucide="volume-2"></i>';
          button.style.opacity = '1';
          button.style.transform = 'scale(1)';
          lucide.createIcons();
        }
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        if (button) {
          button.innerHTML = '<i data-lucide="volume-2"></i>';
          button.style.opacity = '1';
          button.style.transform = 'scale(1)';
          lucide.createIcons();
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-Speech not supported in your browser');
    }
  },

  scroll() {
    const box = this.messagesBox;
    box.scrollTo({
        top: box.scrollHeight,
        behavior: 'smooth'
    });
  }
};
