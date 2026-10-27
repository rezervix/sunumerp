import { ContentItem, ProductionShoot } from "../shared-types"

interface BranchMinInfo {
  id: string
  name: string
  themeColor: string
  logoUrl?: string | null
}

const MOCK_POST_TITLES = [
  "Sektörel İpuçları & Öneriler",
  "Haftalık Sosyal Medya Bülteni",
  "Ürün Lansmanı Geri Sayım",
  "Müşteri Memnuniyeti Hikayemiz",
  "Ekibimizden Keyifli Kareler",
  "Yeni Kampanya Başladı!",
  "Sıkça Sorulan Sorular (SSS)",
  "Hafta Sonu Fırsatları",
  "Kullanıcı Deneyimleri ve Yorumlar",
  "İş Ortaklarımızla Röportaj",
  "Sektördeki Son Trendler",
  "Özel Gün Kutlaması",
  "Ofiste Sıradan Bir Gün",
  "Canlı Yayın Duyurusu",
  "Blog Yazımız Yayında!",
]

const MOCK_CAPTIONS = [
  "Harika bir hafta geçirmek için ipuçlarımıza göz atın! Detaylar profildeki linkte. 🚀 #sosyalmedya #trendler",
  "Yeni ürünümüzün lansmanına sayılı günler kaldı! Sizi de bu heyecana ortak olmaya davet ediyoruz. ✨ #yeniurun #lansman",
  "Sizlerden gelen güzel geri bildirimler bizi her gün daha da motive ediyor! İyi ki varsınız. ❤️ #musterimemnuniyeti",
  "Haftalık sektörel analiz bültenimiz yayında! Okumak için kaydırın veya bio'daki bağlantıyı ziyaret edin. 📚",
]

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "x"]
const CONTENT_TYPES = ["reels", "motion", "akis", "story"]
const STATUSES = ["taslak", "cekim_tasarim_bekliyor", "yuklendi", "revize_istendi", "onaylandi", "planlandi", "yayinlandi"]

export function generateMockCalendarData(
  fromDate: Date,
  toDate: Date,
  branchId: string | null,
  accessibleBranches: BranchMinInfo[]
): ContentItem[] {
  const items: ContentItem[] = []

  // Defensive Fallback: If accessibleBranches is empty, create default mock branches
  let targetBranches = accessibleBranches
  if (targetBranches.length === 0) {
    targetBranches = [
      { 
        id: branchId && branchId !== "all" ? branchId : "mock-branch-1", 
        name: "Arfa Holding", 
        themeColor: "#041627", 
        logoUrl: null 
      },
      { id: "mock-branch-2", name: "Parfame Perfume", themeColor: "#E1306C", logoUrl: null },
      { id: "mock-branch-3", name: "Kuscu Restoran", themeColor: "#FF9900", logoUrl: null },
    ]
  }

  // Filter based on requested branchId
  if (branchId && branchId !== "all") {
    targetBranches = targetBranches.filter(b => b.id === branchId)
  }
  
  if (targetBranches.length === 0) return []

  // Get all days between fromDate and toDate
  const days: Date[] = []
  const current = new Date(fromDate)
  while (current <= toDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Distribution generation
  let seed = 98765
  function random() {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }

  days.forEach((day) => {
    // 40% probability of posting on any day
    if (random() < 0.40) {
      const postsCount = random() < 0.20 ? 2 : 1 // 20% chance of double posting
      for (let i = 0; i < postsCount; i++) {
        const branch = targetBranches[Math.floor(random() * targetBranches.length)]
        const title = MOCK_POST_TITLES[Math.floor(random() * MOCK_POST_TITLES.length)]
        const caption = MOCK_CAPTIONS[Math.floor(random() * MOCK_CAPTIONS.length)]
        const contentType = CONTENT_TYPES[Math.floor(random() * CONTENT_TYPES.length)]
        const status = STATUSES[Math.floor(random() * STATUSES.length)]
        
        // Random platforms (1 to 3)
        const platformsCount = Math.floor(random() * 3) + 1
        const selectedPlatforms: string[] = []
        for (let p = 0; p < platformsCount; p++) {
          const plat = PLATFORMS[Math.floor(random() * PLATFORMS.length)]
          if (!selectedPlatforms.includes(plat)) {
            selectedPlatforms.push(plat)
          }
        }

        const scheduledTime = `${String(Math.floor(random() * 12) + 9).padStart(2, "0")}:${random() < 0.5 ? "00" : "30"}`

        items.push({
          id: `mock-post-${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}-${i}-${branch.id}`,
          branchId: branch.id,
          title: `${title}`,
          caption,
          description: "Demo modu: Bu içerik otomatik olarak üretilmiştir.",
          platforms: selectedPlatforms,
          contentType,
          scheduledDate: day.toISOString(),
          scheduledTime,
          status,
          createdById: "mock-user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          branch: {
            id: branch.id,
            name: branch.name,
            themeColor: branch.themeColor,
            logoUrl: branch.logoUrl || null,
          },
          media: [
            {
              id: `mock-media-${day.getDate()}-${i}`,
              fileUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500",
              fileType: "image",
              thumbnailUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150",
            }
          ],
          _count: {
            media: 1,
            chatLinks: 0,
          },
          clientApprovalRequired: true,
          clientApprovalStatus: status === "onaylandi" || status === "planlandi" || status === "yayinlandi" ? "approved" : "pending",
        })
      }
    }
  })

  return items
}

export function generateMockShoots(
  fromDate: Date,
  toDate: Date,
  branchId: string | null,
  accessibleBranches: BranchMinInfo[]
): ProductionShoot[] {
  const shoots: ProductionShoot[] = []

  // Defensive Fallback: If accessibleBranches is empty, create default mock branches
  let targetBranches = accessibleBranches
  if (targetBranches.length === 0) {
    targetBranches = [
      { 
        id: branchId && branchId !== "all" ? branchId : "mock-branch-1", 
        name: "Arfa Holding", 
        themeColor: "#041627" 
      },
      { id: "mock-branch-2", name: "Parfame Perfume", themeColor: "#E1306C" },
      { id: "mock-branch-3", name: "Kuscu Restoran", themeColor: "#FF9900" },
    ]
  }

  if (branchId && branchId !== "all") {
    targetBranches = targetBranches.filter(b => b.id === branchId)
  }
  
  if (targetBranches.length === 0) return []

  const days: Date[] = []
  const current = new Date(fromDate)
  while (current <= toDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Generate shoots on day index 5, 12 and 19
  days.forEach((day, index) => {
    if (index === 5 || index === 12 || index === 19) {
      const branch = targetBranches[index % targetBranches.length]
      shoots.push({
        id: `mock-shoot-${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}-${branch.id}`,
        branchId: branch.id,
        shootDate: day.toISOString(),
        shootTime: "13:00",
        location: "Arfa Stüdyoları, İstanbul",
        videographerIds: ["mock-videographer"],
        status: index === 5 ? "completed" : "planned",
        equipmentNotes: "Sony FX3, Tripod, Dji Mic 2",
        createdAt: new Date().toISOString(),
        branch: {
          id: branch.id,
          name: branch.name,
          themeColor: branch.themeColor
        },
        contentItems: [],
        _count: {
          contentItems: 0
        }
      })
    }
  })

  return shoots
}
