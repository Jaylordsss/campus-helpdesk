import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'Smart Campus Help Desk',
  description: 'ISAP & MCNP Smart Campus Help Desk — Alimanao, Peñablanca, Cagayan',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Campus HD',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-startup-image" href="/splash.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Campus HD" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1e293b" />
        <style>{`
          #app-splash {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            transition: opacity 0.4s ease, visibility 0.4s ease;
          }
          #app-splash.hidden {
            opacity: 0;
            visibility: hidden;
          }
          #app-splash .logo {
            width: 72px;
            height: 72px;
            background: linear-gradient(135deg, #dc2626, #2563eb);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            animation: splashPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          #app-splash .title {
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.3px;
          }
          #app-splash .subtitle {
            color: #64748b;
            font-size: 13px;
            font-family: 'Inter', sans-serif;
          }
          #app-splash .dots {
            display: flex;
            gap: 6px;
            margin-top: 8px;
          }
          #app-splash .dot {
            width: 6px;
            height: 6px;
            background: #334155;
            border-radius: 50%;
            animation: dotBounce 1.2s ease-in-out infinite;
          }
          #app-splash .dot:nth-child(2) { animation-delay: 0.2s; }
          #app-splash .dot:nth-child(3) { animation-delay: 0.4s; }
          @keyframes splashPop {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes dotBounce {
            0%, 80%, 100% { background: #334155; transform: scale(1); }
            40% { background: #94a3b8; transform: scale(1.3); }
          }
        `}</style>
      </head>
      <body>
        {/* PWA Splash Screen */}
        <div id="app-splash">
          <div className="logo">🎓</div>
          <p className="title">Campus Help Desk</p>
          <p className="subtitle">ISAP & MCNP</p>
          <div className="dots">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        </div>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function hideSplash() {
                var splash = document.getElementById('app-splash');
                if (splash) {
                  splash.classList.add('hidden');
                  setTimeout(function() {
                    if (splash.parentNode) splash.parentNode.removeChild(splash);
                  }, 400);
                }
              }
              if (document.readyState === 'complete') {
                setTimeout(hideSplash, 300);
              } else {
                window.addEventListener('load', function() {
                  setTimeout(hideSplash, 300);
                });
              }
              // Fallback — hide after 3 seconds no matter what
              setTimeout(hideSplash, 3000);
            })();
          `
        }} />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}