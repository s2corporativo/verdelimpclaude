import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Verdelimp ERP",
  description: "Sistema Integrado de Gestão — VERDELIMP SERVICOS E TERCEIRIZACAO LTDA",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Verdelimp ERP" },
};

export const viewport: Viewport = {
  themeColor: "#1a7a4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker' in navigator){
            window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
          }
        `}} />
      </body>
    </html>
  );
}
