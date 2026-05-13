const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    devtool: process.env.NODE_ENV === 'development' ? 'cheap-module-source-map' : false,
    entry: { main: './src/index.tsx' },
    target: 'web',
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
      publicPath: isDev ? '/' : './',
      clean: true,
    },
    devServer: {
      port: 3000,
      hot: true,
      static: {
        directory: path.resolve(__dirname, 'dist'),
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
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
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { electron: '28' } }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                ['@babel/preset-typescript'],
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
};
