module.exports = [
  {
    context: ['/api/fd'],
    target: 'http://localhost:8081',
    secure: false,
    changeOrigin: true
  },
  {
    context: ['/api/product'],
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true
  },
  {
    context: ['/auth', '/customer', '/admin', '/users', '/api/auth'],
    target: 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    bypass: function (req, res, proxyOptions) {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return '/index.html';
      }
    }
  }
];
