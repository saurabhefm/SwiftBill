const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'wasm' to the asset extensions to support expo-sqlite on web
config.resolver.assetExts.push('wasm');

// Add COEP and COOP headers to support SharedArrayBuffer for Web SQLite
config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      middleware(req, res, next);
    };
  },
};

module.exports = config;

