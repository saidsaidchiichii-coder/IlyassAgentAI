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
  box.style.background = isError ? "#c42b1c" : "#1f1f1f";
  box.style.color = "white";
  box.style.padding = "14px 18px";
  box.style.borderRadius = "12px";
  box.style.boxShadow = "0 10px 35px rgba(0,0,0,0.7)";
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

  window.authMode = mode;
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
      submitBtn.textContent = window.authMode === "signup" ? "Creating Account..." : "Signing in...";

      try {
        if (window.authMode === "signup") {
          await createUserWithEmailAndPassword(auth, email, password);
          showMsg("✅ Account created successfully!");
          setTimeout(() => {
            closeAuth();
            window.location.href = "login.html";
          }, 1400);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
          showMsg("🔥 Login successful!");
          closeAuth();
          // Redirect to your main page
          window.location.href = "index.html"; 
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error.code, error.message);

        switch (error.code) {
          case "auth/user-not-found":
            showMsg("❌ This email is not registered. Please sign up first.", true);
            break;
          case "auth/wrong-password":
            showMsg("❌ Incorrect password.", true);
            break;
          case "auth/invalid-credential":
            showMsg("❌ Invalid email or password.", true);
            break;
          case "auth/email-already-in-use":
            showMsg("❌ This email is already registered. Please sign in.", true);
            break;
          case "auth/weak-password":
            showMsg("❌ Password should be at least 6 characters.", true);
            break;
          case "auth/invalid-email":
            showMsg("❌ Invalid email format.", true);
            break;
          default:
            showMsg("❌ " + error.message, true);
        }
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
    console.log("✅ User logged in:", user.email);
    // يمكنك هنا إخفاء أزرار التسجيل وإظهار اسم المستخدم
  } else {
    console.log("No user is signed in");
  }
});

// ================= LOGOUT FUNCTION =================
window.logout = async () => {
  try {
    await signOut(auth);
    showMsg("👋 You have been logged out successfully");
    setTimeout(() => window.location.reload(), 800);
  } catch (e) {
    showMsg("Error during logout", true);
  }
};
