'use strict';

const connectionHelper = require('./helpers/connectionHelper');
const teradataHelper = require('./helpers/teradataHelper');

const connect = async (connectionInfo, sshService) => {
    return await connectionHelper.connect(connectionInfo, sshService);
};

const disconnect = async (connectionInfo, logger, callback, app) => {
	if (connectionInfo.useSshTunnel) {
        const sshService = app.require('@hackolade/ssh-service');
		await sshService.closeConsumer();
	}
	connectionHelper.close();
	callback();
};

const testConnection = async (connectionInfo, logger, callback, app) => {
	const sshService = app.require('@hackolade/ssh-service');
	const log = createLogger({
		title: 'Test connection',
		hiddenKeys: connectionInfo.hiddenKeys,
		logger,
	});

	try {
		logger.clear();
		logger.log('info', connectionInfo, 'connectionInfo', connectionInfo.hiddenKeys);

		debugger
		const connection = await connect(connectionInfo, sshService);
		const instance = connectionHelper.createInstance(connection, logger);

		instance.getVersion();
		log.info('Connected successfully');

		callback(null);
	} catch (error) {
		log.error(error);
		callback({ message: error.message, stack: error.stack });
	}
};

const getDbCollectionsNames = async (connectionInfo, logger, callback, app) => {
	const log = createLogger({
		title: 'Retrieving databases and tables information',
		hiddenKeys: connectionInfo.hiddenKeys,
		logger,
	});

	try {
		logger.clear();
		logger.log('info', connectionInfo, 'connectionInfo', connectionInfo.hiddenKeys);

		const connection = await connect(connectionInfo);
		const instance = connectionHelper.createInstance(connection, logger);

		const tableNames = instance.getDatabasesWithTableNames('T');
		const viewNames  = getViewNames(instance.getDatabasesWithTableNames('V'));

		const allDatabaseNames = [
			...Object.keys(tableNames),
			...Object.keys(viewNames),
		];

        const collections = allDatabaseNames.map(dbName => {
			const dbCollections = [
				...(tableNames[dbName] || []),
				...(viewNames[dbName] || [])
			];

			return {
                dbName,
                dbCollections,
                isEmpty: dbCollections.length,
            };
		});
		log.info('Names retrieved successfully');

		callback(null, collections);
	} catch(error) {
		log.error(error);
		callback({ message: error.message, stack: error.stack });
	}
};

const getDbCollectionsData = async (data, logger, callback, app) => {
	const _ = app.require('lodash');
	const async = app.require('async');
	const log = createLogger({
		title: 'Reverse-engineering process',
		hiddenKeys: data.hiddenKeys,
		logger,
	});

	try {
		logger.log('info', data, 'data', data.hiddenKeys);

		const collections = data.collectionData.collections;
		const dataBaseNames = data.collectionData.dataBaseNames;
		const connection = await connect(data);
		const instance = connectionHelper.createInstance(connection, logger);

		log.info('Teradata version: ' + instance.getVersion());
		log.progress('Start reverse engineering ...');

		const result = await async.mapSeries(dataBaseNames, async (dbName) => {
			const tables = (collections[dbName] || []).filter(name => !isViewName(name));
			const views = (collections[dbName] || []).filter(isViewName).map(getViewName);

			log.info(`Parsing database "${dbName}"`);
			log.progress(`Parsing database "${dbName}"`, dbName);

			const containerData = await instance.describeDatabase(dbName);

			log.info(`Get indexes "${dbName}"`);
			log.progress(`Get indexes "${dbName}"`, dbName);

			const indexes = await instance.getIndexes(dbName);

			const result = await async.mapSeries(tables, async (tableName) => {
				log.info(`Get columns "${tableName}"`);
				log.progress(`Get columns`, dbName, tableName);

				const columns = await instance.getColumns(dbName, tableName);

				let records = [];

				if (containsJson(columns)) {
					log.info(`Sampling table "${tableName}"`);
					log.progress(`Sampling table`, dbName, tableName);

					const count = await instance.getCount(dbName, tableName);
					records = await instance.getRecords(dbName, tableName, columns, getLimit(count, data.recordSamplingSettings));
				}

				log.info(`Get create table statement "${tableName}"`);
				log.progress(`Get create table statement`, dbName, tableName);

				const ddl = await instance.showCreateEntity(dbName, tableName);

				log.info(`Parse indexes "${tableName}"`);
				log.progress(`Parse indexes`, dbName, tableName);

				const Indxs = teradataHelper.parseTableIndexes(tableName, indexes);

				return {
					dbName: dbName,
					collectionName: tableName,
					entityLevel: {
						Indxs,
					},
					documents: records,
					views: [],
					standardDoc: records[0],
					ddl: {
						script: ddl,
						type: 'teradata'
					},
					emptyBucket: false,
					bucketInfo: {
						...containerData,
					},
				};
			});

			const viewData = await async.mapSeries(views, async (viewName) => {
				log.info(`Getting data from view "${viewName}"`);
				log.progress(`Getting data from view`, dbName, viewName);

				const ddl = await instance.showCreateEntity(dbName, viewName, 'VIEW');

				return {
					name: viewName,
					ddl: {
						script: ddl,
						type: 'teradata'
					}
				};
			});

			if (viewData.length) {
				return [
					...result,
					{
						dbName: dbName,
						views: viewData,
						emptyBucket: false,
					}
				];
			}

			return result;
		});

		callback(null, result.flat());
	} catch(error) {
		log.error(error);
		callback({ message: error.message, stack: error.stack });
	}
};

const getViewNames = (viewNames) => {
	return Object.keys(viewNames).reduce((updatedViewNames, databaseName) => ({
		...updatedViewNames,
		[databaseName]: viewNames[databaseName].map(viewName => `${viewName} (v)`)
	}), {});
};

const isViewName = (name) => {
	return / \(v\)$/i.test(name);
};

const getViewName = (name) => name.replace(/ \(v\)$/i, '');

const containsJson = (columns) => {
	return columns.some(column => column.dataType === 'JN');
}

const getLimit = (count, recordSamplingSettings) => {
	const per = recordSamplingSettings.relative.value;
	const size = (recordSamplingSettings.active === 'absolute')
		? recordSamplingSettings.absolute.value
		: Math.round(count / 100 * per);
	return size;
};

const createLogger = ({ title, logger, hiddenKeys }) => {
	return {
		info(message) {
			logger.log('info', { message }, title, hiddenKeys);
		},

		progress(message, dbName = '', tableName = '') {
			logger.progress({ message, containerName: dbName, entityName: tableName });
		},

		error(error) {
			logger.log('error', {
				message: error.message,
				stack: error.stack,
			}, title);
		}
	};
};

module.exports = {
	connect,
	disconnect,
	testConnection,
	getDbCollectionsNames,
	getDbCollectionsData,
}