// ================= FIREBASE INIT =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔥 حط config ديالك هنا
const firebaseConfig = {
  apiKey: "XXXX",
  authDomain: "XXXX",
  projectId: "XXXX",
  appId: "XXXX"
};

// init app
const app = initializeApp(firebaseConfig);

// ✅ THIS IS THE FIX (auth was missing)
const auth = getAuth(app);


// ================= TOAST MESSAGE =================
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


// ================= AUTH SYSTEM =================
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
  const signinBtn = document.querySelector(".btn-signin");
  const signupBtn = document.querySelector(".btn-signup");

  if (signinBtn) signinBtn.onclick = () => openAuth("login");
  if (signupBtn) signupBtn.onclick = () => openAuth("signup");

  const submitBtn = document.getElementById("authSubmit");

  submitBtn.onclick = async () => {
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
