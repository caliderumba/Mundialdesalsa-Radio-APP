import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCs4qj1eCjnTOzqOALWK2BnnA5z4dsT9cw",
  authDomain: "mundial-de-salsa-f008c.firebaseapp.com",
  projectId: "mundial-de-salsa-f008c",
  storageBucket: "mundial-de-salsa-f008c.firebasestorage.app",
  messagingSenderId: "793052992987",
  appId: "1:793052992987:web:be19e1f21e084a102e43fe",
  measurementId: "G-21GH0LV5D4"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
