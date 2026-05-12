import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
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
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 Firebase Config (ديالك)
const firebaseConfig = {
  apiKey: "AIzaSyDWch9gK12sGD7awxmRibU6jBspd-tjr6E", // Keep existing or update if you have a new web config
  authDomain: "ilyassagentai.firebaseapp.com",
  projectId: "ilyassagentai",
  storageBucket: "ilyassagentai.firebasestorage.app",
  messagingSenderId: "1070041614552",
  appId: "1:1070041614552:web:your-app-id", // You might need to update this from Firebase Console
  measurementId: "G-XXXXXXXXXX"
};

// init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, doc, setDoc, getDoc, collection, query, where, getDocs, onAuthStateChanged, arrayUnion };

// Expose to window for app.html to use
window.auth = auth;
window.db = db;
window.FirebaseFirestore = { doc, setDoc, arrayUnion, getDoc, collection, query, where, getDocs };

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
