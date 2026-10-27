/**
 * Rate Limiter — Aynı numaraya art arda çok hızlı mesaj göndermeyi engeller.
 * WhatsApp'ın spam algılamasına takılmamak için minimum gecikme uygular.
 *
 * Kural:
 *  - Aynı numaraya gönderimler arası minimum 1500ms bekle
 *  - 60 saniye içinde aynı numaraya 10'dan fazla mesaj → engelle (olası döngü)
 */
export class RateLimiter {
  /** Son gönderim zamanı — phone → timestamp */
  private lastSentAt: Map<string, number> = new Map();
  /** 60s penceredeki gönderim sayısı — phone → sayı */
  private windowCount: Map<string, { count: number; windowStart: number }> = new Map();

  /** Minimum gönderimler arası bekleme (ms) */
  private readonly MIN_DELAY_MS = 1500;
  /** 60 saniyelik pencerede maksimum gönderim */
  private readonly MAX_PER_MINUTE = 10;
  /** Pencere süresi (ms) */
  private readonly WINDOW_MS = 60_000;

  /**
   * Gönderim yapılabilir mi?
   * @returns null → gönderilebilir; string → engel sebebi
   */
  canSend(phone: string): string | null {
    const now = Date.now();

    // Son gönderim kontrolü
    const last = this.lastSentAt.get(phone);
    if (last && now - last < this.MIN_DELAY_MS) {
      return `Çok hızlı gönderim: ${Math.ceil((this.MIN_DELAY_MS - (now - last)) / 1000)}s daha bekle`;
    }

    // Dakika başına limit kontrolü
    const win = this.windowCount.get(phone);
    if (win) {
      if (now - win.windowStart < this.WINDOW_MS) {
        if (win.count >= this.MAX_PER_MINUTE) {
          return `Rate limit: 60s içinde ${this.MAX_PER_MINUTE} mesaj limitine ulaşıldı`;
        }
      } else {
        // Pencere sıfırla
        this.windowCount.set(phone, { count: 0, windowStart: now });
      }
    }

    return null;
  }

  /** Başarılı gönderim sonrası kayıt */
  recordSent(phone: string): void {
    const now = Date.now();
    this.lastSentAt.set(phone, now);

    const win = this.windowCount.get(phone);
    if (!win || Date.now() - win.windowStart >= this.WINDOW_MS) {
      this.windowCount.set(phone, { count: 1, windowStart: now });
    } else {
      win.count++;
    }
  }

  /**
   * Minimum gecikmeyi bekle (gönderimden önce çağrılır)
   */
  async waitIfNeeded(phone: string): Promise<void> {
    const last = this.lastSentAt.get(phone);
    if (!last) return;

    const elapsed = Date.now() - last;
    if (elapsed < this.MIN_DELAY_MS) {
      const wait = this.MIN_DELAY_MS - elapsed;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
