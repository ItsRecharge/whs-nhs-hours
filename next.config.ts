import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's query engine uses native modules that can't be bundled by webpack.
  // nodemailer also has optional native bindings. Keep them as runtime requires.
  serverExternalPackages: ["@prisma/client", "prisma", "nodemailer"],
  experimental: {
    serverActions: {
      // Hour-report proof photos upload through a server action; the default
      // 1 MB body cap would reject them.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
