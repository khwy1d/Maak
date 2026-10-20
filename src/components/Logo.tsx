import logo from "../assets/logo.svg";
import { useApp } from "../context/AppContext";

/** Official vector logo icon with a live localized wordmark. */
export default function Logo({ size = 44, wordmark = true }: { size?: number; wordmark?: boolean }) {
  const { t, lang } = useApp();
  const brandName = lang === "ar" ? "معك" : "MAAK";
  return (
    <span className="logo">
      <span className="logo-tile" style={{ width: size, height: size }}>
        <img src={logo} alt={t.a11y.logo} width={size} height={size} />
      </span>
      {wordmark && <span className="logo-word" lang={lang}>{brandName}</span>}
    </span>
  );
}
