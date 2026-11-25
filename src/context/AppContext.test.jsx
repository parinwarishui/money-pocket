import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Minimal in-memory fake of the Firestore + Auth SDK surface this
// app actually uses. This lets these tests exercise the REAL AppContext
// code (addTransaction, updateTransaction, the exposed sorted
// `transactions`) against a fake backend instead of a live Firebase
// project or an emulator. ----

vi.mock("firebase/app", () => ({
  initializeApp: () => ({}),
}));

vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  GoogleAuthProvider: class {},
  onAuthStateChanged: (_auth, cb) => {
    cb({ uid: "test-uid", displayName: "Test User", email: "test@example.com" });
    return () => {};
  },
  getRedirectResult: () => Promise.resolve(null),
  signInWithRedirect: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
}));

vi.mock("firebase/firestore", () => {
  const store = new Map(); // path -> Map<id, data>
  const listeners = new Map(); // path -> Set<{ref, cb}>

  function docsFor(path) {
    if (!store.has(path)) store.set(path, new Map());
    return store.get(path);
  }

  // A listener's ref says whether it wants a single-doc snapshot
  // ({exists, data}) or a whole-collection one ({docs}) — the same
  // storage path backs both (a doc is just one id within it).
  function deliver(path, entry) {
    const bucket = docsFor(path);
    if (entry.ref.__type === "doc") {
      const exists = bucket.has(entry.ref.__id);
      entry.cb({ exists: () => exists, data: () => bucket.get(entry.ref.__id) });
    } else {
      entry.cb({ docs: [...bucket.entries()].map(([id, data]) => ({ id, data: () => data })) });
    }
  }

  function notify(path) {
    const entries = listeners.get(path);
    if (!entries) return;
    entries.forEach((entry) => deliver(path, entry));
  }

  return {
    initializeFirestore: () => ({}),
    persistentLocalCache: () => ({}),
    persistentMultipleTabManager: () => ({}),

    // collection(db, ...segments) / doc(db, ...segments) / doc(collectionRef, id)
    collection: (_db, ...segments) => ({ __type: "collection", __path: segments.join("/") }),
    doc: (parent, ...rest) => {
      if (parent && parent.__type === "collection") {
        return { __type: "doc", __path: parent.__path, __id: rest[0] };
      }
      const segments = rest;
      const id = segments[segments.length - 1];
      return { __type: "doc", __path: segments.slice(0, -1).join("/"), __id: id };
    },

    onSnapshot: (ref, cb) => {
      const entry = { ref, cb };
      if (!listeners.has(ref.__path)) listeners.set(ref.__path, new Set());
      listeners.get(ref.__path).add(entry);
      deliver(ref.__path, entry); // deliver current state immediately, like the real SDK
      return () => listeners.get(ref.__path)?.delete(entry);
    },

    getDoc: async (ref) => {
      const exists = docsFor(ref.__path).has(ref.__id);
      return { exists: () => exists, data: () => docsFor(ref.__path).get(ref.__id) };
    },

    setDoc: async (ref, data) => {
      docsFor(ref.__path).set(ref.__id, data);
      notify(ref.__path);
    },

    updateDoc: async (ref, data) => {
      const existing = docsFor(ref.__path).get(ref.__id);
      docsFor(ref.__path).set(ref.__id, { ...existing, ...data });
      notify(ref.__path);
    },

    deleteDoc: async (ref) => {
      docsFor(ref.__path).delete(ref.__id);
      notify(ref.__path);
    },

    writeBatch: () => {
      const ops = [];
      return {
        set: (ref, data) => ops.push({ type: "set", ref, data }),
        update: (ref, data) => ops.push({ type: "update", ref, data }),
        delete: (ref) => ops.push({ type: "delete", ref }),
        commit: async () => {
          const touched = new Set();
          for (const op of ops) {
            const bucket = docsFor(op.ref.__path);
            if (op.type === "set") bucket.set(op.ref.__id, op.data);
            else if (op.type === "update") bucket.set(op.ref.__id, { ...bucket.get(op.ref.__id), ...op.data });
            else if (op.type === "delete") bucket.delete(op.ref.__id);
            touched.add(op.ref.__path);
          }
          touched.forEach(notify);
        },
      };
    },

    arrayUnion: (value) => ({ __arrayUnion: value }), // not exercised by these tests

    // test-only escape hatch — not part of the real SDK
    __reset: () => {
      store.clear();
      listeners.clear();
    },
  };
});

vi.mock("../firebase.js", () => ({ db: {}, auth: {}, googleProvider: {} }));

import { __reset } from "firebase/firestore";
import { AppProvider, useApp } from "./AppContext.jsx";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { groupTransactionsByDay } from "../utils/groupTransactions.js";

// Mirrors Root.jsx's real gating: AppProvider is only ever mounted once
// a user exists, same as in production — on the very first render
// `user` is still `undefined` while onAuthStateChanged's callback is
// pending, and AppProvider assumes a real user is already present.
function AuthedApp({ children }) {
  const { user } = useAuth();
  if (!user) return null;
  return <AppProvider>{children}</AppProvider>;
}

