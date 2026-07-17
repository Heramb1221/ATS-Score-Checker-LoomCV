/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb", // resume uploads capped at 5MB; small headroom
    },
  },
};

module.exports = nextConfig;
