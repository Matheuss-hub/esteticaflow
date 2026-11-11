/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: process.env.CODESPACE_NAME
        ? ['localhost:3000', `${process.env.CODESPACE_NAME}-3000.app.github.dev`]
        : [],
    },
  },
};

export default nextConfig;
