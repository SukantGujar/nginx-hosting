const AdmZip = require('adm-zip'),
_ = require('lodash'),
path = require('path'),
fs = require('fs'),
rimraf = require('rimraf'),
{logger} = require('./logger'),
logCore = (logMethod) => (message, payload) => {
  logMethod(`${logPrefix} ${message}`);
  if (typeof payload != 'undefined'){
    logMethod(_.isPlainObject(payload) ? JSON.stringify(payload, null, 2) : payload);
  }
  return payload;
},
log = logCore(logger.log),
error = logCore(logger.error),
logPrefix = "zip.js:",
extractZip = (zipPath, extractPath) => {
  return new Promise((res, rej) => {
    if (!fs.existsSync(zipPath)){
      return rej(error(`${logPrefix}extractZip: The file "${zipPath}" doesn't exist.`));
    }
    const zip = new AdmZip(zipPath);
    zip.extractAllToAsync(extractPath, true, (err)=>{
      return (err && rej(error(`${logPrefix}extractZip: Error occurred while extracting "${zipPath}" to "${extractPath}".`, err))) 
          || res(log(`${logPrefix}extractZip: Extracted ${zipPath} to ${extractPath}.`, true));
    });
  });
},
deleteOldSite = (oldPath) => {
  if (fs.existsSync(oldPath)){
    return new Promise(
      (res, rej) => {
        rimraf(oldPath, (err)=>{
          return (err & rej(error(`${logPrefix}deleteOldSite: Error occurred while trying to delete "${oldPath}".`, err))) 
          || res(log(`${logPrefix}deleteOldSite: deleted "${oldPath}".`, true));
        })
      }
    );
  }

  return Promise.resolve(true);
},
renameSite = (oldPath, newPath) => {
  return new Promise((res, rej)=>{
    fs.rename(oldPath, newPath, err => {
      return (err && rej(error(`${logPrefix}renameSite: Error occurred while trying to rename "${oldPath}" to "${newPath}".`, err))) 
      || res(log(`${logPrefix}renameSite: Renamed "${oldPath}" to "${newPath}".`, true));
    });
  });
};

module.exports = function extractContents(zipPath, extractPath){
  let tempExtractPath = `${extractPath}.next`;
  return (
    extractZip(zipPath, tempExtractPath)
    .then(() => deleteOldSite(extractPath))
    .then(() => renameSite(tempExtractPath, extractPath))
  );
}