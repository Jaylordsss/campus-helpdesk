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
    statusBarStyle: 'black-translucent',
    title: 'Campus HD',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ background: '#1e293b' }}>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Campus HD" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1e293b" />

        {/* Critical inline styles — load before ANYTHING else */}
        <style dangerouslySetInnerHTML={{ __html: `
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          html,body{
            background:#1e293b !important;
            min-height:100vh;
            -webkit-tap-highlight-color:transparent;
          }
          #splash{
            position:fixed;
            inset:0;
            z-index:99999;
            background:#1e293b;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:0;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          }
          #splash-icon{
            width:96px;
            height:96px;
            border-radius:24px;
            background:linear-gradient(135deg,#dc2626 0%,#2563eb 100%);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:48px;
            margin-bottom:20px;
            box-shadow:0 16px 48px rgba(0,0,0,0.5);
            animation:iconPop 0.45s cubic-bezier(0.175,0.885,0.32,1.275) both;
          }
          #splash-title{
            color:#ffffff;
            font-size:22px;
            font-weight:700;
            letter-spacing:-0.3px;
            animation:fadeUp 0.4s 0.2s ease both;
          }
          #splash-sub{
            color:#64748b;
            font-size:13px;
            margin-top:6px;
            animation:fadeUp 0.4s 0.3s ease both;
          }
          #splash-dots{
            display:flex;
            gap:6px;
            margin-top:32px;
            animation:fadeUp 0.4s 0.4s ease both;
          }
          #splash-dots span{
            width:7px;
            height:7px;
            border-radius:50%;
            background:#334155;
            display:inline-block;
            animation:dotBounce 1.2s ease-in-out infinite;
          }
          #splash-dots span:nth-child(2){animation-delay:0.2s}
          #splash-dots span:nth-child(3){animation-delay:0.4s}
          @keyframes iconPop{
            0%{transform:scale(0.4);opacity:0}
            100%{transform:scale(1);opacity:1}
          }
          @keyframes fadeUp{
            0%{transform:translateY(12px);opacity:0}
            100%{transform:translateY(0);opacity:1}
          }
          @keyframes dotBounce{
            0%,80%,100%{background:#334155;transform:scale(1)}
            40%{background:#94a3b8;transform:scale(1.4)}
          }
          #splash.fade-out{
            transition:opacity 0.35s ease;
            opacity:0;
            pointer-events:none;
          }
        `}} />
      </head>
      <body style={{ background: '#1e293b', margin: 0 }}>

        {/* Splash screen — renders instantly, zero black flash */}
        <div id="splash">
          <div id="splash-icon">🎓</div>
          <p id="splash-title">Campus Help Desk</p>
          <p id="splash-sub">ISAP &amp; MCNP</p>
          <div id="splash-dots">
            <span /><span /><span />
          </div>
        </div>

        {/* Hide splash as soon as page is interactive */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            function hide(){
              var s=document.getElementById('splash');
              if(!s||s.dataset.hidden)return;
              s.dataset.hidden='1';
              s.classList.add('fade-out');
              setTimeout(function(){
                if(s&&s.parentNode)s.parentNode.removeChild(s);
              },380);
            }
            // Hide when Next.js app is ready
            if(document.readyState==='complete'){
              setTimeout(hide,500);
            } else {
              window.addEventListener('load',function(){setTimeout(hide,500)});
            }
            // Safety fallback — max 4 seconds
            setTimeout(hide,4000);
          })();
        `}} />

        <ThemeProvider>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}