import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const normalizedBasePath = basePath && basePath !== '/' 
  ? basePath.startsWith('/') 
    ? basePath.endsWith('/') 
      ? basePath.slice(0, -1)
      : basePath
    : `/${basePath}`
  : '';

const nextConfig: NextConfig = {
  ...(normalizedBasePath && { basePath: normalizedBasePath }),
};

export default nextConfig;
