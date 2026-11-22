import { ensureZodJitless } from "./lib/zodSetup";
ensureZodJitless();
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./styles.css";
import { App } from "./App";

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // Offline cache ready silently; OfflineIndicator informs when offline
    },
  });
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
