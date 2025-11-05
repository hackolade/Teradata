const os = require('os');
const util = require('util');
const path = require('path');
const exec = util.promisify(require('child_process').exec);
const { spawn } = require('child_process');
const { buildQuery, queryType } = require('./queryHelper');
const localization = require('../../localization/en.json');

const SYSTEM_DATABASES = [
	'val',
	'tdwm',
	'DBC',
	'TDStats',
	'TD_ANALYTICS_DB',
	'TD_SERVER_DB',
	'TDQCD',
	'TDMaps',
	'TDBCMgmt',
	'SystemFe',
	'Sys_Calendar',
	'SYSSPATIAL',
	'SYSLIB',
	'SYSBAR',
	'SysAdmin',
	'LockLogShredder',
	'dbcmngr',
	'SQLJ',
	'All',
	'Crashdumps',
	'Default',
	'External_AP',
	'EXTUSER',
	'PUBLIC',
	'SYSJDBC',
	'SYSUDTLIB',
	'SYSUIF',
	'TD_SYSFNLIB',
	'TD_SYSGPL',
	'TD_SYSXML',
	'TDPUSER',
];
const SYSTEM_UDT = [
	'ArrayVec',
	'InternalPeriodDateType',
	'InternalPeriodTimeStampType',
	'InternalPeriodTimeStampWTZType',
	'InternalPeriodTimeType',
	'InternalPeriodTimeWTZType',
	'MBB',
	'MBR',
	'ST_Geometry',
	'TD_AVRO',
	'TD_CSVLATIN',
	'TD_CSVUNICODE',
	'TD_JSONLATIN_LOB',
	'TD_JSONUNICODE_LOB',
	'TD_JSON_BSON',
	'TD_JSON_UBJSON',
	'XML',
];
const MISSING_JAVA_PATH_MESSAGE =
	'Path to JAVA binary file is incorrect. Please specify JAVA_HOME variable in your system or put specific path to JAVA binary file in connection settings.';

let connection;
let useSshTunnel;
let abortController;
let activeQueries = new Set();

const isWindows = () => os.platform() === 'win32';

const getSslOptions = connectionInfo => {
	const sslType = connectionInfo.sslType;
	if (!sslType || ['DISABLE', 'ALLOW'].includes(sslType)) {
		return {};
	}

	return {
		sslmode: sslType,
		sslca: connectionInfo.certAuthority,
	};
};

const getConnectionSettings = async (connectionInfo, sshService) => {
	if (connectionInfo.useSshTunnel) {
		const { options } = await sshService.openTunnel(connectionInfo);
		connectionInfo = {
			...connectionInfo,
			host: options.host,
			port: options.port.toString() || '1025',
		};
	}

	return {
		...connectionInfo,
		...getSslOptions(connectionInfo),
	};
};

const createArgument = (argKey, argValue) => ` --${argKey}="${argValue}"`;

const buildCommand = (teradataClientPath, connectionInfo) => {
	let commandArgs = ['-jar', teradataClientPath];

	connectionInfo.host && commandArgs.push(createArgument('host', connectionInfo.host));
	connectionInfo.port && commandArgs.push(createArgument('port', connectionInfo.port));
	connectionInfo.userName && commandArgs.push(createArgument('user', connectionInfo.userName));
	connectionInfo.userPassword && commandArgs.push(createArgument('pass', connectionInfo.userPassword));
	connectionInfo.sslmode && commandArgs.push(createArgument('sslmode', connectionInfo.sslmode));
	connectionInfo.sslca && commandArgs.push(createArgument('sslca', connectionInfo.sslca));

	return commandArgs;
};

const getDefaultJavaPath = async () => {
	if (isWindows()) {
		const winJavaHome = '%JAVA_HOME%';
		const { stdout } = await exec(`echo ${winJavaHome}`, { shell: 'cmd.exe' });
		const expandedPath = stdout.trim();

		if (!expandedPath || expandedPath === winJavaHome) {
			return winJavaHome;
		}

		if (expandedPath.endsWith('java.exe')) {
			return expandedPath;
		}

		return expandedPath.replaceAll('/', '\\');
	}

	const unixJavaHome = '$JAVA_HOME';
	const { stdout } = await exec(`echo ${unixJavaHome}`);
	const expandedPath = stdout.trim();

	if (!expandedPath) {
		return unixJavaHome;
	}

	if (expandedPath.endsWith('java')) {
		return expandedPath;
	}

	return expandedPath + '/bin/java';
};

const checkJavaPath = async (javaPath, logger) => {
	try {
		const testCommand = `"${javaPath}" -version`;

		// printing version to `stderr` is an intentional design decision by the maintainers of the JVM
		const { stderr: version } = await exec(testCommand);
		logger.info(`Path to Java binary file successfully checked.\n\nPath: ${javaPath}\n\nVersion: ${version}`);
	} catch (error) {
		logger.error(error);
		throw new Error(MISSING_JAVA_PATH_MESSAGE);
	}
};

