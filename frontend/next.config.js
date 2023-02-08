/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    ENVIRONMENT: process.env.ENVIRONMENT, // Make env var available in client
  }
}

module.exports = nextConfig
