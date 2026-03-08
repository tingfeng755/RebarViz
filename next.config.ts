import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? '/RebarViz' : '';

const nextConfig: NextConfig = {
  output: 'export',
 basePath: '/song',
assetPrefix: '/song', // 或者 '/song/'，保持原有斜杠格式即可
  images: { unoptimized: true },
  reactCompiler: true,
};

export default nextConfig;
