const argv = require("minimist")(process.argv.slice(2)),
env = process.env,
{logger} = require("./logger"),
enums = require("./enums"),
constants = require("./constants"),
mongodb = argv[enums.MONGO_DB] || env[enums.MONGO_DB],
nginxPidPath = argv[enums.NGINX_PID_PATH] || env[enums.NGINX_PID_PATH] || constants.DEFAULT_NGINX_PID_PATH,
localSitesPath = argv[enums.LOCAL_SITES_PATH] || env[enums.LOCAL_SITES_PATH] || constants.DEFAULT_LOCAL_SITES_PATH,
sitesPath = argv[enums.SITES_PATH] || env[enums.SITES_PATH] || constants.DEFAULT_SITES_PATH,
sitesConf = argv[enums.SITES_CONF] || env[enums.SITES_CONF] || constants.DEFAULT_SITES_CONF,
sitesConfPath = argv[enums.SITES_CONF_PATH] || env[enums.SITES_CONF_PATH] || constants.DEFAULT_SITES_CONF_PATH,
tempPath = argv[enums.TEMP_PATH] || env[enums.TEMP_PATH] || constants.DEFAULT_TEMP_PATH,
bind = argv[enums.FETCHBOT_BIND] || env[enums.FETCHBOT_BIND] || constants.DEFAULT_FETCHBOT_BIND,
port = argv[enums.FETCHBOT_PORT] || env[enums.FETCHBOT_PORT] || constants.DEFAULT_FETCHBOT_PORT;

if (!mongodb){
  throw new Error(`${enums.MONGO_DB} argument is not specified.`);
}

logger.info(`NODE_ENV is ${process.env.NODE_ENV}.`);

logger.info(`${enums.MONGO_DB} is "${mongodb}".`);
logger.info(`${enums.NGINX_PID_PATH} is "${nginxPidPath}".`);
logger.info(`${enums.LOCAL_SITES_PATH} is "${localSitesPath}".`);
logger.info(`${enums.SITES_PATH} is "${sitesPath}".`);
logger.info(`${enums.SITES_CONF} is "${sitesConf}".`);
logger.info(`${enums.SITES_CONF_PATH} is "${sitesConfPath}".`);
logger.info(`${enums.TEMP_PATH} is "${tempPath}".`);
logger.info(`${enums.FETCHBOT_BIND} is "${bind}".`);
logger.info(`${enums.FETCHBOT_PORT} is "${port}".`);

module.exports = {
  mongodb,
  nginxPidPath,
  localSitesPath,
  sitesPath,
  sitesConf,
  sitesConfPath,
  tempPath,
  bind,
  port
};