import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
