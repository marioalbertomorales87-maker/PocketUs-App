import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: "AIzaSyBGJ1IPF07O2Wc_e8hiis_gCD_LCsBVbac",
  authDomain: "pocketus-app.firebaseapp.com",
  projectId: "pocketus-app",
  storageBucket: "pocketus-app.firebasestorage.app",
  messagingSenderId: "311210675520",
  appId: "1:311210675520:web:a016be719345ab34077ea5"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let auth;

try {
  // Load AsyncStorage lazily to avoid runtime crash when native module is unavailable.
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
export default app;