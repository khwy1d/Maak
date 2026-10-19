import { useEffect, useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Pages from "./components/Pages";
import { About, Contact, FAQ, Footer, How, Why } from "./components/Sections";

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
      <a className="skip" href={isHome ? "#services" : "/services"}>Skip to content</a>
      <Header />
      {isHome ? <><main><Hero /><Services /><Why /><How /><About /><Contact /><FAQ /></main></> : <Pages path={path} />}
      <Footer />
    </>
  );
}
