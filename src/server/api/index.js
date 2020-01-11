const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize the API
module.exports = (app) =>
{
    app.use(helmet());
    
    app.get('/api/v1/terms')
};
