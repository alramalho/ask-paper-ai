/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    // Make env var available in client-side code
    ENVIRONMENT: process.env.ENVIRONMENT,
    TEST_ID: process.env.TEST_ID,
  }
}

module.exports = nextConfig
