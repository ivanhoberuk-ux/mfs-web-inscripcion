// FILE: metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ⚠️ Fuerza a resolver SIEMPRE la tslib del proyecto (evita la anidada dentro de pdf-lib)
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  tslib: path.resolve(__dirname, 'node_modules/tslib/tslib.js'),
};

module.exports = config;
