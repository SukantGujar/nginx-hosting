const
Promise = require('bluebird'),
exec = require('child_process').exec,
//NginxReloader = require('nginx-reload'),
//{nginxPidPath} = require('./config'),
//nginxReloader = NginxReloader(nginxPidPath),
{logger} = require('./logger'),
logPrefix = `nginxreloader:`;

function handleResponse(res, rej, err){
  if (err){
    logger.error(`${logPrefix} Error occurred while reloading nginx.`);
    logger.error(err);

    return res(false);
  }

  logger.debug(`${logPrefix} Nginx reloaded.`);

  return res(true);
}

function reloadOne(){
  return new Promise(
    (res, rej) => {
      exec(`nginx -s reload`, (err) => {
        return handleResponse(res, rej, err);
      });
    }
  );
}

/*
function reloadTwo(){
  return new Promise(
    (res, rej) => {
      nginxReloader.reload(err => {
        return handleResponse(res, rej, err); 
      });
    }
  );
}
*/

module.exports = reloadOne;