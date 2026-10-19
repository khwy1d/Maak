import logo from "../assets/logo.png";
import { useApp } from "../context/AppContext";
/** Official logo, unaltered (only surrounding whitespace was trimmed). */
export default function Logo({ size = 44, wordmark = true }: { size?: number; wordmark?: boolean }) {
  const { t } = useApp();
  return (
    <span className="logo">
      <span className="logo-tile" style={{ width: size, height: size }}>
        <img src={logo} alt={t.a11y.logo} width={size} height={size} />
      </span>
      {wordmark && <span className="logo-word">{t.brand}</span>}
    </span>
  );
}
