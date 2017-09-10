let logger = console;
logger.debug = logger.log;

module.exports = {
  setLogger : newLogger => {
    logger = newLogger;
  },
  logger
};