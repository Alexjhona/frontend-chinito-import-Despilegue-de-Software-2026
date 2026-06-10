module.exports = {
  '/api': {
    target: 'https://mean-election-candle-joint.trycloudflare.com',
    secure: true,
    changeOrigin: true,
    logLevel: 'debug',
    headers: {
      Origin: '',
    },
  },
  '/auth': {
    target: 'https://album-tested-cgi-dragon.trycloudflare.com',
    secure: true,
    changeOrigin: true,
    logLevel: 'debug',
    headers: {
      Origin: '',
    },
  },
};
