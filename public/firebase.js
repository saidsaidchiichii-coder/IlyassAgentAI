import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDWch9gK12sGD7awxmRibU6jBspd-tjr6E",
  authDomain: "ilyassagentai.firebaseapp.com",
  projectId: "ilyassagentai",
  storageBucket: "ilyassagentai.firebasestorage.app",
  messagingSenderId: "1070041614552",
  appId: "1:1070041614552:web:your-app-id",
  measurementId: "G-XXXXXXXXXX"
};

// Init
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Expose globally so app.html can use them
window.auth = auth;
window.db   = db;
window.FirebaseFirestore = { doc, setDoc, getDoc, collection, query, where, getDocs };

export { auth, db, doc, setDoc, getDoc, collection, query, where, getDocs, onAuthStateChanged };

// ================= TOAST =================
function showMsg(text) {
  if (window.showToast) { window.showToast(text); return; }
  const box = document.createElement("div");
  box.innerText = text;
  Object.assign(box.style, {
    position: "fixed", bottom: "20px", right: "20px",
    background: "#111", color: "#fff", padding: "12px 16px",
    borderRadius: "10px", zIndex: 9999, transition: "0.3s", opacity: 0
  });
  document.body.appendChild(box);
  setTimeout(() => (box.style.opacity = 1), 10);
  setTimeout(() => { box.style.opacity = 0; setTimeout(() => box.remove(), 300); }, 3000);
}

// ================= SAVE PROFILE TO FIRESTORE =================
async function saveUserProfile(user) {
  if (!user || user.isAnonymous) return;
  try {
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // First login — create profile
      await setDoc(ref, {
        uid:         user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        email:       user.email || "",
        photoURL:    user.photoURL || "",
        plan:        "free",
        createdAt:   serverTimestamp(),
        settings:    { theme: "dark", mode: "auto" },
        connectors:  []
      });
    }
  } catch(e) {
    console.warn("Firestore profile save error:", e.message);
  }
}

// ================= AUTH STATE LISTENER =================
onAuthStateChanged(auth, async (user) => {
  // Save profile on first login
  if (user && !user.isAnonymous) {
    await saveUserProfile(user);
  }
  // Notify the app
  if (typeof window.onUserAuthChange === "function") {
    window.onUserAuthChange(user);
  }
});

// ================= MODE =================
let authMode = "login";
window.setAuthMode = (mode) => { authMode = mode; };

// ================= GOOGLE LOGIN =================
window.googleLogin = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    showMsg("✅ Signed in with Google! Welcome " + (result.user.displayName || ""));
  } catch (e) {
    showMsg("❌ " + (e.message || "Google sign-in failed"));
  }
};

// ================= GUEST LOGIN =================
window.guestLogin = async () => {
  try {
    await signInAnonymously(auth);
    showMsg("👤 Guest mode activated");
  } catch (e) {
    showMsg("❌ " + e.message);
  }
};

// ================= EMAIL LOGIN / SIGNUP =================
window.handleAuth = async () => {
  const emailEl    = document.getElementById("authEmail");
  const passwordEl = document.getElementById("authPassword");
  const errorEl    = document.getElementById("authError");

  const email    = emailEl?.value.trim();
  const password = passwordEl?.value.trim();

  if (!email || !password) {
    if (errorEl) errorEl.textContent = "❌ Please fill all fields";
    return;
  }
  if (errorEl) errorEl.textContent = "";

  try {
    if (authMode === "signup") {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const name = email.split("@")[0];
      await updateProfile(cred.user, { displayName: name });
      showMsg("✅ Account created! Welcome " + name);
      // 🎉 Trigger onboarding for new user
      setTimeout(() => {
        const authM = document.getElementById('authModal');
        if (authM) authM.classList.remove('open');
        if (typeof window.initOnboarding === 'function') {
          window.initOnboarding();
        }
      }, 500);
    } else {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      showMsg("🔥 Welcome back " + (cred.user.displayName || ""));
    }
  } catch (e) {
    const msg = e.code === "auth/wrong-password"       ? "❌ Wrong password"
              : e.code === "auth/user-not-found"       ? "❌ Account not found"
              : e.code === "auth/email-already-in-use" ? "❌ Email already used"
              : e.code === "auth/weak-password"        ? "❌ Password too short (min 6)"
              : "❌ " + e.message;
    if (errorEl) errorEl.textContent = msg;
    else showMsg(msg);
  }
};

// ================= LOGOUT =================
window.logoutUser = async () => {
  try {
    await signOut(auth);
    showMsg("👋 Signed out successfully");
  } catch (e) {
    showMsg("❌ " + e.message);
  }
};

// Legacy compat
window.showEmail = () => {
  const box = document.getElementById("emailBox");
  if (box) box.classList.toggle("hidden");
};
window.cancel = () => {
  const box = document.getElementById("emailBox");
  if (box) box.classList.add("hidden");
};
window.loginEmail = window.handleAuth;

// ===== ONBOARDING TRIGGER - New User Detection =====
// يبان الـ onboarding بعد signup مباشرة
(function() {
  let _obTriggered = false;
  
  function checkAndTriggerOnboarding(user) {
    if (!user || _obTriggered) return;
    if (localStorage.getItem('ilyassai_onboarding_done')) return;
    
    // هل هو user جديد؟ (وقت الإنشاء قريب من وقت آخر دخول)
    const createdAt = new Date(user.metadata.creationTime).getTime();
    const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
    const isNewUser = Math.abs(createdAt - lastSignIn) < 60000; // 60 seconds
    
    if (isNewUser) {
      _obTriggered = true;
      // أخبي authModal أولاً
      const authModal = document.getElementById('authModal');
      if (authModal) authModal.style.display = 'none';
      // بان الـ onboarding
      setTimeout(function() {
        if (typeof window.initOnboarding === 'function') {
          window.initOnboarding();
        }
      }, 300);
    }
  }
  
  // Hook into Firebase auth
  function waitForFirebase() {
    if (window.firebase && window.firebase.auth) {
      window.firebase.auth().onAuthStateChanged(checkAndTriggerOnboarding);
    } else {
      setTimeout(waitForFirebase, 200);
    }
  }
  waitForFirebase();
})();
