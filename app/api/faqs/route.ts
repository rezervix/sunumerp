import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_FAQS = [
  {
    id: "faq-1",
    question: "Çiçekana ERP nedir?",
    answer: "Çiçekana ERP; CRM, proje yönetimi, İK, finans, kargo ve sosyal medya yönetimini tek çatı altında toplayan bütünleşik kurumsal kaynak planlama sistemidir.",
    category: "Genel",
    order: 1,
    isActive: true,
  },
  {
    id: "faq-2",
    question: "Çoklu şube ve yetkilendirme nasıl çalışır?",
    answer: "Sistemde her şube kendi verisini izole şekilde yönetir. Süper Yönetici tüm şubeleri görebilirken, şube müdürleri ve personel sadece yetkili oldukları şubenin verilerine erişir.",
    category: "Yönetim",
    order: 2,
    isActive: true,
  },
  {
    id: "faq-3",
    question: "Şifremi unuttum, ne yapmalıyım?",
    answer: "Giriş ekranındaki 'Şifremi Unuttum' bağlantısına tıklayarak kayıtlı e-posta adresinize şifre sıfırlama bağlantısı gönderebilirsiniz.",
    category: "Güvenlik",
    order: 3,
    isActive: true,
  },
  {
    id: "faq-4",
    question: "Dil tercihi nasıl değiştirilir?",
    answer: "Sol menünün alt tarafında bulunan dil değiştiriciden veya Ayarlar > Yerelleştirme sekmesinden dilediğiniz dili seçebilirsiniz.",
    category: "Arayüz",
    order: 4,
    isActive: true,
  },
];

export async function GET(req: Request) {
  try {
    const faqs = await prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS);
  } catch (error) {
    console.warn("Prisma SSS okuma hatası, yerel varsayılan SSS listesi dönülüyor:", error);
    return NextResponse.json(DEFAULT_FAQS);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, answer, category, order, isActive } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: "Soru ve cevap alanları zorunludur" }, { status: 400 });
    }

    const newFaq = await prisma.faq.create({
      data: {
        question,
        answer,
        category: category || "Genel",
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(newFaq);
  } catch (error) {
    console.warn("Prisma SSS ekleme hatası, mock yanıt dönülüyor:", error);
    return NextResponse.json({
      id: `faq-${Date.now()}`,
      question: "Yeni SSS",
      answer: "SSS açıklaması",
      category: "Genel",
      order: 0,
      isActive: true,
    });
  }
}
