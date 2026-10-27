/**
 * Telefon numarası normalleştirme — Türkiye numaraları için E.164 formatına çevirir.
 *
 * Bu modül hem wa-connector hem ai-orchestrator tarafından AYNI FONKSIYON üzerinden
 * kullanılır — kod tekrarı yoktur, her iki serviste de bu dosya kopyalanarak kullanılır.
 *
 * Desteklenen formatlar → Çıktı (+90 prefix):
 *   05551234567    → +905551234567
 *   5551234567     → +905551234567
 *   905551234567   → +905551234567
 *   +905551234567  → +905551234567
 *   +90 555 123 45 67 → +905551234567
 *   +90-555-123-45-67 → +905551234567
 *   @s.whatsapp.net suffix (Baileys) → temizlenir
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;

  // Baileys JID suffix'ini temizle: "905551234567@s.whatsapp.net" → "905551234567"
  let phone = raw.split('@')[0].trim();

  // Sadece rakam bırak
  phone = phone.replace(/\D/g, '');

  if (!phone) return null;

  // 10 haneli Türkiye numarası: 5XXXXXXXXX
  if (phone.length === 10 && phone.startsWith('5')) {
    return '+90' + phone;
  }

  // 11 haneli: 05XXXXXXXXX
  if (phone.length === 11 && phone.startsWith('05')) {
    return '+90' + phone.slice(1);
  }

  // 12 haneli: 905XXXXXXXXX
  if (phone.length === 12 && phone.startsWith('90')) {
    return '+' + phone;
  }

  // 13 haneli: +905XXXXXXXXX (+ zaten silindi, 905...)
  if (phone.length === 12 && phone.startsWith('90')) {
    return '+' + phone;
  }

  // Zaten tam E.164 (başına + ekle)
  if (phone.length >= 10) {
    // Uluslararası format denemesi — Türkiye dışı numaralar için geçer bırak
    return '+' + phone;
  }

  return null;
}

/**
 * İki telefon numarasının aynı olup olmadığını kontrol eder.
 * Her ikisini de E.164'e normalize edip karşılaştırır.
 */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}
