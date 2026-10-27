import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthPayload } from "@/lib/auth/server-permission"

export async function POST(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const userId = payload.userId

  if (!branchId) {
    return NextResponse.json({ error: "Şube ID zorunludur" }, { status: 400 })
  }

  try {
    // 1. Create Niche if not exists
    let niche = await prisma.niche.findFirst({
      where: { name: "[DEMO] Teknoloji" }
    })
    if (!niche) {
      niche = await prisma.niche.create({
        data: { name: "[DEMO] Teknoloji" }
      })
    }

    // 2. Create Customers
    const customer1 = await prisma.customer.create({
      data: {
        branchId,
        name: "[DEMO] TeknoMarket Ltd. Şti.",
        company: "TeknoMarket",
        email: "info@teknomarket.com.tr",
        phone: "05321112233",
        status: "active",
        scoreTemp: "Sıcak",
        purchaseProb: 90,
        segment: "Kurumsal",
      }
    })

    const customer2 = await prisma.customer.create({
      data: {
        branchId,
        name: "[DEMO] Zeynep Çelik",
        company: "Çelik Tasarım",
        email: "zeynep@celiktasarim.com",
        phone: "05423334455",
        status: "active",
        scoreTemp: "Ilık",
        purchaseProb: 65,
        segment: "Perakende",
      }
    })

    const customer3 = await prisma.customer.create({
      data: {
        branchId,
        name: "[DEMO] Global Bilişim A.Ş.",
        company: "Global Bilişim",
        email: "destek@globalbilisim.com",
        phone: "02125556677",
        status: "pending",
        scoreTemp: "Soğuk",
        purchaseProb: 30,
        segment: "Kurumsal",
      }
    })

    // 3. Customer Notes, Chats, Tasks, Contacts
    await prisma.customerNote.createMany({
      data: [
        { customerId: customer1.id, content: "[DEMO] İlk görüşme yapıldı. Logo tasarımı ve sosyal medya yönetimi için teklif istiyorlar.", noteType: "Arama" },
        { customerId: customer2.id, content: "[DEMO] Fiyat teklifini yüksek buldu, revize istendi.", noteType: "Toplantı" }
      ]
    })

    await prisma.customerChat.createMany({
      data: [
        { customerId: customer1.id, type: "WhatsApp", content: "[DEMO] - Merhaba, teklifinizi inceledik. Haftaya salı günü toplantı yapalım mı?\n- Merhaba, tabii ki saat 14:00 uygun mudur?\n- Evet, uygundur." }
      ]
    })

    await prisma.customerTask.createMany({
      data: [
        { customerId: customer1.id, title: "[DEMO] Sözleşme Taslağını Gönder", description: "Sözleşme taslağını hazırlayıp e-posta ile ilet.", status: "Yapılacak", priority: "high", dueDate: new Date(Date.now() + 86400000) },
        { customerId: customer2.id, title: "[DEMO] Revize Fiyat Teklifi Hazırla", description: "İndirimli yeni teklif hazırlanacak.", status: "Yapılacak", priority: "normal", dueDate: new Date(Date.now() + 2 * 86400000) }
      ]
    })

    await prisma.customerContact.createMany({
      data: [
        { customerId: customer1.id, name: "[DEMO] Ahmet Yılmaz", role: "Satın Alma Müdürü", email: "ahmet.yilmaz@teknomarket.com.tr", phone: "05321112234" }
      ]
    })

    // 4. Projects
    await prisma.project.createMany({
      data: [
        { branchId, name: "[DEMO] Web Sitesi Yenileme", description: "Kurumsal web sitesinin modern arayüze geçirilmesi", status: "active", progress: 45, startDate: new Date(Date.now() - 7 * 86400000), endDate: new Date(Date.now() + 21 * 86400000) },
        { branchId, name: "[DEMO] Mobil Uygulama Geliştirme", description: "Müşteri paneli mobil uygulaması", status: "on_hold", progress: 15, startDate: new Date(Date.now() - 14 * 86400000), endDate: new Date(Date.now() + 60 * 86400000) },
        { branchId, name: "[DEMO] Sosyal Medya Yönetimi - Temmuz", description: "Temmuz ayı sosyal medya görselleri", status: "active", progress: 80, startDate: new Date(Date.now() - 7 * 86400000), endDate: new Date(Date.now() + 1 * 86400000) }
      ]
    })

    // 5. Leads
    await prisma.lead.createMany({
      data: [
        { branchId, name: "[DEMO] Solar Enerji A.Ş.", company: "Solar Enerji", email: "solar@enerji.com", phone: "05051234567", status: "new", source: "Instagram", notes: "[DEMO] Instagram reklamından ulaştı. Kurumsal kimlik çalışması istiyorlar.", scoreTemp: "Sıcak", timeline: "Hemen", budgetRange: "50.000 - 100.000 TL", createdById: userId },
        { branchId, name: "[DEMO] Trend Giyim", company: "Trend Giyim E-Ticaret", email: "trend@giyim.com", phone: "05559876543", status: "contacted", source: "Web Sitesi", notes: "[DEMO] E-ticaret reklam yönetimi talep ediyor.", scoreTemp: "Ilık", timeline: "Kısa vade", budgetRange: "20.000 - 50.000 TL", createdById: userId }
      ]
    })

    // 6. Orders
    await prisma.order.createMany({
      data: [
        { branchId, title: "[DEMO] Kurumsal Web Sitesi Arayüz Tasarımı", orderType: "Tasarım", quantity: 1, priority: "high", status: "in-progress", paymentStatus: "partial", totalAmount: 45000, customerName: "TeknoMarket Ltd. Şti." },
        { branchId, title: "[DEMO] Instagram Post Görselleri Hazırlama", orderType: "Sosyal Medya", quantity: 30, priority: "normal", status: "approved", paymentStatus: "paid", totalAmount: 15000, customerName: "Trend Giyim E-Ticaret" }
      ]
    })

    // 7. Reminders
    await prisma.reminder.createMany({
      data: [
        { branchId, title: "[DEMO] Vergileri Kontrol Et", description: "KDV ve muhtasar kontrol edilecek.", category: "Finans", dueDate: new Date(Date.now() + 3 * 86400000), priority: "high", status: "pending" },
        { branchId, title: "[DEMO] Müşteri Memnuniyeti Araması", description: "Hizmet alan müşterilerin aranıp sorulması", category: "Genel", dueDate: new Date(Date.now() + 7 * 86400000), priority: "normal", status: "pending" }
      ]
    })

    // 8. Finance
    await prisma.finance.createMany({
      data: [
        { branchId, type: "INCOME", amount: 15000, category: "Hizmet", description: "[DEMO] Trend Giyim Sosyal Medya Ödemesi", status: "approved", approvedBy: userId, date: new Date() },
        { branchId, type: "EXPENSE", amount: 3500, category: "Yazılım Lisansları", description: "[DEMO] Adobe Creative Cloud Aylık Üyelik", status: "approved", approvedBy: userId, date: new Date() },
        { branchId, type: "DEBT", amount: 12000, category: "Freelancer", description: "[DEMO] Mobil Uygulama Arayüz Çizimi Ödemesi", status: "pending", date: new Date() }
      ]
    })

    // 9. Todos
    await prisma.todo.createMany({
      data: [
        { userId, title: "[DEMO] Haftalık Ekip Toplantısı Sunumunu Hazırla", description: "Satış hedefleri ve durumları eklenecek.", priority: "medium", status: "pending", dueDate: new Date(Date.now() + 2 * 86400000) },
        { userId, title: "[DEMO] CRM Yedeklerini Kontrol Et", description: "Her şeyin yedeklendiğinden emin ol.", priority: "high", status: "completed" }
      ]
    })

    // 10. Notes
    await prisma.note.createMany({
      data: [
        { userId, title: "[DEMO] E-Ticaret Reklam Stratejileri", content: "Yaratıcı kampanya fikirleri:\n1. Sınırlı süreli indirim kuponları.\n2. Kullanıcı deneyim videolarını öne çıkarma.\n3. Influencer işbirlikleri." }
      ]
    })

    // 11. Candidates
    await prisma.candidate.createMany({
      data: [
        { branchId, firstName: "[DEMO] Ali", lastName: "Yılmaz", email: "ali.yilmaz@mail.com", phone: "05553332211", position: "UI/UX Tasarımcı", status: "Candidate", kanbanStatus: "Interview", department: "Tasarım", rating: 4, priority: "Normal" },
        { branchId, firstName: "[DEMO] Merve", lastName: "Kaya", email: "merve.kaya@mail.com", phone: "05324445566", position: "Node.js Developer", status: "Candidate", kanbanStatus: "Basvurdu", department: "Yazılım", rating: 5, priority: "Urgent" }
      ]
    })

    // 12. Appointments
    await prisma.appointment.createMany({
      data: [
        { branchId, title: "[DEMO] TeknoMarket Proje Tanıtım Toplantısı", description: "Web sitesi arayüz taslaklarının sunumu yapılacak.", startDate: new Date(Date.now() + 2 * 3600000), endDate: new Date(Date.now() + 3 * 3600000), status: "scheduled", color: "#10B981", userId },
        { branchId, title: "[DEMO] Aday Ali Yılmaz - Mülakat", description: "Tasarım ekibiyle teknik mülakat.", startDate: new Date(Date.now() + 24 * 3600000), endDate: new Date(Date.now() + 25 * 3600000), status: "scheduled", color: "#3B82F6", userId }
      ]
    })

    // 13. Announcements
    await prisma.announcement.createMany({
      data: [
        { title: "[DEMO] Yeni Sosyal Medya Çalışma Standartları", content: "Tüm sosyal medya post tasarımlarında yeni marka rehberimize uyulacaktır. Ayrıntılar Ajans Kütüphanesindeki ilgili PDF belgesinde yer almaktadır.", targetType: "all", createdById: userId }
      ]
    })

    // 14. Notifications
    await prisma.notification.createMany({
      data: [
        { userId, title: "[DEMO] Yeni Sipariş Girişi", message: "TeknoMarket için yeni sipariş oluşturuldu.", type: "success" },
        { userId, title: "[DEMO] Randevu Hatırlatması", message: "Ali Yılmaz ile mülakat saati yaklaşıyor.", type: "task" }
      ]
    })

    // 15. LibraryFolders and LibraryFiles
    const folder1 = await prisma.libraryFolder.create({
      data: {
        branchId,
        name: "[DEMO] Müşteri Sunumları",
        createdById: userId
      }
    })

    const folder2 = await prisma.libraryFolder.create({
      data: {
        branchId,
        name: "[DEMO] Sosyal Medya Şablonları",
        createdById: userId
      }
    })

    await prisma.libraryFile.createMany({
      data: [
        {
          branchId,
          folderId: folder1.id,
          originalName: "[DEMO] Kurumsal Kimlik Rehberi.pdf",
          mimeType: "application/pdf",
          sizeBytes: BigInt(1542000),
          checksumSha256: "abcdef123456",
          storagePath: "dummy/path/guidelines.pdf",
          uploadedById: userId
        },
        {
          branchId,
          folderId: folder2.id,
          originalName: "[DEMO] Instagram Tasarım Şablonu.psd",
          mimeType: "image/vnd.adobe.photoshop",
          sizeBytes: BigInt(25450000),
          checksumSha256: "psd123456",
          storagePath: "dummy/path/instagram.psd",
          uploadedById: userId
        }
      ]
    })

    // 16. ContentStores
    await prisma.contentStore.create({
      data: {
        url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
        originalName: "[DEMO] Ekip Toplantısı.jpg",
        mimeType: "image/jpeg",
        sizeBytes: BigInt(304800),
        type: "IMAGE",
        nicheId: niche.id,
        uploadedById: userId
      }
    })

    return NextResponse.json({ success: true, message: "Demo verileri başarıyla yüklendi!" })
  } catch (err: any) {
    console.error("Demo seeding error:", err)
    return NextResponse.json({ error: err.message || "Demo verileri yüklenirken hata oluştu" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const payload = await getAuthPayload()
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // 1. LibraryFiles
    await prisma.libraryFile.deleteMany({
      where: { originalName: { startsWith: "[DEMO]" } }
    })
    
    // 2. LibraryFolders
    await prisma.libraryFolder.deleteMany({
      where: { name: { startsWith: "[DEMO]" } }
    })

    // 3. ContentStore
    await prisma.contentStore.deleteMany({
      where: { originalName: { startsWith: "[DEMO]" } }
    })

    // 4. Niche
    await prisma.niche.deleteMany({
      where: { name: { startsWith: "[DEMO]" } }
    })

    // 5. Customer relations and Customer
    await prisma.customerNote.deleteMany({
      where: { content: { startsWith: "[DEMO]" } }
    })
    await prisma.customerChat.deleteMany({
      where: { content: { startsWith: "[DEMO]" } }
    })
    await prisma.customerTask.deleteMany({
      where: { title: { startsWith: "[DEMO]" } }
    })
    await prisma.customerContact.deleteMany({
      where: { name: { startsWith: "[DEMO]" } }
    })
    await prisma.customer.deleteMany({
      where: { name: { startsWith: "[DEMO]" } }
    })

    // 6. Project
    await prisma.project.deleteMany({
      where: { name: { startsWith: "[DEMO]" } }
    })

    // 7. Lead
    await prisma.lead.deleteMany({
      where: { name: { startsWith: "[DEMO]" } }
    })

    // 8. Order
    await prisma.order.deleteMany({
      where: { title: { startsWith: "[DEMO]" } }
    })

    // 9. Reminder
    await prisma.reminder.deleteMany({
      where: { title: { startsWith: "[DEMO]" } }
    })

    // 10. Finance
    await prisma.finance.deleteMany({
      where: { description: { startsWith: "[DEMO]" } }
    })

    // 11. Todo
    await prisma.todo.deleteMany({
      where: { title: { startsWith: "[DEMO]" } }
    })

    // 12. Note
    await prisma.note.deleteMany({
      where: { title: { startsWith: "[DEMO]" } }
    })

    // 13. Candidate & CandidateDocument
    await prisma.candidateDocument.deleteMany({
      where: { name: { startsWith: "[DEMO]" } }
    })
    await prisma.candidate.deleteMany({
      where: { firstName: { startsWith: "[DEMO]" } }
    })

    // 14. Appointment
    await prisma.appointment.deleteMany({
      where: { title: { startsWith: "[DEMO]" } }
    })

    // 15. Announcement
    await prisma.announcement.deleteMany({
      where: { title: { startsWith: "[DEMO]" } }
    })

    // 16. Notification
    await prisma.notification.deleteMany({
      where: { title: { startsWith: "[DEMO]" } }
    })

    return NextResponse.json({ success: true, message: "Tüm demo verileri başarıyla silindi!" })
  } catch (err: any) {
    console.error("Demo cleaning error:", err)
    return NextResponse.json({ error: err.message || "Demo verileri silinirken hata oluştu" }, { status: 500 })
  }
}
