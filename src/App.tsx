import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import { About, Contact, FAQ, Footer, How, Why } from "./components/Sections";

export default function App() {
  return (<>
    <a className="skip" href="#services">Skip to content</a>
    <Header /><main><Hero /><Services /><Why /><How /><About /><Contact /><FAQ /></main><Footer />
  </>);
}
