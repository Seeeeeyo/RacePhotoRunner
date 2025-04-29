/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable Node.js version check
  experimental: {
    skipNodeVersionCheck: true,
    serverComponentsExternalPackages: []
  }
};

export default nextConfig; 