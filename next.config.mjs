/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      afterFiles: [
        {
          source: '/api/:path*',
          destination: 'https://patternaligned-api.onrender.com/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;