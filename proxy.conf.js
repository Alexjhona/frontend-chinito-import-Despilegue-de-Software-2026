module.exports = {
  '/api/proveedores': {
    target: 'http://localhost:8087',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  '/api': {
    target: 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  '/auth': {
    target: 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
