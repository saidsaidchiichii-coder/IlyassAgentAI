import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyDWch9gK12sGD7awxmRibU6jBspd-tjr6E",
  authDomain: "my-website-17f99.firebaseapp.com",
  projectId: "my-website-17f99",
  storageBucket: "my-website-17f99.firebasestorage.app",
  messagingSenderId: "799668604107",
  appId: "1:799668604107:web:adc03ea5fd66c58af09f4e",
  measurementId: "G-H1SLRSEBTF"
};

// ================= INIT =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// expose globally
window.auth = auth;
window.db = db;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signOut = signOut;

// ================= TOAST =================
function showMsg(text, type = "info") {
  const box = document.createElement("div");
  box.innerText = text;

  const colors = {
    error: "#ff4b2b",
    success: "#4caf50",
    info: "#111"
  };

  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: colors[type] || "#111",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: "12px",
    zIndex: 9999,
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    opacity: 0,
    transform: "translateY(20px)",
    transition: "0.25s"
  });

  document.body.appendChild(box);

  setTimeout(() => {
    box.style.opacity = 1;
    box.style.transform = "translateY(0)";
  }, 10);

  setTimeout(() => {
    box.style.opacity = 0;
    box.style.transform = "translateY(20px)";
    setTimeout(() => box.remove(), 300);
  }, 3500);
}

// ================= AUTH STATE =================
onAuthStateChanged(auth, (user) => {
  const signinBtn = document.querySelector('.btn-signin');
  const signupBtn = document.querySelector('.btn-signup');

  if (user) {
    console.log("Logged in:", user.email);

    if (signinBtn) signinBtn.style.display = "none";

    if (signupBtn) {
      signupBtn.textContent = "Sign out";
      signupBtn.onclick = () => signOut(auth).then(() => location.reload());
    }

    loadHistory(user.uid); // 🔥 LOAD CHAT HISTORY

  } else {
    console.log("No user");

    if (signinBtn) signinBtn.style.display = "block";

    if (signupBtn) {
      signupBtn.textContent = "Sign up";
      signupBtn.onclick = () => window.openAuthModal("signup");
    }
  }
});

// ================= AUTH MODE =================
let currentAuthMode = "login";

window.setAuthMode = (mode) => {
  currentAuthMode = mode;
};

// ================= MAIN AUTH =================
window.handleAuth = async () => {
  const email = document.getElementById("authEmail")?.value.trim();
  const password = document.getElementById("authPassword")?.value.trim();
  const submitBtn = document.getElementById("authSubmit");

  if (!email || !password) {
    showMsg("❌ Fill all fields", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText =
    currentAuthMode === "signup" ? "Creating..." : "Logging in...";

  try {
    let user;

    if (currentAuthMode === "signup") {
      user = await createUserWithEmailAndPassword(auth, email, password);
      showMsg("✅ Account created!", "success");
    } else {
      user = await signInWithEmailAndPassword(auth, email, password);
      showMsg("🔥 Welcome back!", "success");
    }

    if (window.closeAuthModal) window.closeAuthModal();

  } catch (e) {
    showMsg("❌ " + e.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Continue";
  }
};

// ================= HISTORY SAVE =================
window.saveMessage = async (text, role) => {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, "users", user.uid, "messages"), {
    text,
    role,
    time: Date.now()
  });
};

// ================= HISTORY LOAD =================
async function loadHistory(uid) {
  const q = query(
    collection(db, "users", uid, "messages"),
    orderBy("time", "asc")
  );

  const snap = await getDocs(q);

  snap.forEach(doc => {
    const msg = doc.data();

    // 🔥 لازم يكون عندك AI renderer
    if (window.AI?.renderMessage) {
      window.AI.renderMessage({
        role: msg.role,
        content: msg.text
      });
    }
  });
}
