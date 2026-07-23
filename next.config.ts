import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's query engine uses native modules that can't be bundled by webpack.
  // nodemailer also has optional native bindings. Keep them as runtime requires.
  serverExternalPackages: ["@prisma/client", "prisma", "nodemailer"],
};

export default nextConfig;
