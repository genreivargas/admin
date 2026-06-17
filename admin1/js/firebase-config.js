// Copy to firebase-config.js and replace with your Firebase Web App keys.
// Firebase Console → Project Settings → Your apps → Web app config

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Admin accounts allowed to sign in (must also exist in Firebase Authentication)
const ADMIN_EMAILS = [
  "admin@renttara.ph"
];
