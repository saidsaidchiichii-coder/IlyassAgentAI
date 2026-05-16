// v2 - OAuth fix applied
// ============================================================
// github-connector.js — Real GitHub OAuth Connector System
// Enhances the connectors tab with real GitHub OAuth flow
// ============================================================

// Override the addConnector function to support GitHub OAuth
const originalAddConnector = window.addConnector || (async () => {});

window.addConnector = async function(platform) {
  if (_connectedPlatforms.includes(platform)) {
    showToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} is already connected`);
    hideConnectorPicker();
    return;
  }
  
  // Handle GitHub OAuth flow
  if (platform === 'github') {
    if (!window.auth || !window.auth.currentUser) {
      showToast('Please sign in first to connect GitHub');
      return;
    }
    
    const userId = window.auth.currentUser.uid;
    const redirectUri = `${window.location.origin}/api/github-oauth-callback`;
    const params = new URLSearchParams({
      client_id: 'Ov23lirMXFp5nCzBIGLz', // GitHub OAuth App ID
      redirect_uri: redirectUri,
      scope: 'repo read:user user:email',
      state: JSON.stringify({ userId, ts: Date.now() }),
    });
    
    showToast('Redirecting to GitHub...');
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
    return;
  }
  
  // For other platforms, use the old prompt-based flow
  const websiteUrl = prompt(`Enter your website URL to link ${platform} with your AI Agent:`, "https://yourwebsite.com");
  if (!websiteUrl) return;

  try {
    showToast(`Linking ${platform} to ${websiteUrl}...`);
    
    if (window.auth && window.auth.currentUser) {
      const { doc, setDoc, arrayUnion } = window.FirebaseFirestore;
      await setDoc(doc(window.db, "users", window.auth.currentUser.uid), {
        connectors: arrayUnion({
          platform,
          websiteUrl,
          linkedAt: new Date().toISOString()
        })
      }, { merge: true });
      
      showToast(`AI Agent updated with your website!`);
    }

    _connectedPlatforms.push(platform);
    renderConnectors();
    hideConnectorPicker();
    showToast(`Successfully linked ${platform} to ${websiteUrl}!`);
  } catch (error) {
    console.error("Error linking connector:", error);
    showToast("Failed to link connector. Please try again.");
  }
};

// Override removeConnector to handle GitHub API disconnection
const originalRemoveConnector = window.removeConnector || (async () => {});

window.removeConnector = async function(platform) {
  if (!confirm(`Are you sure you want to disconnect ${platform}?`)) return;

  try {
    if (window.auth && window.auth.currentUser) {
      const userId = window.auth.currentUser.uid;
      
      if (platform === 'github') {
        const response = await fetch(`/api/github-connector?action=disconnect&userId=${userId}`, {
          method: 'POST',
          headers: {
            'x-user-id': userId,
          }
        });
        if (!response.ok) {
          throw new Error('Failed to disconnect GitHub');
        }
      } else {
        const { doc, getDoc, setDoc } = window.FirebaseFirestore;
        const userRef = doc(window.db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const updatedConnectors = (data.connectors || []).filter(c => c.platform !== platform);
          await setDoc(userRef, { connectors: updatedConnectors }, { merge: true });
        }
      }
    }

    _connectedPlatforms = _connectedPlatforms.filter(p => p !== platform);
    renderConnectors();
    showToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected`);
  } catch (error) {
    console.error("Error removing connector:", error);
    showToast("Failed to remove connector");
  }
};

// Override renderConnectors to show GitHub details
const originalRenderConnectors = window.renderConnectors || (() => {});

window.renderConnectors = function() {
  const grid = document.getElementById('connectorsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  // "Add connectors" card
  const addCard = document.createElement('button');
  addCard.className = 'add-connector-card';
  addCard.onclick = showConnectorPicker;
  addCard.innerHTML = `<div class="add-icon">+</div><span>Add connectors</span>`;
  grid.appendChild(addCard);

  // Connected connector cards
  const CONNECTOR_META = {
    github:   { name: 'GitHub',   desc: 'Manage repositories and track code changes.', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>' },
    gmail:    { name: 'Gmail',    desc: 'Access and manage your emails.',              svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.573l8.073-6.08c1.618-1.214 3.927-.059 3.927 1.964z"/></svg>' },
    calendar: { name: 'Google Calendar', desc: 'Manage your schedule and events.',    svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/></svg>' }
  };

  _connectedPlatforms.forEach(platform => {
    const meta = CONNECTOR_META[platform] || { name: platform, desc: '', svg: '' };
    const card = document.createElement('div');
    card.className = 'connector-card';
    card.style.cursor = 'pointer';
    
    let cardHTML = `
      <div class="connector-card-logo">${meta.svg}</div>
      <div class="connector-card-info">
        <div class="connector-card-name">${meta.name}</div>
        <div class="connector-card-desc">${meta.desc}</div>`;
    
    // Add GitHub-specific info if connected
    if (platform === 'github' && window._githubConnectorData) {
      const gh = window._githubConnectorData;
      cardHTML += `
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
          <div>👤 ${gh.username}</div>
          <div>📦 ${gh.repos_count} repos</div>
        </div>`;
    }
    
    cardHTML += `
      </div>
      <svg class="connector-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
      <div class="connector-card-status"></div>
    `;
    
    card.innerHTML = cardHTML;
    card.onclick = () => removeConnector(platform);
    grid.appendChild(card);
  });
};

// Override loadConnectorsFromFirebase to load GitHub connector data
const originalLoadConnectorsFromFirebase = window.loadConnectorsFromFirebase || (async () => {});

window.loadConnectorsFromFirebase = async function() {
  // Wait for firebase auth state
  if (!window._firebaseAuthReady) {
    setTimeout(loadConnectorsFromFirebase, 500);
    return;
  }
  const user = window._currentUser;
  if (!user || user.isAnonymous) return;
  
  try {
    const { doc, getDoc } = window.FirebaseFirestore || {};
    if (!doc || !getDoc || !window.db) return;
    const userDoc = await getDoc(doc(window.db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      _connectedPlatforms = [];
      
      // Load old-style connectors
      if (data.connectors) {
        _connectedPlatforms = data.connectors.map(c => c.platform);
      }
      
      // Load GitHub connector if exists
      if (data.github && data.github.token) {
        if (!_connectedPlatforms.includes('github')) {
          _connectedPlatforms.push('github');
        }
        window._githubConnectorData = data.github;
      }
      
      renderConnectors();
    }
  } catch(e) {
    console.error("Error loading connectors:", e);
  }
};

// Handle GitHub OAuth callback from URL
window.handleGitHubCallback = function() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('github_token');
  
  if (token && window.auth && window.auth.currentUser) {
    // Token was already stored by the API, just reload
    showToast('✅ GitHub connected successfully!');
    setTimeout(() => {
      loadConnectorsFromFirebase();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 500);
  }
};

// Call this on page load
document.addEventListener('DOMContentLoaded', () => {
  window.handleGitHubCallback();
});

console.log('✅ GitHub Connector module loaded');
