import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth, type User } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

export interface MeducktionFirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

let services: MeducktionFirebaseServices | null = null;
let emulatorsConnected = false;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing Firebase configuration: ${name}.`);
  return value;
}

export function getFirebaseServices(): MeducktionFirebaseServices {
  if (services) return services;
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: required("VITE_FIREBASE_API_KEY", import.meta.env.VITE_FIREBASE_API_KEY),
        authDomain: required("VITE_FIREBASE_AUTH_DOMAIN", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
        projectId: required("VITE_FIREBASE_PROJECT_ID", import.meta.env.VITE_FIREBASE_PROJECT_ID),
        appId: required("VITE_FIREBASE_APP_ID", import.meta.env.VITE_FIREBASE_APP_ID),
      });
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  if (import.meta.env.VITE_FIREBASE_USE_EMULATORS === "true" && !emulatorsConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    emulatorsConnected = true;
  }
  services = { app, auth, firestore };
  return services;
}

export async function ensureAnonymousPlayer(auth = getFirebaseServices().auth): Promise<User> {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}
