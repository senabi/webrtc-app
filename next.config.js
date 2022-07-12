/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  publicRuntimeConfig: {
    APP_PORT: process.env.APP_PORT,
    WS_PORT: process.env.WS_PORT,
  },
};

module.exports = nextConfig;
