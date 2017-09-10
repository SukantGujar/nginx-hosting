const AdmZip = require('adm-zip'),
path = require('path'),
fs = require('fs'),
rimraf = require('rimraf'),
{logger} = require('./logger'),
extractZip = (zipPath, extractPath) => {
  return new Promise((res, rej) => {
    const zip = new AdmZip(zipPath);
    zip.extractAllToAsync(extractPath, true, (err)=>{
      return (err && rej(err)) || res(true);
    });
  });
},
deleteOldSite = (oldPath) => {
  if (fs.existsSync(oldPath)){
    return new Promise(
      (res, rej) => {
        rimraf(oldPath, (err)=>{
          return (err & rej(err)) || res(true);
        })
      }
    );
  }

  return Promise.resolve(true);
},
renameSite = (oldPath, newPath) => {
  return new Promise((res, rej)=>{
    fs.rename(oldPath, newPath, err => {
      return (err && rej(err)) || res(true);
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