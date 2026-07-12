/** @type {import('next').NextConfig} */

// CSP: mantém 'unsafe-inline' porque o app usa estilos/atributos inline e o
// Next 14 injeta scripts de hidratação inline (sem nonce). connect-src libera
// só as APIs externas realmente usadas (BrasilAPI, ViaCEP, IBGE, GROQ, BCB).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://brasilapi.com.br https://viacep.com.br https://servicodados.ibge.gov.br https://api.groq.com https://api.bcb.gov.br https://pncp.gov.br",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  // Next 14 usa a chave experimental; a raiz "serverExternalPackages" só existe no Next 15
  experimental: { serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"] },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false, // não vazar "X-Powered-By: Next.js"
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
module.exports = nextConfig;
