import { MessageCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { whatsappUrl, type WaTopic } from "../utils/whatsapp";
interface Props { topic?: WaTopic; label?: string; variant?: "primary" | "ghost" | "dark"; }
export default function WhatsAppButton({ topic = "general", label, variant = "primary" }: Props) {
  const { lang, t } = useApp();
  return (
    <a className={`btn btn-${variant}`} href={whatsappUrl(lang, topic)} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={18} aria-hidden="true" /> {label ?? t.whatsapp}
    </a>
  );
}
