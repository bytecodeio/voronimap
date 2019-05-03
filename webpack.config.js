let path = require('path');

const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin')

let webpackConfig = {
    entry: {
        voronoimap: './src/visualizations/voronoimap.ts'
    },
    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'dist'),
        library: '[name]',
        libraryTarget: 'umd'
    },
    resolve: {
        extensions: ['.ts', '.js', '.scss', '.css']
    },
    plugins: [
        new UglifyJSPlugin(),
        new CopyWebpackPlugin([
            { from: 'src/visualizations/us_geo.json' },
            { from: 'src/visualizations/airports.csv' },
            { from: 'src/visualizations/flights.csv' },
        ])
    ],
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
            { test: /\.css$/, loader: [ 'to-string-loader', 'css-loader' ] },
            { test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ]
            },
        ],
    },
    devServer: {
        host: 'jim.looker.com',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
        },
        disableHostCheck: true,
        allowedHosts: ['.looker.com'],
        contentBase: false,
        compress: true,
        port: 3443,
        https: true
    },
    devtool: 'eval',
    watch: true
};

module.exports = webpackConfig;
