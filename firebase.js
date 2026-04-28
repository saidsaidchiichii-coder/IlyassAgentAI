// 🔔 TOAST بدل alert
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

// 🔥 AUTH UI
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

// 🔗 CONNECT BUTTONS + FIREBASE
document.addEventListener("DOMContentLoaded", () => {
  const signinBtn = document.querySelector(".btn-signin");
  const signupBtn = document.querySelector(".btn-signup");

  // فتح popup
  if (signinBtn) signinBtn.onclick = () => openAuth("login");
  if (signupBtn) signupBtn.onclick = () => openAuth("signup");

  // submit
  document.getElementById("authSubmit").onclick = async () => {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;

    if (!email || !password) return showMsg("Fill all fields");

    try {
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword }
        = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

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
