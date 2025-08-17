// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVe7gKKOQloCr2vI5a9sYd3A0jjSyBMbI",
  authDomain: "taskmaster-1969.firebaseapp.com",
  projectId: "taskmaster-1969",
  storageBucket: "taskmaster-1969.firebasestorage.app",
  messagingSenderId: "589185847899",
  appId: "1:589185847899:web:28db518b097e501392257e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
