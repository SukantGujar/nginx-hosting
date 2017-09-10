const express = require("express"),
healthcheck = require('express-healthcheck'),
{bind, port} = require("./config"),
{logger} = require("./logger"),
fetchbot = require('./fetchbot'),
logPrefix = '🤖fetchbot server:',
app = express();

app.get('/health', healthcheck());

app.get('/status', (req, res) => {
  let result = fetchbot.getStatus();
  res.sendStatus(result);
});

app.post('/status', (req, res) => {
  let result = fetchbot.enqueueUpdate();
  res.sendStatus(result);
});

app.get('/sites', (req, res) => {
  let result = fetchbot.getSites();
  res.type('application/json').send(result);
});

app.listen(port, bind, (err)=>{
  if (!err){
    logger.info(`${logPrefix} Started listening on ${bind}:${port}.`);
    return;
  }

  logger.error(`${logPrefix} Error occurred in listen.`);
  logger.error(err);
  logger.error(`${logPrefix} Exiting with status 1.`);
  
  process.exit(1);
});

module.exports = app;