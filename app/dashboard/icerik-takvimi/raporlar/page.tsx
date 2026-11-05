import { Metadata } from "next"
import WorkloadDashboard from "../components/WorkloadDashboard"

export const metadata: Metadata = {
  title: "İçerik Raporları ve İş Yükü | Sunum ERP",
  description: "Ajans genelinde platform bazlı içerik dağılımları, tamamlanma oranları ve ekip iş yükü.",
}

export default function RaporlarPage() {
  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-white/[0.06]">
        <h1 className="text-2xl font-light tracking-wide text-white">İçerik Takvimi Analiz ve Raporları</h1>
        <p className="text-xs text-zinc-400 mt-1">Platform dağılımları, iş yükü metrikleri ve ekip performans analizi</p>
      </div>
      <WorkloadDashboard branchId="all" />
    </div>
  )
}
