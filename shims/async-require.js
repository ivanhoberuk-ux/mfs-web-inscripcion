// Shim para async-require que Supabase intenta importar dinámicamente
module.exports = function asyncRequire(moduleName) {
  // Para web, simplemente hacer require síncrono
  return Promise.resolve(require(moduleName));
};
