const {localSitesPath} = require('./config'),
jsonfile = require('jsonfile'),
_ = require('lodash'),
logPrefix = "localsites:",
{logger} = require('./logger'),
logCore = (logMethod) => (message, payload) => {
  logMethod(`${logPrefix} ${message}`);
  logMethod(_.isPlainObject(payload) ? JSON.stringify(payload, null, 2) : payload);
  return payload;
},
log = logCore(logger.log),
error = logCore(logger.error),
getLocalSites = () => {
  return new Promise(
    (res, rej) => {
      jsonfile.readFile(localSitesPath, (err, data)=>{
        return (
          (err && err.code != 'ENOENT' && rej(error(`getLocalSites: Error reading sites from disk.`, err)))
              || res(log(`getLocalSites: Read sites from disk.`, data || {}))
        );
      })
    }
  );
},
saveLocalSites = (sites) => {
  return new Promise(
    (res, rej) => {
      jsonfile.writeFile(localSitesPath, sites, {spaces: 2}, (err)=>{
        return (
          (err && rej(error(`saveLocalSites: Error writing sites to disk.`, err)))
              || res(log(`saveLocalSites: Wrote sites to disk.`, sites))
        );
      })
    }
  );
};

module.exports = {
  getLocalSites,
  saveLocalSites
};

