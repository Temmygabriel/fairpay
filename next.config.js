/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent genlayer-js from being bundled server-side —
      // it references window/navigator at module level which crashes on the server
      config.externals = config.externals || [];
      config.externals.push("genlayer-js", "genlayer-js/chains", "genlayer-js/types");
    }
    return config;
  },
}
module.exports = nextConfig
