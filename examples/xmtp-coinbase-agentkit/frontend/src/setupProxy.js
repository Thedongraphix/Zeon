const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );

  // Suppress source map warnings
  const originalWarning = console.warn;
  console.warn = function(message) {
    if (message && message.includes && message.includes('source map')) {
      return;
    }
    originalWarning.apply(console, arguments);
  };
}; 