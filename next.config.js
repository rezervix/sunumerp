/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  outputFileTracingIncludes: {
    "/**": [
      "./storage/ajans-kutuphanesi/.local-db.json",
      "./storage/system_config.json",
      "./public/uploads/pod-demo/**/*",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ]
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Windows pathlerinde kullanıcı adında ünlem (!) işareti varsa Webpack loader syntax ile çakışır.
    // context ve cacheDirectory temizlenir/normalize edilir.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    return config;
  },
  experimental: {
    webpackBuildWorker: false,
    serverActions: {
      bodySizeLimit: '10gb',
    },
  }
}

module.exports = nextConfig
