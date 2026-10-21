import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProvider } from "./context/AppContext";
import "./styles/global.css";
createRoot(document.getElementById("root")!).render(<StrictMode><AppProvider><App /></AppProvider></StrictMode>);


// Register the PWA service worker in production for installability and offline shell support.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("MAAK service worker registration failed:", error);
    });
  });
}
