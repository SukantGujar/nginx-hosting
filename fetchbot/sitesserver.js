const 
{MongoClient} = require("mongodb"),
Promise = require('bluebird'),
{mongodb} = require("./config"),
{logger} = require("./logger"),

db = null;

const mockSites = {
  "1" : {
    "id" : "1",
    "name" : "app1",
    "path" : "app1",
    "version" : "10",
    "order" : "0",
    "enabled" : true,
    "routes" : {
      "login" : "login.html",
      "*" : "index.html"
    }
  },
  "2" : {
    "id" : "2",
    "name" : "app2",
    "path" : "app2",
    "version" : "1",
    "order" : "1",
    "enabled" : true,
    "routes" : {
      "*" : "index.html"
    }
  },
  "3" : {
    "id" : "3",
    "name" : "app3",
    "path" : "app3",
    "order" : "2",
    "enabled" : false,
    "routes" : {
      "*" : "index.html"
    }
  }
};

const getDb = function(){
  return (db && Promise.resolve(db))
  ||  MongoClient.connect(mongodb)
    .then(result => {
      logger.debug(`Connected to ${mongodb}.`);
      db = result;
      return db;
    })
    .catch (err => {
      logger.error(`Error connecting to ${mongodb}.`);
      logger.error(err);
      throw err;
    });
};

module.exports = {
  getSites : function(){
    // TODO: Add real logic.
    logger.warn(`sitesserver.getSites: mocked sites \n${JSON.stringify(mockSites, null, 2)}.`);
    return Promise.resolve(mockSites);
  },

  downloadSiteContentToPath : function(siteId, filePath){
    // TODO: Add real logic.
    logger.warn(`sitesserver.downloadSiteContentToPath: mocked sites download siteId: ${siteId}; filePath: ${filePath}.`);    
    return Promise.resolve(true);
  }
}