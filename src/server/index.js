module.exports = (app) =>
{
    console.log('Starting server!');
    app.get('/demo', (req, res) =>
    {
        res.send('Hello world!');
    });
};
