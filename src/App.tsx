import { lazy, Suspense, useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useApp } from "./context/AppContext";
import Header from "./components/Header";
import MobileHeader from "./components/MobileHeader";
import MobileDock from "./components/MobileDock";
import Hero from "./components/Hero";
import GlassBackground from "./components/GlassBackground";
import InquiryCapture from "./components/InquiryCapture";
import { getReferralCode } from "./lib/supabase";

const Services = lazy(() => import("./components/Services"));
const Pages = lazy(() => import("./components/Pages"));
const Account = lazy(() => import("./components/Account"));
const SocialFollow = lazy(() => import("./components/SocialFollow"));
const About = lazy(() => import("./components/Sections").then((module) => ({ default: module.About })));
const How = lazy(() => import("./components/Sections").then((module) => ({ default: module.How })));
const Why = lazy(() => import("./components/Sections").then((module) => ({ default: module.Why })));
const Footer = lazy(() => import("./components/Sections").then((module) => ({ default: module.Footer })));

function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
}

export default function App() {
  const [path, setPath] = useState(currentPath);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const { t, lang } = useApp();
  useEffect(() => {
    getReferralCode();
  }, []);

  useEffect(() => {
    const sync = () => { setPath(currentPath()); window.scrollTo(0, 0); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    const wasDismissed = () => {
      try { return sessionStorage.getItem("maak-install-dismissed") === "1"; }
      catch { return false; }
    };
    setInstallDismissed(wasDismissed(...[truncated]