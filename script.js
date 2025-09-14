// Import Firebase from CDN (already added in index.html before this script)
// Example in index.html:
// <script type="module" src="script.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBcJ9mvAoGzvGO_do7TQSn9J1x5xNZZNKg",
  authDomain: "reco-app-6e52a.firebaseapp.com",
  projectId: "reco-app-6e52a",
  storageBucket: "reco-app-6e52a.firebasestorage.app",
  messagingSenderId: "832983633879",
  appId: "1:832983633879:web:601392af3ef9ea3cf6c592"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================
// AUTH FUNCTIONS
// ==========================
async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Logged in:", userCredential.user.email);
    alert("Login successful!");
  } catch (error) {
    console.error("Login error:", error.message);
    alert(error.message);
  }
}

async function signup(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Signed up:", userCredential.user.email);
    alert("Signup successful!");
  } catch (error) {
    console.error("Signup error:", error.message);
    alert(error.message);
  }
}

async function logout() {
  try {
    await signOut(auth);
    alert("Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error.message);
    alert(error.message);
  }
}

// ==========================
// SAVE RESPONSES TO FIRESTORE
// ==========================
async function saveResponse(data) {
  try {
    const docRef = await addDoc(collection(db, "responses"), data);
    console.log("Response saved with ID:", docRef.id);
    alert("Your answers were submitted!");
  } catch (error) {
    console.error("Error saving response:", error.message);
    alert(error.message);
  }
}

// ==========================
// FETCH TRAINING PROGRAMS
// ==========================
async function getTrainingPrograms() {
  try {
    const querySnapshot = await getDocs(collection(db, "trainingPrograms"));
    let programs = [];
    querySnapshot.forEach((doc) => {
      programs.push(doc.data());
    });
    console.log("Training programs:", programs);
    return programs;
  } catch (error) {
    console.error("Error fetching programs:", error.message);
    return [];
  }
}

// ==========================
// EXAMPLE FORM HANDLERS
// ==========================

// Hooking login form
document.getElementById("loginForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;
  login(email, password);
});

// Hooking signup form
document.getElementById("signupForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;
  signup(email, password);
});

// Hooking questionnaire form
document.getElementById("questionnaireForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Example: collect answers (adjust to your HTML input names)
  const answers = {
    q1: e.target.q1.value,
    q2: e.target.q2.value,
    q3: e.target.q3.value,
  };

  await saveResponse(answers);

  // Get training recommendations
  const programs = await getTrainingPrograms();
  console.log("Recommended:", programs);

  // Show them on the page (basic example)
  const output = document.getElementById("recommendations");
  output.innerHTML = programs.map(p => `<li>${p.program} - ${p.provider}</li>`).join("");
});
