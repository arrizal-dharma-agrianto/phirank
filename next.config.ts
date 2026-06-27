import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['167.86.117.58'],
  serverExternalPackages: [
    "chrome-launcher", 
    "lighthouse",
    '@crawlee/cheerio',
    '@crawlee/core',
    '@crawlee/http',
    '@crawlee/utils',
    'cheerio',
    'header-generator',
    'got-scraping'
  ],
};

export default nextConfig;