const formatError = errorLike => {
	const unknownError = 'Unknown error';

	const error = {
		message: unknownError,
		type: null,
		stack: null,
		customMsgCode: null,
	};

	if (!errorLike) {
		return error;
	}

	if (typeof errorLike === 'string') {
		error.message = errorLike;
	}

	if (typeof errorLike === 'object') {
		let { stack, message } = errorLike;

		if (message.includes('[Error 8017] [SQLState 28000]')) {
			message = localization.MODAL_WINDOW___CONNECT_INVALID_CREDENTIALS_ERROR;
			error.type = 'error';
			error.customMsgCode = 'MODAL_WINDOW___CONNECT_INVALID_CREDENTIALS_ERROR';
		}

		error.message = message;
		error.stack = stack;
	}

	return error;
};

const createConnection = async (connectionInfo, sshService, logger) => {
	const connectionSettings = await getConnectionSettings(connectionInfo, sshService);

	const javaPath = connectionSettings.javaHomePath ? connectionSettings.javaHomePath : await getDefaultJavaPath();

	await checkJavaPath(javaPath, logger);

	const teradataClientPath = path.resolve(__dirname, '..', 'addons', 'TeradataClient.jar');
	const teradataClientCommandArguments = buildCommand(teradataClientPath, connectionSettings);

	return {
		execute: (query, signal) => {
			return new Promise((resolve, reject) => {
				if (signal?.aborted) {
					return reject(new Error('Query execution was aborted'));
				}

				const queryArgument = createArgument('query', query);
				const javaArgs = [...teradataClientCommandArguments, queryArgument];

				const queryResult = spawn(`"${javaPath}"`, javaArgs, {
					shell: true,
				});

				activeQueries.add(queryResult);

				const abortHandler = () => {
					if (queryResult && !queryResult.killed) {
						queryResult.kill('SIGTERM');
						activeQueries.delete(queryResult);
					}
					reject(new Error('Query execution was aborted'));
				};

				if (signal) {
					signal.addEventListener('abort', abortHandler);
				}

				const cleanup = () => {
					activeQueries.delete(queryResult);
					if (signal) {
						signal.removeEventListener('abort', abortHandler);
					}
				};

				queryResult.on('error', error => {
					cleanup();
					reject(new Error(error));
				});

				const errorData = [];
				queryResult.stderr.on('data', data => {
					errorData.push(data);
				});

				const resultData = [];
				queryResult.stdout.on('data', data => {
					resultData.push(data);
				});

				queryResult.on('close', code => {
					cleanup();

					if (signal?.aborted) {
						return;
					}

					if (code !== 0) {
						reject(new Error(Buffer.concat(errorData).toString()));
						return;
					}

					const stdoutResult = Buffer.concat(resultData).toString();
					const rowJson = stdoutResult.match(/<hackolade>(.*?)<\/hackolade>/)?.[1];

					if (!rowJson) {
						resolve([]);
						return;
					}

					const parsedResult = JSON.parse(rowJson);

					if (parsedResult.error) {
						const parsedError = formatError(parsedResult.error);

						if (parsedError.stack) {
							logger.error(parsedError);
						}

						return reject(parsedError);
					}

					resolve(parsedResult.data);
				});
			});
		},
		getAbortController: () => abortController,
	};
};

const connect = async (connectionInfo, sshService, logger) => {
	if (connection) {
		return connection;
	}

	abortController = new AbortController();
	activeQueries.clear();

	useSshTunnel = connectionInfo.useSshTunnel;
	connection = await createConnection(connectionInfo, sshService, logger);

	return connection;
};

const getConcatenatedQueryResult = (queryResult = []) => {
	return queryResult
		.map(queryResultChunk => queryResultChunk?.['Request Text'] || queryResultChunk?.RequestText)
		.join('');
};

