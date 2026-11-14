import {
    initializeAppCheck,
    ReCaptchaEnterpriseProvider
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app-check.js";

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";

import {
    getAI,
    getGenerativeModel,
    GoogleAIBackend
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-ai.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBj8EJGcrYjI2ItFsQA9W4Z1VE55D65j9M",
  authDomain: "studybuddy-ai-2026-940b3.firebaseapp.com",
  projectId: "studybuddy-ai-2026-940b3",
  storageBucket: "studybuddy-ai-2026-940b3.firebasestorage.app",
  messagingSenderId: "3540929130",
  appId: "1:3540929130:web:16b7325548129ce7c85813",
  measurementId: "G-2Q7H4KM2QS"    // Keep your existing Firebase configuration here.
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

console.log("Firebase connected successfully!");

// Initialize App Check
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
        '6Lc1sh8uAAAAAIz3RSeYfOqtNY2DUIXpVkvhM5HA'
    ),
    isTokenAutoRefreshEnabled: true
});

// Initialize Firebase AI
const ai = getAI(app, {
    backend: new GoogleAIBackend()
});

// Initialize Gemini model
export const model = getGenerativeModel(ai, {
    model: "gemini-3.5-flash-lite"
});

// Initialize Firestore and Authentication
const db = getFirestore(app);
const auth = getAuth(app);

console.log("Firebase AI model initialized!");

export { app, ai, db, auth, appCheck };

