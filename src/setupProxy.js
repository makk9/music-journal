/* This setup is typically used only in development, as production environments usually have different mechanisms to handle such scenarios, 
like configuring CORS policies on the server or using the same domain and reverse proxies.*/

const { createProxyMiddleware } = require('http-proxy-middleware');

// sets any API requests from client application with specified path to proxy middleware such that requests will be forwarded to target server: 5000
module.exports = function (app) {
    app.use(['/auth/**', '/image-color'], createProxyMiddleware({
        target: 'http://localhost:5000',
    }));
};

