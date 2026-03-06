const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: { main: './src/index.jsx' },
  target: 'electron-renderer',
  optimization: {
    runtimeChunk: false,
  },
  node: {
    global: true,
    __dirname: false,
    __filename: false,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.js',
    publicPath: './',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: { path: require.resolve('path-browserify') },
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'store': path.resolve(__dirname, 'store'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { electron: '28' } }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif|svg|ico|woff|woff2|eot|ttf)$/,
        use: [{ loader: 'file-loader', options: { name: '[name].[ext]', outputPath: 'assets/' } }],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
    }),
  ],
};
