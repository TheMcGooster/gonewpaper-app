import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Go New Paper - Chariton Edition',
  description: 'Everything Local, All In Your Pocket. Your hyperlocal community hub for events, jobs, housing, and more.',
  keywords: 'Chariton, Iowa, local news, events, jobs, community, newspaper',
  openGraph: {
    title: 'Go New Paper - Chariton Edition',
    description: 'Everything Local, All In Your Pocket',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Barlow:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#2c3e50" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="google-site-verification" content="uC4FQ-KE1lYRbTl4P98TkxHhnH4ccUf88ytmj4TbPZI" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />
        <Script id="onesignal-init" strategy="afterInteractive">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              if (!OneSignal.appId) {
                await OneSignal.init({
                  appId: "a7951e0e-737c-42e6-bd9d-fc0931d95766",
                });
              }
            });
          `}
        </Script>
      </body>
    </html>
  )
}