/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'https://patternaligned-api.onrender.com/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;