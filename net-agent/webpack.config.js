const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
      'main-net-agent':   './src/main.js',
      'worker-net-agent': './src/worker.js',
  },
  output: {
    path: path.resolve(__dirname, 'bin'),
    filename: 'nr-[name]',
  },
};
