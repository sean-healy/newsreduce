const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
      'fetcher-worker': './index.js',
  },
  output: {
    path: path.resolve(__dirname),
    filename: 'net-agent.js',
  },
};
