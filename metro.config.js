// FILE: metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configurar extraNodeModules para resolver módulos problemáticos
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@expo/metro-config/build/async-require': path.resolve(__dirname, 'shims/async-require.js'),
  '@supabase/node-fetch': path.resolve(__dirname, 'shims/async-require.js'),
  'tslib': path.resolve(__dirname, 'node_modules/tslib/tslib.js'),
};

// Bloquear imports dinámicos problemáticos
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  // Bloquear el async-require original que causa problemas
  /node_modules\/@expo\/metro-config\/build\/async-require\.js$/,
];

// Resolver manualmente los imports problemáticos
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Interceptar imports de async-require y node-fetch
  if (moduleName.includes('@expo/metro-config/build/async-require') || 
      moduleName.includes('@supabase/node-fetch') ||
      moduleName === '@expo/metro-config/build/async-require' ||
      moduleName === '@supabase/node-fetch') {
    return {
      filePath: path.resolve(__dirname, 'shims/async-require.js'),
      type: 'sourceFile',
    };
  }
  
  // Usar el resolver original para todo lo demás
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
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

module.exports = config;
