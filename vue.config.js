const serverIndex = require('./src/server/');

module.exports = {
    'transpileDependencies': [
        'vuetify'
    ],
    devServer: {
        before: serverIndex
    }
};
