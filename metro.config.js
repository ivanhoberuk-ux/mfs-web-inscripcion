// FILE: metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolver aliases para evitar problemas con módulos
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  tslib: path.resolve(__dirname, 'node_modules/tslib/tslib.js'),
  '@expo/metro-config/build/async-require': path.resolve(__dirname, 'shims/async-require.js'),
};

// Resolver para manejar extensiones de archivos específicas de web
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'web.ts',
  'web.tsx',
  'web.js',
  'web.jsx'
];

// Deshabilitar imports dinámicos de async-require
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Blacklist para módulos problemáticos
config.resolver.blockList = [
  ...((config.resolver.blockList) || []),
];

module.exports = config;
