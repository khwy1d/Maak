export function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!/^[1-9][0-9]{6,14}$/.test(digits)) {
    throw new Error("WhatsApp destination must be an international number in digits-only format.");
  }
  return digits;
}

export function buildWhatsAppUrl(number: string, message: string): string {
  const digits = normalizeWhatsAppNumber(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
