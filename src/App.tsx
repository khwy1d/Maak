import { useEffect, useState } from "react";
import { House, LayoutGrid, MessageCircle, Plus, Plane, UserRound } from "lucide-react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Pages from "./components/Pages";
import { Contact, Footer, How, Why } from "./components/Sections";
import SocialFollow from "./components/SocialFollow";
import GlassBackground from "./components/GlassBackground";

function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
}

export default function App() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const sync = () => { setPath(currentPath()); window.scrollTo(0, 0); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const isHome = path === "/";
  return (
    <>
      <GlassBackground />
      <div className="site-content">
      <a className="skip" href={isHome ? "#services" : "/services"}>Skip to content</a>
      <Header />
      {isHome ? <><main><Hero /><Services /><Why /><How /><Contact /><SocialFollow /></main></> : <Pages path={path} />}
      <Footer />
      <nav className="mobile-dock" aria-label="Quick navigation">
        <a href="/" aria-label="Home" aria-current={isHome ? "page" : undefined}><House aria-hidden="true" /><span>Home</span></a>
        <a href="/services" aria-label="Services" aria-current={path === "/services" ? "page" : undefined}><LayoutGrid aria-hidden="true" /><span>Services</span></a>
        <a className="dock-primary" href="https://wa.me/967776002190" aria-label="Start a WhatsApp inquiry"><Plus aria-hidden="true" /><span>Start</span></a>
        <a href="/flights" aria-label="Flight tickets"><Plane aria-hidden="true" /><span>Flights</span></a>
        <a href="/contact" aria-label="Contact us" aria-current={path === "/contact" ? "page" : undefined}><MessageCircle aria-hidden="true" /><span>Contact</span></a>
      </nav>
      </div>
    </>
  );
}
