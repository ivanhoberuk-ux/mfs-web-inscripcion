// FILE: metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolver aliases para evitar problemas con módulos
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/metro-config/build/async-require' || 
      moduleName === '@supabase/node-fetch') {
    return {
      filePath: path.resolve(__dirname, 'shims/async-require.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'tslib') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/tslib/tslib.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
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
