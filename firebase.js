// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


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


// ================= INIT FIREBASE =================
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);


// ================= TOAST NOTIFICATION =================
function showMsg(text) {
  const box = document.createElement("div");

  box.innerText = text;
  box.style.position = "fixed";
  box.style.bottom = "20px";
  box.style.right = "20px";
  box.style.background = "#111";
  box.style.color = "white";
  box.style.padding = "12px 16px";
  box.style.borderRadius = "10px";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
  box.style.zIndex = "9999";
  box.style.opacity = "0";
  box.style.transform = "translateY(20px)";
  box.style.transition = "0.3s";

  document.body.appendChild(box);

  setTimeout(() => {
    box.style.opacity = "1";
    box.style.transform = "translateY(0)";
  }, 10);

  setTimeout(() => {
    box.style.opacity = "0";
    box.style.transform = "translateY(20px)";
    setTimeout(() => box.remove(), 300);
  }, 3000);
}


// ================= AUTH MODE =================
let authMode = "login";

window.openAuth = (mode) => {
  authMode = mode;
  document.getElementById("authModal").style.display = "flex";
  document.getElementById("authTitle").innerText =
    mode === "login" ? "Sign in" : "Sign up";
};

window.closeAuth = () => {
  document.getElementById("authModal").style.display = "none";
};


// ================= LOGIN / SIGNUP =================
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("authSubmit");

  if (btn) {
    btn.onclick = async () => {
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value.trim();

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

        closeAuth();
      } catch (e) {
        showMsg(e.message);
      }
    };
  }
});


// ================= AUTO LOGIN CHECK =================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User logged in:", user.email);
  } else {
    console.log("No user");
  }
});


// ================= LOGOUT (optional) =================
window.logout = async () => {
  await signOut(auth);
  showMsg("👋 Logged out");
};
