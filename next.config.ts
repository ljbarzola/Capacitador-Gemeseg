import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone con un server.js mínimo para la imagen de Cloud Run.
  output: "standalone",
};

export default nextConfig;
