import { useEffect, useState } from "react";

const DESKTOP_FORM_QUERY = "(min-width: 1024px)";

export function useDesktopFormLayout() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(DESKTOP_FORM_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_FORM_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
