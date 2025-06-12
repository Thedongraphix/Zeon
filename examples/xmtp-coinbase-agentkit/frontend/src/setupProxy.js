const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://zeon-hybrid-api.onrender.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // don't rewrite paths
      },
      headers: {
        'Connection': 'keep-alive'
      },
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error' });
      }
    })
  );
};