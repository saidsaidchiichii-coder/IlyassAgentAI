import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDWch9gK12sGD7awxmRibU6jBspd-tjr6E",
  authDomain: "my-website-17f99.firebaseapp.com",
  projectId: "my-website-17f99",
  storageBucket: "my-website-17f99.firebasestorage.app",
  messagingSenderId: "799668604107",
  appId: "1:799668604107:web:adc03ea5fd66c58af09f4e",
  measurementId: "G-H1SLRSEBTF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ================= TOAST / NOTIFICATION =================
function showMsg(text, type = "info") {
  const box = document.createElement("div");
  box.innerText = text;
  
  const bgColor = type === "error" ? "#ff4b2b" : (type === "success" ? "#4caf50" : "#111");
  
  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: bgColor,
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "12px",
    zIndex: 9999,
    transition: "all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    opacity: 0,
    transform: "translateY(20px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px"
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
  }, 4000);
}

// ================= AUTH STATE =================
onAuthStateChanged(auth, (user) => {
    const signinBtn = document.querySelector('.btn-signin');
    const signupBtn = document.querySelector('.btn-signup');
    
    if (user) {
        console.log("User is logged in:", user.email);
        if (signinBtn) signinBtn.style.display = 'none';
        if (signupBtn) {
            signupBtn.textContent = 'Sign out';
            signupBtn.onclick = () => signOut(auth).then(() => location.reload());
        }
    } else {
        console.log("No user logged in");
        if (signinBtn) signinBtn.style.display = 'block';
        if (signupBtn) {
            signupBtn.textContent = 'Sign up';
            signupBtn.onclick = () => window.openAuthModal('signup');
        }
    }
});

// ================= LOGIN / SIGNUP LOGIC =================
let currentAuthMode = "login";

window.setAuthMode = (mode) => {
    currentAuthMode = mode;
};

window.handleAuth = async () => {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value.trim();
    const submitBtn = document.getElementById("authSubmit");

    if (!email || !password) {
        showMsg("❌ Please fill in all fields", "error");
        return;
    }

    if (password.length < 6) {
        showMsg("❌ Password must be at least 6 characters", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = currentAuthMode === "signup" ? "Creating Account..." : "Signing in...";

    try {
        if (currentAuthMode === "signup") {
            await createUserWithEmailAndPassword(auth, email, password);
            showMsg("✅ Account created successfully!", "success");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            showMsg("🔥 Welcome back!", "success");
        }
        
        if (window.closeAuthModal) window.closeAuthModal();
    } catch (e) {
        console.error("Auth error:", e.code, e.message);
        let errorMsg = "❌ Authentication failed";
        
        switch (e.code) {
            case 'auth/email-already-in-use': errorMsg = "❌ Email already in use"; break;
            case 'auth/invalid-email': errorMsg = "❌ Invalid email address"; break;
            case 'auth/user-not-found': errorMsg = "❌ User not found"; break;
            case 'auth/wrong-password': errorMsg = "❌ Incorrect password"; break;
            case 'auth/invalid-credential': errorMsg = "❌ Invalid credentials"; break;
            default: errorMsg = "❌ " + e.message;
        }
        showMsg(errorMsg, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Continue";
    }
};
