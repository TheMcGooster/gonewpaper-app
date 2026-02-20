import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Go New Paper | Chariton, Iowa Local News, Events & Community',
  description: 'Go New Paper is Chariton, Iowa\'s hyperlocal community hub. Find local events, jobs, housing, obituaries, and community news — everything local, all in your pocket.',
  keywords: 'Go New Paper, GoNewPaper, Chariton Iowa, Chariton news, Lucas County Iowa, local events Chariton, Iowa community app, Chariton jobs, Chariton housing, local newspaper Iowa',
  metadataBase: new URL('https://www.gonewpaper.com'),
  alternates: {
    canonical: 'https://www.gonewpaper.com',
  },
  openGraph: {
    title: 'Go New Paper | Chariton, Iowa Local News & Community',
    description: 'Everything Local, All In Your Pocket. Chariton Iowa\'s hyperlocal hub for events, jobs, housing, obituaries and more.',
    type: 'website',
    url: 'https://www.gonewpaper.com',
    siteName: 'Go New Paper',
    images: [
      {
        url: 'https://www.gonewpaper.com/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Go New Paper - Chariton Iowa Community App',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Go New Paper | Chariton, Iowa Local News & Community',
    description: 'Everything Local, All In Your Pocket. Chariton Iowa\'s hyperlocal hub.',
    images: ['https://www.gonewpaper.com/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
        {/* JSON-LD Structured Data — helps Google understand what Go New Paper is */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Go New Paper",
              "alternateName": "GoNewPaper",
              "url": "https://www.gonewpaper.com",
              "description": "Chariton, Iowa's hyperlocal community hub for events, jobs, housing, obituaries, and local news.",
              "applicationCategory": "NewsApplication",
              "operatingSystem": "Web, iOS, Android",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Go New Paper",
                "url": "https://www.gonewpaper.com",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://www.gonewpaper.com/icon-512.png"
                },
                "areaServed": {
                  "@type": "City",
                  "name": "Chariton",
                  "containedInPlace": {
                    "@type": "State",
                    "name": "Iowa"
                  }
                }
              }
            })
          }}
        />
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
            if (!window.__oneSignalInitialized) {
              window.__oneSignalInitialized = true;
              OneSignalDeferred.push(async function(OneSignal) {
                try {
                  await OneSignal.init({
                    appId: "a7951e0e-737c-42e6-bd9d-fc0931d95766",
                    allowLocalhostAsSecureOrigin: true,
                  });
                  console.log("OneSignal initialized successfully");
                } catch (err) {
                  if (err && err.message && err.message.includes("already initialized")) {
                    console.log("OneSignal was already initialized, skipping");
                  } else {
                    console.error("OneSignal init error:", err);
                  }
                }
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
