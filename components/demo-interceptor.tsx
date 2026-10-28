"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { mockDatabase } from "@/lib/data/mockDatabase"

export function DemoModeInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const originalFetch = window.fetch

    window.fetch = async function (...args) {
      const [input, init] = args
      const url = typeof input === "string" ? input : (input instanceof Request ? input.url : "")
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase()

      const jsonResponse = (data: any, status = 200) => {
        return new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json" }
        })
      }

      const parseBody = async () => {
        try {
          if (init?.body) {
            if (typeof init.body === "string") return JSON.parse(init.body)
          }
          if (input instanceof Request) {
            const clone = input.clone()
            return await clone.json()
          }
        } catch {
          return {}
        }
        return {}
      }

      // ── GET Interceptions for Public Demo ──
      if (method === "GET") {
        if (url.includes("/api/stats")) {
          return jsonResponse(mockDatabase.getStats())
        }

        if (url.includes("/api/customers")) {
          const urlObj = new URL(url, window.location.origin)
          const id = urlObj.searchParams.get("id")
          if (id) {
            const customer = mockDatabase.getCustomerById(id)
            if (customer) return jsonResponse(customer)
          }
          const customers = mockDatabase.getCustomers()
          return jsonResponse({
            data: customers,
            total: customers.length,
            page: 1,
            pageSize: 100
          })
        }

        if (url.includes("/api/orders")) {
          const orders = mockDatabase.getOrders()
          return jsonResponse({
            data: orders,
            total: orders.length,
            page: 1,
            pageSize: 100
          })
        }

        if (url.includes("/api/calendar/events")) {
          const events = mockDatabase.getCalendarEvents()
          return jsonResponse(events)
        }

        if (url.includes("/api/b2b/products")) {
          return jsonResponse(mockDatabase.getProducts())
        }

        if (url.includes("/api/b2b/requests")) {
          return jsonResponse(mockDatabase.getStockRequests())
        }

        if (url.includes("/api/hr")) {
          const candidates = mockDatabase.getCandidates()
          return jsonResponse({
            data: candidates,
            total: candidates.length,
            page: 1,
            pageSize: 100
          })
        }

        if (url.includes("/api/personel-talepleri")) {
          return jsonResponse(mockDatabase.getHRRequests())
        }

        if (url.includes("/api/finance") || url.includes("/api/financial")) {
          return jsonResponse(mockDatabase.getFinances())
        }
      }

      // ── Mutation Interceptions (Simulated Reactive CRUD) ──
      const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method)

      if (isMutation && url.includes("/api/")) {
        // Exempt auth routes so login / demo session works
        if (url.includes("/api/auth/")) {
          return originalFetch.apply(this, args)
        }

        const urlObj = new URL(url, window.location.origin)

        // Customers CRUD
        if (url.includes("/api/customers")) {
          if (method === "POST") {
            const body = await parseBody()
            const newCust = Array.isArray(body)
              ? body.map(b => mockDatabase.addCustomer(b))[0]
              : mockDatabase.addCustomer(body)
            toast.success("Demo: Müşteri başarıyla kaydedildi", {
              description: "Simülasyon modunda veri ekranda anlık güncellendi."
            })
            return jsonResponse({ success: true, count: 1, data: newCust })
          }
          if (method === "PUT") {
            const body = await parseBody()
            if (body.id) mockDatabase.updateCustomer(body.id, body)
            toast.success("Demo: Müşteri güncellendi")
            return jsonResponse({ success: true, data: body })
          }
          if (method === "DELETE") {
            const id = urlObj.searchParams.get("id")
            if (id) mockDatabase.deleteCustomer(id)
            toast.success("Demo: Müşteri silindi")
            return jsonResponse({ success: true })
          }
        }

        // Orders CRUD
        if (url.includes("/api/orders")) {
          if (method === "POST") {
            const body = await parseBody()
            const newOrder = mockDatabase.addOrder(body)
            toast.success("Demo: Sipariş oluşturuldu", {
              description: `${newOrder.orderNumber} numaralı sipariş listeye eklendi.`
            })
            return jsonResponse({ success: true, data: newOrder })
          }
          if (method === "PUT") {
            const body = await parseBody()
            if (body.id) mockDatabase.updateOrder(body.id, body)
            toast.success("Demo: Sipariş durumu güncellendi")
            return jsonResponse({ success: true, data: body })
          }
          if (method === "DELETE") {
            const id = urlObj.searchParams.get("id")
            if (id) mockDatabase.deleteOrder(id)
            toast.success("Demo: Sipariş silindi")
            return jsonResponse({ success: true })
          }
        }

        // Appointments / Calendar CRUD
        if (url.includes("/api/appointments")) {
          if (method === "POST") {
            const body = await parseBody()
            const newEvent = mockDatabase.addCalendarEvent(body)
            toast.success("Demo: Randevu takvime eklendi")
            return jsonResponse({ success: true, data: newEvent })
          }
          if (method === "DELETE") {
            const parts = url.split("/")
            const id = parts[parts.length - 1].split("?")[0]
            if (id) mockDatabase.deleteCalendarEvent(id)
            toast.success("Demo: Randevu silindi")
            return jsonResponse({ success: true })
          }
        }

        // B2B Products & Requests CRUD
        if (url.includes("/api/b2b/products")) {
          if (method === "POST") {
            const body = await parseBody()
            const newProd = mockDatabase.addProduct(body)
            toast.success("Demo: Yeni ürün mağazaya eklendi")
            return jsonResponse({ success: true, data: newProd })
          }
          if (method === "PUT") {
            const body = await parseBody()
            if (body.id) mockDatabase.updateProduct(body.id, body)
            toast.success("Demo: Ürün güncellendi")
            return jsonResponse({ success: true, data: body })
          }
        }

        if (url.includes("/api/b2b/requests")) {
          if (method === "POST") {
            const body = await parseBody()
            const newReq = mockDatabase.addStockRequest(body)
            toast.success("Demo: Ürün/stok talebi iletildi")
            return jsonResponse({ success: true, data: newReq })
          }
        }

        // HR Candidates CRUD
        if (url.includes("/api/hr")) {
          if (method === "POST") {
            const body = await parseBody()
            const newCandidate = mockDatabase.addCandidate(body)
            toast.success("Demo: Aday kaydı oluşturuldu")
            return jsonResponse({ success: true, data: newCandidate })
          }
          if (method === "PUT") {
            const body = await parseBody()
            if (body.id) mockDatabase.updateCandidate(body.id, body)
            toast.success("Demo: Aday bilgileri güncellendi")
            return jsonResponse({ success: true, data: body })
          }
        }

        // Personel Talepleri CRUD
        if (url.includes("/api/personel-talepleri")) {
          if (method === "POST") {
            const body = await parseBody()
            const newReq = mockDatabase.addHRRequest(body)
            toast.success("Demo: Personel talebi iletildi")
            return jsonResponse({ success: true, data: newReq })
          }
        }

        // Generic fallback for any other demo mutations
        toast.info("Demo Modu: Salt Okunur Simülasyon", {
          description: "İşlem demo ortamında başarıyla simüle edildi.",
          duration: 3000
        })

        return jsonResponse({
          success: true,
          demoSimulated: true,
          id: `demo-sim-${Date.now()}`,
          message: "Demo modunda işlem simüle edildi",
          status: "success",
          data: { id: `demo-sim-${Date.now()}` }
        })
      }

      return originalFetch.apply(this, args)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
