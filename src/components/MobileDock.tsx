import { CalendarDays, Gift, House, UserRound } from "lucide-react";
import { useApp } from "../context/AppContext";

type MobileDockProps = { path: string };

export default function MobileDock({ path }: MobileDockProps) {
  const { lang } = useApp();
  const links = [
    { href: "/", label: lang === "ar" ? "الرئيسية" : "Home", Icon: House },
    { href: "/bookings", label: lang === "ar" ? "حجوزاتي" : "Bookings", Icon: CalendarDays },
    { href: "/rewards", label: lang === "ar" ? "المكافآت" : "Rewards", Icon: Gift },
    { href: "/account", label: lang === "ar" ? "حسابي" : "Account", Icon: UserRound },
  ];

  return (
    <nav className="mobile-dock glass" aria-label={lang === "ar" ? "التنقل الرئيسي" : "Main navigation"} dir={lang === "ar" ? "rtl" : "ltr"}>
      {links.map(({ href, label, Icon }) => (
        <a key={href} href={href} aria-label={label} aria-current={path === href ? "page" : undefined}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
