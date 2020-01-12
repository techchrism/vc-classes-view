const apiSetup = require('./src/server/api');


module.exports = {
    'transpileDependencies': [
        'vuetify'
    ],
    devServer: {
        before: apiSetup
    }
};
