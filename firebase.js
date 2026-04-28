import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔥 Firebase Config (ديالك)
const firebaseConfig = {
  apiKey: "AIzaSyDWch9gK12sGD7awxmRibU6jBspd-tjr6E",
  authDomain: "my-website-17f99.firebaseapp.com",
  projectId: "my-website-17f99",
  storageBucket: "my-website-17f99.firebasestorage.app",
  messagingSenderId: "799668604107",
  appId: "1:799668604107:web:adc03ea5fd66c58af09f4e",
  measurementId: "G-H1SLRSEBTF"
};

// init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ================= TOAST =================
function showMsg(text) {
  const box = document.createElement("div");
  box.innerText = text;

  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#111",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    zIndex: 9999,
    transition: "0.3s",
    opacity: 0
  });

  document.body.appendChild(box);

  setTimeout(() => (box.style.opacity = 1), 10);

  setTimeout(() => {
    box.style.opacity = 0;
    setTimeout(() => box.remove(), 300);
  }, 3000);
}

// ================= MODE =================
let authMode = "login";

window.setAuthMode = (mode) => {
  authMode = mode;
};

// ================= LOGIN / SIGNUP =================
window.handleAuth = async () => {
  const email = document.getElementById("authEmail")?.value.trim();
  const password = document.getElementById("authPassword")?.value.trim();

  if (!email || !password) {
    showMsg("❌ Fill all fields");
    return;
  }

  try {
    if (authMode === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
      showMsg("✅ Account created");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      showMsg("🔥 Logged in");
    }
  } catch (e) {
    showMsg("❌ " + e.message);
  }
};
