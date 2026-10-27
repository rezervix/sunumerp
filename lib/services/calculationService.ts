export type RoundingStrategy = "none" | "hundred" | "90" | "99" | "premium"

export interface CalculationParams {
    productCost: number
    shippingCost: number
    commissionRate: number // Yüzde (ör: 10 = %10)
    vatRate: number // Yüzde (ör: 20 = %20)
    variantPrice?: number
    subtractVariant?: boolean
    roundingStrategy: RoundingStrategy
    manualProfitRate?: number // Gelişmiş simülasyon modu
}

export interface CalculationResult {
    baseCost: number
    commissionAmount: number
    vatAmount: number
    totalCost: number
    appliedProfitRate: number
    profitAmount: number
    calculatedPrice: number
    roundedPrice: number
    grossProfit: number
    netProfit: number
    netProfitMargin: number
}

/**
 * Toplam maliyete göre otomatik kâr marjını belirler.
 * Şirket kurallarına göre sabitlenmiş oranlar (Yüzde cinsinden).
 */
export function getProfitMargin(totalCost: number): number {
    if (totalCost <= 500) return 170
    if (totalCost <= 1000) return 150
    if (totalCost <= 3000) return 135
    if (totalCost <= 10000) return 125
    return 110 // 10.000 TL ve üzeri
}

/**
 * Fiyat yuvarlama stratejileri
 */
export function applyRounding(price: number, strategy: RoundingStrategy): number {
    switch (strategy) {
        case "hundred":
            // En yakın yüzlüğe yuvarla: 1440 -> 1400, 1460 -> 1500
            return Math.round(price / 100) * 100
        case "90":
            // X90'a tamamla: 1440 -> 1490
            return Math.floor(price / 100) * 100 + 90
        case "99":
            // X99'a tamamla: 1440 -> 1499
            return Math.floor(price / 100) * 100 + 99
        case "premium":
            // xxx0 premium görünümü: 1444 -> 1440
            return Math.round(price / 10) * 10
        case "none":
        default:
            // Küsüratlı iki hanede bırak
            return Number(price.toFixed(2))
    }
}

/**
 * Ana fiyatlandırma motoru çalıştırma fonksiyonu.
 */
export function calculatePrice(params: CalculationParams): CalculationResult {
    // 1. Temel Maliyet (Varyant hesaplaması opsiyoneldir)
    let baseCost = params.productCost + params.shippingCost

    if (params.variantPrice) {
        if (params.subtractVariant) {
            baseCost -= params.variantPrice
        } else {
            baseCost += params.variantPrice
        }
    }

    // İşlem sırasında 0'ın altına düşmesine izin verme
    if (baseCost < 0) baseCost = 0

    // 2. KDV (Maliyet üzerinden veya netleştirilmiş bir yapı mı? Verilen kurala göre üzerine eklenecek)
    const vatAmount = baseCost * (params.vatRate / 100)

    // 3. Komisyon (Satış platformu vb. için. Baz maliyet üzerinden hesaplıyoruz)
    const commissionAmount = baseCost * (params.commissionRate / 100)

    // 4. Toplam Fiili Maliyet
    const totalCost = baseCost + vatAmount + commissionAmount

    // 5. Kâr Marjını Belirle (Manuel geçersiz kılma varsa onu kullan)
    const appliedProfitRate = params.manualProfitRate !== undefined && params.manualProfitRate > 0
        ? params.manualProfitRate
        : getProfitMargin(totalCost)

    // 6. Kâr Miktarı
    const profitAmount = totalCost * (appliedProfitRate / 100)

    // 7. Hesaplanmış Çıplak Satış Fiyatı
    const calculatedPrice = totalCost + profitAmount

    // 8. Yuvarlama Stratejisi
    const roundedPrice = applyRounding(calculatedPrice, params.roundingStrategy)

    // 9. Kesinleşmiş Kâr Analizi (Yuvarlanmış fiyattan hesaplanan Ciro bazlı Net Kâr)
    // Brüt Kar: Satış - (Ürün Maliyeti + Kargo)
    const grossProfit = roundedPrice - baseCost

    // Net Kar: Yuvarlanmış Satış Fiyatı - Tüm Maliyetler
    // Not: Eğer komisyon ve KDV "satış fiyatı" üzerinden hesaplanıyorsa matematiğin tersine çevrilmesi gerekir. 
    // Görev tanımında "Base cost = productCost + shippingCost, Apply commission, Apply VAT, Compute total cost" sıralaması istendiği için maliyet üstü ekleme yapılmıştır.
    const netProfit = roundedPrice - totalCost

    // Net Kar Marjı Yüzdesi
    const netProfitMargin = (netProfit / roundedPrice) * 100

    return {
        baseCost: Number(baseCost.toFixed(2)),
        commissionAmount: Number(commissionAmount.toFixed(2)),
        vatAmount: Number(vatAmount.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        appliedProfitRate: Number(appliedProfitRate.toFixed(2)),
        profitAmount: Number(profitAmount.toFixed(2)),
        calculatedPrice: Number(calculatedPrice.toFixed(2)),
        roundedPrice: Number(roundedPrice.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        netProfitMargin: Number(netProfitMargin.toFixed(2))
    }
}
