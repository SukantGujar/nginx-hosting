const 
_ = require('lodash'),
Promise = require('bluebird'),
fs = require('fs'),
path = require('path'),
sanitize = require('sanitize-filename'),
{logger} = require('./logger'),
{STATUS_OK, STATUS_BUSY} = require("./constants"),
{localSitesPath, sitesPath, tempPath} = require('./config'),
{CONTENT_STATUSES} = require('./enums'),
{getSites, downloadSiteContentToPath} = require('./sitesserver'),
{getLocalSites, saveLocalSites} = require('./localsites'),
extractContents = require('./zip.js'),
generateAndPersistSitesConf = require('./sitesconf'),
logPrefix = 'fetchbot.update():',
nginxReloader = require('./nginxreloader');

let status = STATUS_OK,
sites = {},
newSite = ()=>({"version" : 0, "content" : CONTENT_STATUSES.NOT_DOWNLOADED}),
copyProps = (source, dest, props) => {
  _.forEach(props, (prop)=>{
    dest[prop] = source[prop];
  });

  return dest;
},
setLocalSiteVersionAndContentStatusBasedOnSourceSiteVersion = (sourceSite, localSite) => {
  const {version:localSiteVersion} = localSite,
  {version:sourceSiteVersion, name: sourceSiteName, enabled} = sourceSite;

  if (_.toNumber(sourceSiteVersion) != _.toNumber(localSiteVersion)){
    localSite["version"] = sourceSite["version"];
    // local site needs to download new content now.
    localSite["content"] = CONTENT_STATUSES.NOT_DOWNLOADED;

    logger.debug(`${logPrefix} Site "${sourceSiteName}" marked for download due to version difference ${sourceSiteVersion}/${localSiteVersion}.`);
    if (!enabled){
      logger.debug(`${logPrefix} Site "${sourceSiteName}" is not enabled and will not be downloaded in this update.`);
    }
  }

  return localSite;
},
compareSourceWithLocalSitesAndBuildChangeset = (sourceSites, localSites) => {
  return (
    _.reduce(sourceSites, (changeSet, sourceSite, siteId) => {
        let localSite = localSites[siteId] || newSite();
        // Copy all props, except version.
        localSite = copyProps(sourceSite, localSite, ["id", "name", "path", "order", "enabled", "routes"]);
        localSite = setLocalSiteVersionAndContentStatusBasedOnSourceSiteVersion(sourceSite, localSite);

        changeSet[siteId] = localSite;
        return changeSet;
      }, 
      {}
    )
  );
},
verifyAndUpdateDownloadedContentAvailabilityForEnabledSites = (enabledSites) => {
  const enabledSitesWithDownloadedContent = _.filter(enabledSites, site => sites.content == CONTENT_STATUSES.DOWNLOADED);
  _.forEach(enabledSitesWithDownloadedContent, site => {
    const {zipPath, name} = site;
    if (!fs.existsSync(zipPath)){
      delete site["zipPath"];
      site["content"] = CONTENT_STATUSES.NOT_DOWNLOADED;

      logger.debug(`${logPrefix} Site "${name}" marked for download due to missing local zip at "${zipPath}".`);
    }
  });

  return enabledSites;
},
downloadSiteContent = (site) => {
  let
  {id, version, name} = site, 
  zipPath = path.join(tempPath, `${sanitize(id)}.${sanitize(version)}.zip`);
  site["zipPath"] = zipPath;

  logger.debug(`${logPrefix} Site "${name}" download started, target location is "${zipPath}".`);
  
  return (
    downloadSiteContentToPath(id, zipPath)
    .then(()=>{
      logger.debug(`${logPrefix} Site "${name}" downloaded to "${zipPath}".`);
  
      site["content"] = CONTENT_STATUSES.DOWNLOADED;
      return site;
    })
  );
},
downloadEnabledSitesContent = (enabledSites) => {
  const sitesPendingDownload = _.filter(enabledSites, site => site.content == CONTENT_STATUSES.NOT_DOWNLOADED),
  promises = _.map(sitesPendingDownload, downloadSiteContent);
  return (
    Promise.all(promises)
  );
},
extractSitesContent = (enabledSites) => {
  const sitesPendingExtraction = _.filter(enabledSites, site => site.content == CONTENT_STATUSES.DOWNLOADED),
  promises = _.map(sitesPendingExtraction, site => {
    const {path: sitePath, zipPath, name} = site,
    extractPath = path.join(sitesPath, sitePath);

    logger.debug(`${logPrefix} Site "${name}" extraction started at "${extractPath}".`);  

    return extractContents(zipPath, extractPath)
    .then(()=>{
      logger.debug(`${logPrefix} Site "${name}" extracted at "${extractPath}".`);  
    
      site["content"] = CONTENT_STATUSES.EXTRACTED;
      return site;
    })
    .catch((err)=>{
      logger.error(`${logPrefix} Site "${name}" extraction failed from "${zipPath}" to "${extractPath}".`);
    });
  });

  return (
    Promise.all(promises)
  );
},
updateSites = (changeSet) => {
  logger.debug(`${logPrefix} Writing sites to disk.`);
  
  return (
    saveLocalSites(changeSet)
    .then(()=> sites = changeSet)
  )
},
updateSitesConf = (changeSet) => {
  logger.debug(`${logPrefix} Building sites conf.`);
  return (
    generateAndPersistSitesConf(changeSet)
    .catch(err => {
      return false;
    })
  );
},
reloadNginx = (reload = false) => {
  if (!reload){
    logger.debug(`${logPrefix} Reloading Nginx.`);  
  
    return false;
  }

  logger.debug(`${logPrefix} Reloading Nginx.`);  

  return nginxReloader();
},
update = ()=>{
  let 
  sourceSites = {},
  localSites = {},
  changeSet = {},
  enabledSites = {},
  start = new Date();

  logger.debug(`${logPrefix} Update started at ${start.toUTCString()}.`);
  
  return (
    // 1. get the source sites.
    getSites()
    .then(sites => sourceSites = sites)
    // 2. get the local sites.
    .then(getLocalSites)
    .then(sites => localSites = sites)
    // 3. Build changeset by comparing source and local site versions.
    .then(() => changeSet = compareSourceWithLocalSitesAndBuildChangeset(sourceSites, localSites))
    // 3.1. If the changeset is the same as sites, skip update.
    .then(()=>{
      if (_.isEqual(sites, changeSet)){
        throw "NO_CHANGE";
      }
    })
    // 4. Persist the changeSet
    .then(() => updateSites(changeSet))
    // 5. Find enabled sites to prep for processing their contents.
    .then(() => enabledSites = _.filter(changeSet, site => site.enabled))
    // 5. Verify already existing zips and find which ones are missing and should be downloaded again.
    .then(() => verifyAndUpdateDownloadedContentAvailabilityForEnabledSites(enabledSites))
    // 6. Download content of the enabled sites which are not yet downloaded. 
    .then(() => downloadEnabledSitesContent(enabledSites))
    // 7. Persist the changeSet
    .then(() => updateSites(changeSet))
    // 8. Extract contents into site paths
    .then(() => extractSitesContent(enabledSites))
    // 9. Persist the changeSet
    .then(() => updateSites(changeSet))
    // 10. Build sites conf
    .then(() => updateSitesConf(changeSet))
    // 11. Reload nginx
    .then(reloadNginx)
    .catch(err => {
      if (err === "NO_CHANGE"){
        logger.debug(`${logPrefix} No changes detected, skipping update.`);

        return;
      }

      logger.error(`${logPrefix} Error occurred during update.`);
      logger.error(err);
    })
    .then(() => {
      const end = new Date();
      logger.debug(`${logPrefix} Update was started at ${start.toUTCString()}.`);      
      logger.debug(`${logPrefix} Update finished at ${end.toUTCString()}.`);
      logger.debug(`${logPrefix} Total time (ms): ${end - start}.`);      
    })
  );
},
getStatus = () => status,
enqueueUpdate = () => {
  if (status != STATUS_OK){
    return status;
  }
  logger.debug(`${logPrefix} Enqueuing update.`);
  status = STATUS_BUSY;
  update().then(()=>{
    status = STATUS_OK;
  })
  .catch(err => {
    logger.error(`${logPrefix} Error occurred during update.`);
    logger.error(err);

    status = STATUS_OK;    
  });

  return STATUS_OK;
};

// schedule an update on start.
enqueueUpdate();

module.exports = {
  getStatus,
  getSites : () => sites,
  enqueueUpdate
};