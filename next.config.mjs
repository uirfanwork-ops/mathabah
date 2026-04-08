/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // @react-pdf/renderer is a large Node-only dependency that ships native
  // bindings. Keep it external so Next.js doesn't try to bundle it into the
  // server or edge runtimes.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;
