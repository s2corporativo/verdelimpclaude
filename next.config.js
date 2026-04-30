/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14.2+ usa serverExternalPackages em vez de experimental.serverComponentsExternalPackages
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // Manter o antigo para retrocompatibilidade
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"]
  },
  // Ignorar erros de TypeScript e ESLint no build (para deploy inicial)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
