document.addEventListener("DOMContentLoaded", () => {
  const signinBtn = document.querySelector(".btn-signin");
  const signupBtn = document.querySelector(".btn-signup");

  if (signupBtn) {
    signupBtn.addEventListener("click", async () => {
      const email = prompt("Enter email");
      const password = prompt("Enter password");

      if (!email || !password) return;

      try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created");
      } catch (e) {
        alert(e.message);
      }
    });
  }

  if (signinBtn) {
    signinBtn.addEventListener("click", async () => {
      const email = prompt("Enter email");
      const password = prompt("Enter password");

      if (!email || !password) return;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Logged in");
      } catch (e) {
        alert(e.message);
      }
    });
  }
});

// ADD ONLY - AUTH UI

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

document.addEventListener("DOMContentLoaded", () => {
  const signinBtn = document.querySelector(".btn-signin");
  const signupBtn = document.querySelector(".btn-signup");

  signinBtn.onclick = () => openAuth("login");
  signupBtn.onclick = () => openAuth("signup");

  document.getElementById("authSubmit").onclick = async () => {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;

    if (!email || !password) return alert("Fill all fields");

    try {
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword }
        = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Logged in");
      }

      closeAuth();
    } catch (e) {
      alert(e.message);
    }
  };
});
