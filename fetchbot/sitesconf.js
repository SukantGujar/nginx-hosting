const 
fs = require('fs'),
path = require('path'),
_ = require('lodash'),
handlebars = require('handlebars'),
logPrefix = 'sitesconf.buildSitesConf():',
{logger} = require('./logger'),
logCore = (logMethod) => (message, payload) => {
  logMethod(`${logPrefix} ${message}`);
  logMethod(_.isPlainObject(payload) ? JSON.stringify(payload, null, 2) : payload);
  return payload;
},
log = logCore(logger.log),
error = logCore(logger.error),
{sitesConf, sitesConfPath} = require('./config'),
sitesConfFile = path.join(sitesConfPath, sitesConf),
rawTemplate = fs.readFileSync(path.resolve(path.join(__dirname, '/sites.conf.template')), 'utf8');

handlebars.registerHelper('routeIndex', function (routes) {
  return routes["*"];
});

handlebars.registerHelper('defaultSite', function (sites) {
  let enabledSites = _.filter(sites, site => site.enabled),
  sortedByOrder = _.sortBy(enabledSites, ['order']);
  const [first] = sortedByOrder || [];
  return first && first.path || "=404";
});

handlebars.registerHelper('nonIndexRoutes', function (routes, options) {
  var allRoutes = Object.assign({}, routes);
  delete allRoutes["*"];
 
  var results = _.map(allRoutes, function(value, key){
    return options.fn(value, {data: {key}});
  }) || [];
  return results.join();
});

const template = handlebars.compile(rawTemplate);

function buildSitesConf(sites){
  logger.debug(`${logPrefix} Sites conf build started.`);

  let result = null;

  try {
    result = template(sites);

    logger.debug(`${logPrefix} Sites conf built.`);
    logger.debug(result);
  }
  catch(ex){
    logger.error(`${logPrefix} Error occurred while building sites.conf.`);
    logger.error(ex);
  }

  return result;
}

function generateAndPersistSitesConf(sites){
  const sitesConfData = buildSitesConf(sites);
  if (sitesConfData == null){
    logger.error(`${logPrefix} Skipping sites.conf update.`);

    return Promise.resolve(false);
  }

  return new Promise(
    (res, rej) => {
      fs.writeFile(sitesConfFile, sitesConfData, (err)=>{
        return (
          err && rej(error(`Could not update sites.conf at ${sitesConfFile}.`, err))
          || res(log(`Wrote new sites.conf at ${sitesConfFile}.`, true))
        );
      });
    }
  );
}

/*
// test logic.
require('./sitesserver.js').getSites().then(
  sites => {
    buildSitesConf(sites);
  }
);
*/

module.exports = generateAndPersistSitesConf;