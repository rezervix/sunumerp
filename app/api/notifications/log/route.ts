import { NextResponse } from 'next/server'
import { createAuditLog } from '@/lib/audit'

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {}
    
    // sendBeacon or JSON body handling
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const text = await req.text()
      try {
        body = JSON.parse(text)
      } catch {
        body = { rawText: text }
      }
    }

    // Isolate & archive diagnostic system log on server
    console.error('[SYSTEM_ISOLATED_LOG]', {
      timestamp: body.timestamp || new Date().toISOString(),
      url: body.url,
      title: body.title,
      originalMessage: body.originalMessage,
      context: body.context,
    })

    await createAuditLog({
      userId: 'SYSTEM_DIAGNOSTICS',
      action: 'ISOLATED_TECHNICAL_ERROR',
      resource: 'SYSTEM_NOTIFICATION',
      details: body,
    })

    return NextResponse.json({ success: true, message: 'Log archived successfully.' })
  } catch (error) {
    console.error('[SYSTEM_LOG_ENDPOINT_ERROR]', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
