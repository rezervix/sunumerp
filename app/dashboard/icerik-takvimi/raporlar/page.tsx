import { Metadata } from "next"
import WorkloadDashboard from "../components/WorkloadDashboard"

export const metadata: Metadata = {
  title: "İçerik Raporları ve İş Yükü | Ajans ERP",
  description: "Ajans genelinde platform bazlı içerik dağılımları, tamamlanma oranları ve ekip iş yükü.",
}

export default function RaporlarPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">İçerik Takvimi Analiz ve Raporları</h1>
      <WorkloadDashboard branchId="all" />
    </div>
  )
}
