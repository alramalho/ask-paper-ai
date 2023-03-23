/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    // Make env var available in client-side code
    ENVIRONMENT: process.env.ENVIRONMENT,
    HIPPOAI_DISCORD_SERVER_ID: process.env.HIPPOAI_DISCORD_SERVER_ID,
    TEST_ID: process.env.TEST_ID,
  },
  webpack: (config) => {
    // load worker files as a urls by using Asset Modules
    // https://webpack.js.org/guides/asset-modules/
    config.module.rules.unshift({
      test: /pdf\.worker\.(min\.)?js/,
      type: "asset/resource",
      generator: {
        filename: "static/worker/[hash][ext][query]"
      }
    });

    return config;
  }
}

module.exports = nextConfig
