/**
 * phoneMatcher.ts — wa-connector ile AYNI dosya (kopyalanmış)
 * Kod tekrarını önlemek için ideal çözüm: ortak bir npm workspace paketi.
 * Şimdilik her servise kopyalanır — ileride monorepo'ya geçilince tek yerden import edilebilir.
 */

export function normalizePhone(raw: string): string | null {
  if (!raw) return null;

  let phone = raw.split('@')[0].trim();
  phone = phone.replace(/\D/g, '');

  if (!phone) return null;

  if (phone.length === 10 && phone.startsWith('5')) {
    return '+90' + phone;
  }
  if (phone.length === 11 && phone.startsWith('05')) {
    return '+90' + phone.slice(1);
  }
  if (phone.length === 12 && phone.startsWith('90')) {
    return '+' + phone;
  }
  if (phone.length >= 10) {
    return '+' + phone;
  }

  return null;
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}
