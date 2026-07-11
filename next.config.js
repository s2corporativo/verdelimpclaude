/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14 usa a chave experimental; a raiz "serverExternalPackages" só existe no Next 15
  experimental: { serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"] },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;
