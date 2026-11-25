import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js");
    });
  } else {
    // Dev mode: a service worker registered by an earlier `npm run dev`
    // session caches responses and can keep serving them after a code
    // change, making a real fix look like it "didn't take" until the
    // cache happens to get refreshed. There's no reason to run the
    // offline cache while developing, so make sure none lingers.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }
}
