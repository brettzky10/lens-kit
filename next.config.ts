import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "picsum.photos"
        },
        {
          protocol: "https",
          hostname: "replicate.delivery"
        }
      ],
    },
};

export default nextConfig;
