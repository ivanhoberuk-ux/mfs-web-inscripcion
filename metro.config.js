// FILE: metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolver aliases para evitar problemas con módulos
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  tslib: path.resolve(__dirname, 'node_modules/tslib/tslib.js'),
};

// Resolver para manejar extensiones de archivos específicas de web
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'web.ts',
  'web.tsx',
  'web.js',
  'web.jsx'
];

module.exports = config;
