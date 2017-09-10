const 
_ = require('lodash'),
Promise = require('bluebird'),
fs = require('fs'),
path = require('path'),
sanitize = require('sanitize-filename'),
{STATUS_OK, STATUS_BUSY} = require("./constants"),
{localSitesPath, sitesPath, tempPath} = require('./config'),
{CONTENT_STATUSES} = require('./enums'),
logPrefix = 'fetchbot.update():',
{getSites, downloadSiteContentToPath} = require('./sitesserver'),
{getLocalSites, saveLocalSites} = require('./localsites'),
extractContents = require('./zip.js');

let status = STATUS_OK,
sites = {},
newSite = ()=>({"version" : 1, "content" : CONTENT_STATUSES.NOT_DOWNLOADED}),
copyProps = (source, dest, props) => {
  _.forEach(props, (prop)=>{
    dest[prop] = source[prop];
  });

  return dest;
},
setLocalSiteVersionAndContentStatusBasedOnSourceSiteVersion = (sourceSite, localSite) => {
  const {version:localSiteVersion} = localSite,
  {version:sourceSiteVersion} = sourceSite;

  if (_.toNumber(sourceSiteVersion) != _.toNumber(localSiteVersion)){
    localSite["version"] = sourceSite["version"];
    // local site needs to download new content now.
    localSite["content"] = CONTENT_STATUSES.NOT_DOWNLOADED;
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
    const {zipPath} = site;
    if (!fs.existsSync(zipPath)){
      delete site["zipPath"];
      site["content"] = CONTENT_STATUSES.NOT_DOWNLOADED;
    }
  });

  return enabledSites;
},
downloadSiteContent = (site) => {
  let
  {id} = site, 
  zipPath = path.join(tempPath, `${sanitize(id)}.zip`);
  site["zipPath"] = zipPath;
  return (
    downloadSiteContentToPath(id, zipPath)
    .then(()=>{
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
    const {path: sitePath, zipPath} = site,
    extractPath = path.join(sitesPath, sitePath);
    return extractContents(zipPath, extractPath)
    .then(()=>{
      site["content"] = CONTENT_STATUSES.EXTRACTED;
      return site;
    });
  });

  return (
    Promise.all(promises)
  );
},
updateSites = (changeSet) => {
  return (
    saveLocalSites(changeSet)
    .then(()=> sites = changeSet)
  )
},
update = ()=>{
  return new Promise(
    (res, rej) => {
      let 
      sourceSites = {},
      localSites = {},
      changeSet = {},
      enabledSites = {};
      return (
        // 1. get the source sites.
        getSites()
        .then(sites => sourceSites = sites)
        // 2. get the local sites.
        .then(getLocalSites)
        .then(sites => localSites = sites)
        // 3. Build changeset by comparing source and local site versions.
        .then(()=>changeSet = compareSourceWithLocalSitesAndBuildChangeset(sourceSites, localSites))
        // 4. Persist the changeSet
        .then(() => updateSites(changeSet))
        // 5. Find enabled sites to prep for processing their contents.
        .then(()=>enabledSites = _.filter(changeSet, site => site.enabled))
        // 5. Verify already existing zips and find which ones are missing and should be downloaded again.
        .then(()=>verifyAndUpdateDownloadedContentAvailabilityForEnabledSites(enabledSites))
        // 6. Download content of the enabled sites which are not yet downloaded. 
        .then(()=>downloadEnabledSitesContent(enabledSites))
        // 7. Persist the changeSet
        .then(() => updateSites(changeSet))
        // 8. Extract contents into site paths
        .then(() => extractSitesContent(enabledSites))
        // 9. Persist the changeSet
        .then(() => updateSites(changeSet))
      );
    }
  );
},
getStatus = () => status,
enqueueUpdate = () => {
  if (status != STATUS_OK){
    return status;
  }

  status = STATUS_BUSY;
  update().then(()=>status = STATUS_OK);

  return status;
};

// schedule an update on start.
enqueueUpdate();

module.exports = {
  getStatus,
  getSites : () => sites,
  enqueueUpdate
};