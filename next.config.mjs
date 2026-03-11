/** @type {import('next').NextConfig} */
const nextConfig = {
  appDir: true,
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: 'https://patternaligned-api.onrender.com/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
