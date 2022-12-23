const path = require('path');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: {
        index: './index.ts',
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name]-bundle.js'
    },
    resolve: {
        extensions: ['.ts'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader'
            },
        ]
    }
};