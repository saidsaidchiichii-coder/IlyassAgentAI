// ADD ONLY - CONNECT EXISTING BUTTONS

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
