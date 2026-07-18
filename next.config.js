/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 生产环境去除 console
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // antd / lucide-react tree-shaking
  modularizeImports: {
    'antd': {
      transform: 'antd/es/{{kebabCase member}}',
      skipDefaultConversion: true,
    },
    '@ant-design/icons': {
      transform: '@ant-design/icons/es/icons/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // 支持 PDF.js
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  // 实验性功能
  experimental: { esmExternals: 'loose' },
};

module.exports = nextConfig;