const createInstance = (connection, _) => {
	const signal = connection.getAbortController()?.signal;

	const getDatabasesWithTableNames = async tableType => {
		const query = buildQuery(queryType.GET_DATABASE_AND_TABLE_NAMES, {
			tableType,
			systemDatabases: SYSTEM_DATABASES,
		});
		const queryResult = await connection.execute(query, signal);

		return groupBy({
			items: queryResult,
			getGroupByValue: item => item.DataBaseName,
			getValue: item => item.TableName,
		});
	};

	const getCount = async (dbName, tableName) => {
		const count = await connection.execute(buildQuery(queryType.COUNT_COLUMNS, { dbName, tableName }), signal);

		return Number(count[0]?.Quantity || 0);
	};

	const getRecords = async (dbName, tableName, limit) => {
		return connection.execute(buildQuery(queryType.GET_RECORDS, { dbName, tableName, limit }), signal);
	};

	const getVersion = async () => {
		const result = await connection.execute('SELECT * FROM dbc.dbcinfo', signal);
		const versionInfo = result.find(info => info.InfoKey === 'VERSION');

		return versionInfo?.InfoData;
	};

	const describeDatabase = async dbName => {
		const databaseInfoResult = await connection.execute(
			buildQuery(queryType.DESCRIBE_DATABASE, { dbName }),
			signal,
		);

		if (!databaseInfoResult.length) {
			return {};
		}

		const databaseInfo = databaseInfoResult[0] || {};
		const journalStrategies = getJournalStrategies(databaseInfo);

		return {
			db_account: databaseInfo.AccountName.trim(),
			db_default_map: databaseInfo.DefaultMapName,
			db_permanent_storage_size: Number(databaseInfo.PermSpace) || 0,
			spool_files_size: Number(databaseInfo.SpoolSpace) || 0,
			temporary_tables_size: Number(databaseInfo.TempSpace) || 0,
			db_before_journaling_strategy: journalStrategies.beforeStrategy,
			db_after_journaling_strategy: journalStrategies.afterStrategy,
			has_fallback: hasFallback(databaseInfo),
			description: databaseInfo.CommentString,
		};
	};

	const showCreateEntity = async (dbName, tableName, entityType) => {
		const result = await connection.execute(
			buildQuery(queryType.SHOW_CREATE_ENTITY_STATEMENT, { dbName, tableName, entityType }),
			signal,
		);

		return getConcatenatedQueryResult(result);
	};

	const getColumns = async (dbName, tableName) => {
		const query = buildQuery(queryType.GET_COLUMNS, { dbName, tableName });
		const result = await connection.execute(query, signal);

		return result.map(raw => ({
			dbName: raw.DatabaseName,
			tableName: raw.TableName,
			columnName: raw.ColumnName,
			dataType: raw.DataType.trim(),
		}));
	};

	const getCreateIndexStatement = async index => {
		const query = `SHOW ${index.indexType} INDEX "${index.dbName}"."${index.indxName}";`;
		const createStatement = await connection.execute(query, signal);

		return {
			...index,
			createStatement: getConcatenatedQueryResult(createStatement),
		};
	};

	const getIndexes = async dbName => {
		const query = buildQuery(queryType.GET_INDEXES, { dbName });
		const queryResult = await connection.execute(query, signal);

		const indexes = _.uniqBy(queryResult, 'IndexName').map(index => ({
			dbName: index.DatabaseName,
			tableName: index.TableName,
			indxName: index.IndexName,
			indexType: getIndexType(index),
			indxKey: index.Columns,
		}));

		return indexes.reduce(async (indexesPromise, index) => {
			const indexesWithStatement = await indexesPromise;
			const indexWithStatement = await getCreateIndexStatement(index);

			return [...indexesWithStatement, indexWithStatement];
		}, Promise.resolve([]));
	};

	const getCreateUdtStatement = async type => {
		const name = type['Table/View/Macro Dictionary Name'];
		const query = `SHOW TYPE "${name}";`;
		const createStatement = await connection.execute(query, signal);

		return {
			name,
			createStatement: getConcatenatedQueryResult(createStatement),
		};
	};

	const getUserDefinedTypes = async () => {
		const query = 'HELP DATABASE SYSUDTLIB;';
		const queryResult = await connection.execute(query, signal);

		return queryResult
			.filter(filterUdt)
			.filter(excludeSystemUdt)
			.reduce(async (typePromise, index) => {
				const typeWithStatements = await typePromise;
				const typeStatement = await getCreateUdtStatement(index);

				return [...typeWithStatements, typeStatement];
			}, Promise.resolve([]));
	};

	return {
		getVersion,
		getDatabasesWithTableNames,
		describeDatabase,
		getIndexes,
		getColumns,
		getCount,
		getRecords,
		showCreateEntity,
		getUserDefinedTypes,
	};
};

const close = async sshService => {
	if (abortController) {
		abortController.abort();
		abortController = null;
	}

	for (const activeQuery of activeQueries) {
		if (activeQuery && !activeQuery.killed) {
			activeQuery.kill('SIGTERM');
		}
	}

	activeQueries.clear();

	if (connection) {
		connection = null;
	}

	if (useSshTunnel) {
		useSshTunnel = false;
		await sshService.closeConsumer();
	}
};

const groupBy = ({ items = [], getGroupByValue, getValue }) =>
	items.reduce((result, item) => {
		const comparisonValue = getGroupByValue(item);
		return {
			...result,
			[comparisonValue]: [...(result[comparisonValue] || []), getValue(item)],
		};
	}, {});

const hasFallback = row => row.ProtectionType?.trim() === 'F';

const getJournalStrategies = row => {
	return {
		beforeStrategy: getJournalStrategy(row.JournalFlag?.[0]),
		afterStrategy: getJournalStrategy(row.JournalFlag?.[1]),
	};
};

const getJournalStrategy = (journalFlag = '') => {
	switch (journalFlag) {
		case 'S':
			return 'SINGLE';
		case 'D':
			return 'DUAL';
		case 'L':
			return 'LOCAL';
		default:
			return 'NO';
	}
};

const getIndexType = index => {
	switch (index.IndexType) {
		case 'N':
			return 'HASH';
		case 'J':
			return 'JOIN';
		default:
			return '';
	}
};

const filterUdt = object => object.Kind === 'U';

const excludeSystemUdt = type => !SYSTEM_UDT.includes(type['Table/View/Macro Dictionary Name']);

module.exports = {
	connect,
	createInstance,
	close,
};
