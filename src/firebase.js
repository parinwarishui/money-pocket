import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";

// Filled in from .env.local (see .env.example) — never commit real
// values. Vite only exposes env vars prefixed VITE_ to client code.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Same origin as the app (not *.firebaseapp.com): Firebase's /__/auth/*
  // pages are proxied here (netlify.toml in production, vite.config.js in
  // dev). signInWithRedirect breaks on Safari/Chrome when authDomain is a
  // different origin, because the sign-in result is stored cross-site.
  authDomain: window.location.host,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Persistent (IndexedDB-backed) local cache: the app keeps working
// offline and queues writes until the connection comes back, instead of
// depending on localStorage as the only copy of the data the way the
// old architecture did.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Analytics doesn't work in every context this app might run in (some
// in-app browsers, certain private-browsing modes) — isSupported()
// checks that first, so an unsupported context just quietly skips it
// instead of throwing. `analytics` stays null until (and unless) that
// resolves true.
export let analytics = null;
analyticsIsSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
});
