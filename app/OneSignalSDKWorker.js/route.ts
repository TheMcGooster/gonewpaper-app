import { NextResponse } from 'next/server'

export async function GET() {
  const serviceWorkerCode = `importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');`

  return new NextResponse(serviceWorkerCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  })
}
