const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: './src/app.js',
    module: {
        rules: [
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/i,
                type: 'asset/resource',
            },
            { 
                test: /\.(js)$/, 
                use: 'babel-loader' 
            },
            {
                test: /\.(css|less)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'less-loader',
                ],
            },
        ]
    },
    output: {
        filename: './js/app.js',
        assetModuleFilename: 'assets/[hash][ext][query]',
        library: 'testgame',
        clean: true,
    },
    plugins:[ 
        new MiniCssExtractPlugin({
            filename: './css/style.css'
        }),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/assets/img',
                    to: 'assets/static',
                }
            ]
        })
    ],
    optimization: {
        minimizer: [
          new CssMinimizerPlugin(),
        ],
    },
    mode: 'production',
    devServer: {
        static: {
            directory: path.join(__dirname, './dist')
        },
        compress: true,
        historyApiFallback: true,
        open: true,
        hot: true,
        port: 9002,
        devMiddleware: {
            writeToDisk: (filePath) => {
                return !/hot-update/i.test(filePath); // you can change it to whatever you need
            },
        },
    },
};