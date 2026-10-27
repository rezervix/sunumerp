import { Metadata } from "next"
import IcerikTakvimiClient from "./IcerikTakvimiClient"

export const metadata: Metadata = {
  title: "İçerik Takvimi | Ajans ERP",
  description: "Ajans içerik üretim sürecini planlayın, çekimleri yönetin, ekibinize görev atayın.",
}

export default function IcerikTakvimiPage() {
  return <IcerikTakvimiClient />
}
