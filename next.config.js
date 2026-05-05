/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Garante que NEXTAUTH_URL funcione em qualquer URL de deployment Vercel
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  },
};
module.exports = nextConfig;
