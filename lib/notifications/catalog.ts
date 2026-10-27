/**
 * Çiçekana ERP — Müşteri Dostu Bildirim (Microcopy) Kataloğu
 * Bu katalog, sistemdeki tüm bildirim durumlarını, görsel tipleri (SUCCESS, INFO, WARNING, ERROR)
 * ve gösterim biçimlerini (Toast, Modal, Banner) merkezi olarak tanımlar.
 */

export type NotificationCategory = 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR'
export type NotificationType = 'TOAST' | 'MODAL' | 'BANNER'

export interface NotificationDefinition {
  id: string
  category: NotificationCategory
  type: NotificationType
  title: string
  message: string
  autoCloseMs?: number
  audioAlert?: boolean
}

export const NOTIFICATION_CATALOG = {
  // 1. GENEL SİSTEM & ALTYAPI BİLDİRİMLERİ
  SYSTEM: {
    INTERNET_DISCONNECTED: {
      id: 'system_internet_disconnected',
      category: 'ERROR' as NotificationCategory,
      type: 'BANNER' as NotificationType,
      title: 'İnternet Bağlantısı Kesildi',
      message: 'Çevrimdışı moddasınız. Yaptığınız değişiklikler bağlantı sağlandığında senkronize edilecektir.',
    },
    INTERNET_RESTORED: {
      id: 'system_internet_restored',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Bağlantı Yeniden Sağlandı',
      message: 'İnternet Bağlantısı Yeniden Sağlandı. Çevrimdışı verileriniz başarıyla güncellendi.',
      autoCloseMs: 5000,
    },
    SLOW_CONNECTION: {
      id: 'system_slow_connection',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Zayıf İnternet Bağlantısı',
      message: 'Zayıf İnternet Bağlantısı. İşleminiz normalden biraz daha uzun sürebilir, lütfen bekleyin.',
      autoCloseMs: 5000,
    },
    SESSION_TIMEOUT: {
      id: 'system_session_timeout',
      category: 'WARNING' as NotificationCategory,
      type: 'MODAL' as NotificationType,
      title: 'Oturum Süresi Doldu',
      message: 'Güvenliğiniz İçin Oturumunuz Sona Erdi. Lütfen devam etmek için yeniden giriş yapın.',
    },
    NEW_VERSION_RELEASE: {
      id: 'system_new_version_release',
      category: 'INFO' as NotificationCategory,
      type: 'BANNER' as NotificationType,
      title: 'Yeni Sürüm Kullanılabilir',
      message: "Çiçekana ERP'nin Yeni Sürümü Hazır! Yeni özellikleri kullanmak için uygulamayı şimdi yeniden başlatabilirsiniz.",
    },
    GENERIC_ERROR: {
      id: 'system_generic_error',
      category: 'ERROR' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'İşlem Başarısız Oldu',
      message: 'Talebiniz şu anda gerçekleştirilemedi. Sistem kayıtları teknik ekibimize iletildi, lütfen kısa bir süre sonra tekrar deneyin.',
      autoCloseMs: 5000,
    },
  },

  // MODÜL 1: Yapay Zekâ Destekli WhatsApp CRM & Müşteri Hizmetleri
  WHATSAPP_AI_CRM: {
    AI_ENABLED: {
      id: 'wa_ai_enabled',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Yapay Zekâ Aktif',
      message: 'Müşteri için Yapay Zekâ yanıt sistemi aktif edildi.',
      autoCloseMs: 5000,
    },
    AI_DISABLED: {
      id: 'wa_ai_disabled',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Yapay Zekâ Durduruldu',
      message: 'Yapay Zekâ yanıt sistemi durduruldu. Mesajlar manuel modda.',
      autoCloseMs: 5000,
    },
    ESCALATION_HUMAN: (customerName: string) => ({
      id: 'wa_escalation_human',
      category: 'INFO' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Temsilci Desteği Talebi',
      message: `${customerName} temsilci desteği talep ediyor. Sohbet canlı bir temsilciye devredildi.`,
      autoCloseMs: 5000,
      audioAlert: true,
    }),
    SHADOW_MODE_DRAFT: (customerName: string) => ({
      id: 'wa_shadow_mode_draft',
      category: 'INFO' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Yapay Zekâ Taslağı Hazır',
      message: `Yapay Zekâ ${customerName} için bir yanıt taslağı hazırladı. Onaylamak için sohbet penceresini inceleyebilirsiniz.`,
      autoCloseMs: 5000,
    }),
    MISSING_KNOWLEDGE_BASE: {
      id: 'wa_missing_knowledge_base',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Bilgi Tabanı Eksik',
      message: 'Aradığınız soruya ait doküman bilgi tabanında bulunamadı. Lütfen ilgili dokümanı Ajans Kütüphanesine yükleyin.',
      autoCloseMs: 5000,
    },
  },

  // MODÜL 2: WhatsApp Sohbet ve Medya Entegrasyonu
  WHATSAPP_MEDIA: {
    CHAT_IMPORT_SUCCESS: (count: number) => ({
      id: 'wa_import_success',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Sohbet Geçmişi Yüklendi',
      message: `Sohbet Geçmişi Yüklendi. Toplam ${count} adet mesaj ve medya başarıyla içe aktarıldı.`,
      autoCloseMs: 5000,
    }),
    DUPLICATE_IMPORT: {
      id: 'wa_duplicate_import',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Mükerrer Yükleme Atlandı',
      message: 'Bu sohbet yedeği daha önce sisteme yüklenmiş. Mükerrer kayıt oluşturulmaması için işlem atlandı.',
      autoCloseMs: 5000,
    },
    UNSUPPORTED_OR_CORRUPT_ZIP: {
      id: 'wa_corrupt_zip',
      category: 'ERROR' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Sohbet Yedeği Okunamadı',
      message: "Sohbet Yedeği Okunamadı. Lütfen WhatsApp'tan dışa aktardığınız geçerli bir .zip dosyası seçtiğinizden emin olun.",
      autoCloseMs: 5000,
    },
    LARGE_VIDEO_PROCESSING: {
      id: 'wa_large_video',
      category: 'INFO' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Video İşleniyor',
      message: 'Videonuz işleniyor. Yükleme tamamlandığında sohbet ekranında oynatılabilir olacaktır.',
      autoCloseMs: 5000,
    },
  },

  // MODÜL 3: Night Scan Engine (Potansiyel Müşteri Keşif Robotu)
  NIGHT_SCAN: {
    SCAN_STARTED: {
      id: 'night_scan_started',
      category: 'INFO' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Gece Taraması Başlatıldı',
      message: 'Sektörel gece taraması başlatıldı. Yeni müşteri adayları taranıyor...',
      autoCloseMs: 5000,
    },
    SCAN_COMPLETED: (leadCount: number) => ({
      id: 'night_scan_completed',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Gece Taraması Bitti!',
      message: `Gece Taraması Bitti! Aranan kritere uygun ${leadCount} adet yeni potansiyel müşteri adayı (Lead) CRM panelinize eklendi.`,
      autoCloseMs: 5000,
    }),
    NO_DATA_FOUND: {
      id: 'night_scan_no_data',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Yeni İşletme Kaydı Bulunamadı',
      message: 'Belirtilen konum ve sektör kriterlerinde yeni bir işletme kaydına rastlanmadı. Kriterleri genişletmeyi deneyebilirsiniz.',
      autoCloseMs: 5000,
    },
  },

  // MODÜL 4: CRM ve Satış Boru Hattı (Leads)
  CRM: {
    OVERDUE_FOLLOW_UP: (companyName: string) => ({
      id: 'crm_overdue_followup',
      category: 'ERROR' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Müşteri Takip Zamanı!',
      message: `Müşteri Takip Zamanı! ${companyName} ile yapacağınız görüşme saati geçti.`,
      autoCloseMs: 5000,
      audioAlert: true,
    }),
    OPPORTUNITY_WON: (companyName: string) => ({
      id: 'crm_opp_won',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Fırsat Kazanıldı!',
      message: `Tebrikler! ${companyName} fırsatı 'Kazanıldı' olarak işaretlendi.`,
      autoCloseMs: 5000,
    }),
    MISSING_CUSTOMER_INFO: {
      id: 'crm_missing_info',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Müşteri Bilgisi Eksik',
      message: 'Lütfen teklif oluşturmadan önce müşteri kartındaki Vergi/İletişim bilgilerini tamamlayın.',
      autoCloseMs: 5000,
    },
  },

  // MODÜL 5: Ajans Kütüphanesi ve Dosya/Medya Dönüştürme
  LIBRARY: {
    UPLOAD_PAUSED: {
      id: 'lib_upload_paused',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Yükleme Duraklatıldı',
      message: 'Dosya yüklemesi internet bağlantısı nedeniyle duraklatıldı. Bağlantı sağlandığında otomatik devam edecek.',
      autoCloseMs: 5000,
    },
    UPLOAD_SUCCESS: (fileName: string) => ({
      id: 'lib_upload_success',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Dosya Yüklendi',
      message: `${fileName} kütüphaneye başarıyla yüklendi.`,
      autoCloseMs: 5000,
    }),
    CONVERTING_PROGRESS: (fileName: string, progressPercent: number) => ({
      id: 'lib_converting_progress',
      category: 'INFO' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Medya Dönüştürülüyor',
      message: `${fileName} PDF/WebP formatına dönüştürülüyor... (%${progressPercent})`,
      autoCloseMs: 3000,
    }),
    CONVERSION_FINISHED: {
      id: 'lib_conversion_finished',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Dönüştürme Tamamlandı',
      message: 'Dönüştürme Tamamlandı. Dosyanız önizlemeye hazır.',
      autoCloseMs: 5000,
    },
    INVALID_MIME_FORMAT: {
      id: 'lib_invalid_format',
      category: 'ERROR' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Desteklenmeyen Dosya Formatı',
      message: 'Desteklenmeyen Dosya Formatı. Lütfen geçerli bir görsel, video veya doküman dosyası seçin.',
      autoCloseMs: 5000,
    },
    CONCURRENCY_LIMIT: {
      id: 'lib_concurrency_limit',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'İşlem Limiti Aşımı',
      message: 'Şu anda devam eden 3 adet dönüştürme işleminiz var. Lütfen mevcut işlemlerin bitmesini bekleyin.',
      autoCloseMs: 5000,
    },
  },

  // MODÜL 6: Sosyal Medya İçerik Takvimi
  SOCIAL_MEDIA: {
    SENT_FOR_APPROVAL: {
      id: 'social_sent_approval',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Onay Bağlantısı İletildi',
      message: 'İçerik onay bağlantısı müşteriye başarıyla iletildi.',
      autoCloseMs: 5000,
    },
    REVISION_REQUESTED: (brandName: string, title: string, clientNote: string) => ({
      id: 'social_revision_req',
      category: 'ERROR' as NotificationCategory,
      type: 'BANNER' as NotificationType,
      title: 'Revizyon Talebi',
      message: `${brandName} ${title} için revizyon talep etti! Not: '${clientNote}'`,
    }),
    APPROVED_BY_CLIENT: (brandName: string) => ({
      id: 'social_approved',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'İçerik Onaylandı',
      message: `${brandName} içeriği onayladı! Paylaşım takvime sabitlendi.`,
      autoCloseMs: 5000,
    }),
    MISSING_EDITOR: {
      id: 'social_missing_editor',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Editör Ataması Eksik',
      message: "İçeriği 'Kurgu Aşamasında' durumuna çekebilmek için lütfen bir Editör atayın.",
      autoCloseMs: 5000,
    },
  },

  // MODÜL 7: Şubeli B2B Mağaza & Stok Talepleri
  B2B: {
    STOCK_REQUEST_APPROVED: (branchName: string) => ({
      id: 'b2b_stock_approved',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Stok İstek Onayı',
      message: `${branchName} tarafından iletilen stok talebi merkez tarafından onaylandı.`,
      autoCloseMs: 5000,
    }),
    CARGO_TRACKING_UPDATE: (orderNo: string, trackingNo: string) => ({
      id: 'b2b_cargo_update',
      category: 'INFO' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Kargo Takip Güncellemesi',
      message: `${orderNo} numaralı gönderiniz kargoya verildi. Takip No: ${trackingNo}`,
      autoCloseMs: 5000,
    }),
    INSUFFICIENT_STOCK: (availableStock: number) => ({
      id: 'b2b_insufficient_stock',
      category: 'ERROR' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Yetersiz Stok',
      message: `Talep edilen miktarda ürün merkez depoda bulunmamaktadır. Mevcut stok: ${availableStock} adet.`,
      autoCloseMs: 5000,
    }),
  },

  // MODÜL 8: Akıllı Bütçelendirme & Fiyatlandırma Motoru
  PRICING: {
    NEGATIVE_PROFITABILITY_MODAL: (lossPercentage: number) => ({
      id: 'pricing_negative_profit',
      category: 'ERROR' as NotificationCategory,
      type: 'MODAL' as NotificationType,
      title: 'Kârlılık Uyarısı!',
      message: `Kârlılık Uyarısı! Girdiğiniz maliyetler ve indirimler sonucunda bu satıştan kâr elde edemiyorsunuz (%${lossPercentage} Zarar).`,
    }),
    SIMULATION_SAVED: {
      id: 'pricing_sim_saved',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Simülasyon Kaydedildi',
      message: 'Fiyatlandırma simülasyonu arşivinize eklendi.',
      autoCloseMs: 5000,
    },
  },

  // MODÜL 9: İş, Görev ve Süre Takip (Timesheets)
  TIMESHEETS: {
    TIMER_STARTED: (taskName: string) => ({
      id: 'time_started',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Süreç Başlatıldı',
      message: `Süreç Başlatıldı: '${taskName}' için kronometre çalışıyor.`,
      autoCloseMs: 5000,
    }),
    TIMER_PAUSED: (elapsedText: string) => ({
      id: 'time_paused',
      category: 'INFO' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Sayaç Duraklatıldı',
      message: `Sayaç Duraklatıldı. Geçen süre: ${elapsedText}.`,
      autoCloseMs: 5000,
    }),
    OVERDUE_TASK: (taskName: string) => ({
      id: 'time_overdue_task',
      category: 'ERROR' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Geciken Görev!',
      message: `Geciken Görev! Bitiş tarihi geçen '${taskName}' göreviniz öncelikli listeye taşındı.`,
      autoCloseMs: 5000,
    }),
    FORGOTTEN_TIMER_ALERT: (taskName: string) => ({
      id: 'time_forgotten_alert',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Sayaç Hatırlatması',
      message: `Sayaç 4 saattir kesintisiz çalışıyor. Halen '${taskName}' üzerinde mi çalışıyorsunuz?`,
      autoCloseMs: 5000,
    }),
  },

  // MODÜL 10: İnsan Kaynakları & AI CV Parser
  HR: {
    CV_PARSED_SUCCESS: {
      id: 'hr_cv_parsed',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'CV Okundu',
      message: 'Özgeçmiş Yapay Zekâ Tarafından Okundu. Aday bilgileri forma otomatik aktarıldı.',
      autoCloseMs: 5000,
    },
    UNREADABLE_CV_PDF: {
      id: 'hr_unreadable_pdf',
      category: 'WARNING' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'PDF Okunamadı',
      message: 'Yüklenen PDF formatı okunamadı. Lütfen bilgileri manuel girin veya farklı bir özgeçmiş yükleyin.',
      autoCloseMs: 5000,
    },
  },

  // MODÜL 11: Yönetim, Destek & Güvenlik
  MANAGEMENT: {
    EOD_REPORT_SUBMITTED: {
      id: 'mgmt_eod_submitted',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Rapor İletildi',
      message: 'Gün Sonu Raporunuz yöneticinize başarıyla iletildi. İyi istirahatler!',
      autoCloseMs: 5000,
    },
    SUPPORT_TICKET_SENT: (ticketNo: string) => ({
      id: 'mgmt_support_sent',
      category: 'SUCCESS' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Hata Bildirimi Alındı',
      message: `Hata Bildirimi Alındı. Ekran görüntünüz ve sistem loglarınız teknik ekibe iletildi. Bilet No: #${ticketNo}`,
      autoCloseMs: 5000,
    }),
    UNAUTHORIZED_ACCESS: {
      id: 'mgmt_unauthorized',
      category: 'ERROR' as NotificationCategory,
      type: 'TOAST' as NotificationType,
      title: 'Erişim Engellendi',
      message: 'Erişim Engellendi. Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır. Lütfen yöneticinizle iletişime geçin.',
      autoCloseMs: 5000,
    },
    TRASH_CONFIRMATION_MODAL: (itemName: string) => ({
      id: 'mgmt_trash_confirm',
      category: 'WARNING' as NotificationCategory,
      type: 'MODAL' as NotificationType,
      title: 'Çöp Kutusu Onayı',
      message: `${itemName} çöp kutusuna taşınacak. 30 gün boyunca istediğiniz zaman geri yükleyebilirsiniz. Onaylıyor musunuz?`,
    }),
  },
}
