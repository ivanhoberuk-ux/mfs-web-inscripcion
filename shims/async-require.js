// Shim para async-require y node-fetch que Supabase intenta importar dinámicamente
// Devuelve fetch nativo en web
module.exports = {
  default: globalThis.fetch || fetch
};
