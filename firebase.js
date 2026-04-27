import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDWch9gK12sGD7awxmRibU6jBspd-tjr6E",
  authDomain: "my-website-17f99.firebaseapp.com",
  projectId: "my-website-17f99",
  storageBucket: "my-website-17f99.firebasestorage.app",
  messagingSenderId: "799668604107",
  appId: "1:799668604107:web:adc03ea5fd66c58af09f4e",
  measurementId: "G-H1SLRSEBTF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.signup = async () => {
  await createUserWithEmailAndPassword(auth, email.value, password.value);
  alert("created");
};

window.login = async () => {
  await signInWithEmailAndPassword(auth, email.value, password.value);
  alert("logged in");
};

window.logout = async () => {
  await signOut(auth);
  alert("logout");
};