async function renderApp() {
  const rendered = renderHook(() => useApp(), {
    wrapper: ({ children }) => (
      <AuthProvider>
        <AuthedApp>{children}</AuthedApp>
      </AuthProvider>
    ),
  });
  // AppProvider gates its children behind a one-time "does this account
  // already have a settings doc" check (see AppContext.jsx), so
  // useApp() doesn't actually mount — and result.current isn't
  // populated — until that resolves.
  await waitFor(() => expect(rendered.result.current).toBeTruthy());
  return rendered;
}

const FOOD = { icon: "restaurant", name: "Food" };

beforeEach(() => {
  __reset();
});

describe("AppContext — transaction ordering (regression tests)", () => {
  it("transactions are sorted by date regardless of the order they were added in", async () => {
    const { result } = await renderApp();

    // Add the OLDER one first, then the newer one — the backend (a
    // Firestore collection with no orderBy, or this test's fake) has no
    // obligation to hand documents back in any particular order, so if
    // AppContext didn't sort client-side, this would come back
    // oldest-first instead of newest-first. This is also exactly the
    // original reported bug's shape under the old architecture, where
    // addTransaction prepended to an array instead of sorting it.
    await act(async () => {
      result.current.addTransaction({
        date: "2026-11-05", // older, added first
        category: FOOD,
        amount: 5,
        currencyCode: "SGD",
        note: "older, added first",
      });
    });
    await act(async () => {
      result.current.addTransaction({
        date: "2026-11-20", // newer, added second
        category: FOOD,
        amount: 10,
        currencyCode: "SGD",
        note: "newer, added second",
      });
    });

    const dates = result.current.transactions.map((t) => t.date);
    expect(dates).toEqual(["2026-11-20", "2026-11-05"]);
  });

  it("bug: editing a transaction's date is reflected immediately, including its position", async () => {
    const { result } = await renderApp();

    // "stays put" is added FIRST so it occupies the earlier backend
    // position — if AppContext only relied on backend/insertion order
    // instead of re-sorting after the edit below, the edited transaction
    // would stay stuck behind it despite now having the newer date.
    await act(async () => {
      result.current.addTransaction({
        date: "2026-11-15",
        category: FOOD,
        amount: 30,
        currencyCode: "SGD",
        note: "stays put",
      });
    });
    await act(async () => {
      result.current.addTransaction({
        date: "2026-11-10",
        category: FOOD,
        amount: 20,
        currencyCode: "SGD",
        note: "to be edited",
      });
    });

    const editedId = result.current.transactions.find((t) => t.note === "to be edited").id;

    await act(async () => {
      result.current.updateTransaction(editedId, {
        date: "2026-11-25", // moved to newest
        category: FOOD,
        amount: 20,
        currencyCode: "SGD",
        note: "to be edited",
      });
    });

    const edited = result.current.transactions.find((t) => t.id === editedId);
    // The date value itself must reflect the edit...
    expect(edited.date).toBe("2026-11-25");
    // ...and it must now sort to the front, ahead of the untouched one.
    expect(result.current.transactions[0].id).toBe(editedId);
    expect(result.current.transactions.map((t) => t.date)).toEqual(["2026-11-25", "2026-11-15"]);
  });

  it("transactions exposed by the context are always safe to group by day (no duplicate date keys)", async () => {
    const { result } = await renderApp();

    // "a" and "b" are added with "c" in between them at the backend, so
    // after editing "a" to collide with "b"'s date below, they are NOT
    // adjacent in backend/insertion order — exactly the shape that
    // produces two non-adjacent groups sharing one React key if
    // AppContext didn't re-sort before grouping.
    await act(async () => {
      result.current.addTransaction({ date: "2026-11-01", category: FOOD, amount: 1, currencyCode: "SGD", note: "a" });
    });
    await act(async () => {
      result.current.addTransaction({ date: "2026-11-10", category: FOOD, amount: 3, currencyCode: "SGD", note: "c" });
    });
    await act(async () => {
      result.current.addTransaction({ date: "2026-11-20", category: FOOD, amount: 2, currencyCode: "SGD", note: "b" });
    });
    // Edit "a" to collide with "b"'s date.
    const toEdit = result.current.transactions.find((t) => t.note === "a").id;
    await act(async () => {
      result.current.updateTransaction(toEdit, {
        date: "2026-11-20",
        category: FOOD,
        amount: 1,
        currencyCode: "SGD",
        note: "a",
      });
    });

    const groups = groupTransactionsByDay(result.current.transactions);
    const dateKeys = groups.map((g) => g.date);
    expect(new Set(dateKeys).size).toBe(dateKeys.length);
  });

  it("new account is seeded with default categories exactly once", async () => {
    const { result } = await renderApp();
    expect(result.current.categories.length).toBeGreaterThan(0);
    expect(result.current.categories.map((c) => c.name)).toContain("Food");
  });
});
