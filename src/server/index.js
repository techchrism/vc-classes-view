const apiSetup = require('./api');
const express = require('express');

const port = process.env.PORT || 8080;

const app = express();
apiSetup(app);

app.listen(port, () =>
{
    console.log(`App running on port ${port}!`);
});
