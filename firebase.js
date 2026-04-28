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

// ================= INITIALIZE FIREBASE =================
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);

// ================= TOAST NOTIFICATION =================
function showMsg(text, isError = false) {
  const box = document.createElement("div");
  box.innerText = text;
  box.style.position = "fixed";
  box.style.bottom = "20px";
  box.style.right = "20px";
  box.style.background = isError ? "#c42b1c" : "#111";
  box.style.color = "white";
  box.style.padding = "14px 18px";
  box.style.borderRadius = "10px";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
  box.style.zIndex = "99999";
  box.style.opacity = "0";
  box.style.transform = "translateY(20px)";
  box.style.transition = "all 0.3s ease";
  document.body.appendChild(box);

  setTimeout(() => {
    box.style.opacity = "1";
    box.style.transform = "translateY(0)";
  }, 10);

  setTimeout(() => {
    box.style.opacity = "0";
    box.style.transform = "translateY(20px)";
    setTimeout(() => box.remove(), 400);
  }, 3200);
}

// ================= OPEN & CLOSE AUTH MODAL =================
window.openAuth = (mode) => {
  const modal = document.getElementById("authModal");
  const title = document.getElementById("authTitle");

  if (!modal || !title) return;

  window.authMode = mode; // حفظ الوضع (login أو signup)
  title.textContent = mode === "signup" ? "Create Account" : "Sign in";
  modal.style.display = "flex";
};

window.closeAuth = () => {
  const modal = document.getElementById("authModal");
  if (modal) modal.style.display = "none";
};

// ================= HANDLE LOGIN / SIGNUP =================
document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("authSubmit");

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const email = document.getElementById("authEmail")?.value.trim();
      const password = document.getElementById("authPassword")?.value.trim();

      if (!email || !password) {
        showMsg("❌ Please fill all fields", true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = window.authMode === "signup" ? "Creating..." : "Signing in...";

      try {
        if (window.authMode === "signup") {
          await createUserWithEmailAndPassword(auth, email, password);
          showMsg("✅ Account created successfully!");
          setTimeout(() => {
            closeAuth();
            window.location.href = "login.html"; // أو index.html
          }, 1500);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
          showMsg("🔥 Login successful!");
          closeAuth();
          window.location.href = "index.html"; // غيرها لاسم صفحتك الرئيسية
        }
      } catch (error) {
        console.error(error);
        showMsg("❌ " + error.message, true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Continue";
      }
    });
  }
});

// ================= AUTH STATE LISTENER =================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User is logged in:", user.email);
    // يمكنك هنا إخفاء أزرار Sign in / Sign up وإظهار معلومات المستخدم
  } else {
    console.log("No user logged in");
  }
});

// ================= LOGOUT FUNCTION =================
window.logout = async () => {
  try {
    await signOut(auth);
    showMsg("👋 You have been logged out");
    setTimeout(() => {
      window.location.reload();
    }, 800);
  } catch (e) {
    showMsg("Error logging out", true);
  }
};
