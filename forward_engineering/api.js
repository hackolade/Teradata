'use strict';

module.exports = {
    generateScript(data, logger, callback, app) {
        try {
            callback(null, '');
        } catch (error) {
            logger.log('error', {message: error.message, stack: error.stack}, 'Teradata Forward-Engineering Error');

            callback({message: error.message, stack: error.stack});
        }
    },

    generateContainerScript(data, logger, callback, app) {
        try {
            data.jsonSchema = data.collections[0];
            this.generateScript(data, logger, callback, app);
        } catch (error) {
            logger.log('error', {message: error.message, stack: error.stack}, 'Teradata Forward-Engineering Error');

            callback({message: error.message, stack: error.stack});
        }
    },

    applyToInstance(connectionInfo, logger, callback, app) {
        callback();
    },

    testConnection(connectionInfo, logger, callback, app) {
        callback();
    }
};
