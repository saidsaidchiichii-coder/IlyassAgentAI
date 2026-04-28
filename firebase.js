import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDWch9gK12sGD7awxmRibU6jBspd-tjr6E",
  authDomain: "my-website-17f99.firebaseapp.com",
  projectId: "my-website-17f99",
  storageBucket: "my-website-17f99.firebasestorage.app",
  messagingSenderId: "799668604107",
  appId: "1:799668604107:web:adc03ea5fd66c58af09f4e",
  measurementId: "G-H1SLRSEBTF"
};

// init firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);

// 🔥 IMPORTANT: auth missing before
const auth = getAuth(app);


// ================= TOAST =================
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
  box.style.zIndex = "9999";
  box.style.transition = "0.3s";

  document.body.appendChild(box);

  setTimeout(() => box.style.opacity = "1", 10);

  setTimeout(() => {
    box.remove();
  }, 3000);
}


// ================= AUTH =================
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
  document.getElementById("authSubmit").onclick = async () => {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value.trim();

    if (!email || !password) {
      showMsg("Fill all fields ❌");
      return;
    }

    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        showMsg("Account created ✅");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showMsg("Logged in 🔥");
      }

      closeAuth();
    } catch (e) {
      showMsg(e.message);
    }
  };
});
