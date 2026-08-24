/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    instrumentationHook: true,
  },
  async rewrites() {
    return [
      {
        source: "/recordings/upload",
        destination: "/api/recordings/upload",
      },
      {
        source: "/recordings/meeting/:meetingId",
        destination: "/api/recordings/meeting/:meetingId",
      },
    ];
  },
};

module.exports = nextConfig;
