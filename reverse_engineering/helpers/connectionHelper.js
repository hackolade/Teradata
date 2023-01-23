const teradataDriver = require('teradata-nodejs-driver');
const {buildQuery, queryType} = require("./queryHelper");

const systemDatabases = ['val', 'tdwm', 'DBC', 'TDStats', 'TD_ANALYTICS_DB', 'TD_SERVER_DB', 'TDQCD', 'TDMaps', 'TDBCMgmt', 'SystemFe', 'Sys_Calendar', 'SYSSPATIAL', 'SYSLIB', 'SYSBAR', 'SysAdmin', 'LockLogShredder', 'dbcmngr', 'SQLJ', 'All', 'Crashdumps', 'Default', 'External_AP', 'EXTUSER', 'PUBLIC', 'SYSJDBC', 'SYSUDTLIB', 'SYSUIF', 'TD_SYSFNLIB', 'TD_SYSGPL', 'TD_SYSXML', 'TDPUSER'];

let connection;

const getSslOptions = (connectionInfo) => {
    const sslType = connectionInfo.sslType;
    if (!sslType || ['DISABLE', 'ALLOW'].includes(sslType)) {
        return {};
    }

    return {
        sslmode: sslType,
        sslca: connectionInfo.certAuthority,
    };
};

const createConnection = async (connectionInfo, sshService) => {
    if (connectionInfo.useSshTunnel) {
        const { options } = await sshService.openTunnel(connectionInfo);
        connectionInfo = {
            ...connectionInfo,
            host: options.host,
            port: options.port.toString(),
        };
    }

    const teradataConnection = new teradataDriver.TeradataConnection();
    const config = {
        host: connectionInfo.host,
        password: connectionInfo.userPassword,
        user: connectionInfo.userName,
        dbs_port: connectionInfo.port,
        ...getSslOptions(connectionInfo),
    }

    teradataConnection.connect(config);
    return teradataConnection.cursor();
};

const promisify = (f, context) => (...args) => {
    return new Promise((resolve, reject) => {
        return f.call(context, ...args, (error, results) => {
            if (error) {
                return reject(error);
            } else {
                return resolve(results);
            }
        });
    });
};

const connect = async (connectionInfo, sshService) => {
    if (connection) {
        return connection;
    }

    connection = await createConnection(connectionInfo, sshService);

    return connection;
};

const createInstance = (connection, logger) => {

    const getDatabases = () => {
        connection.execute('SELECT DatabaseName FROM DBC.Databases');
        const databases = connection.fetchall();

        return databases.map(item => item?.[0]?.trim()).filter(dbName => !systemDatabases.includes(dbName));
    };

    const getDatabasesWithTableNames = (type) => {
        connection.execute(`SELECT DatabaseName, TableName
                            FROM DBC.TablesV
                            WHERE TableKind = '${type}'
                              AND DatabaseName NOT IN (${systemDatabases.map(name => `'${name}'`).join(', ')})
                            ORDER BY DatabaseName, TableName;`);

        const databasesWithTables = groupBy(connection.fetchall(), item => item[0]);

        return Object.keys(databasesWithTables).reduce((result, databaseName) => ({
            ...result,
            [databaseName]: databasesWithTables[databaseName].map(tableRow => tableRow[1]),
        }), {});
    };

    const getTables = async (dbName) => {
        connection.execute(`SELECT *
                            FROM dbc.TablesV
                            WHERE TableKind = 'T'
                              AND DataBaseName = '${dbName}';`);
        const result = connection.fetchall();

        return result.map(tableRow => ({
            dbName: tableRow[0],
            name: tableRow[1],
            protectionType: tableRow[4],
            journalFlag: tableRow[5],
            creatorName: tableRow[6],
            createStatement: tableRow[7],
            description: tableRow[8],
        }));
    };

    const getCount = async (dbName, tableName) => {
        connection.execute(buildQuery(queryType.COUNT_COLUMNS, { dbName, tableName }));
        const count = connection.fetchall();

        return Number(count[0]?.[0] || 0);
    };

    const getRecords = async (dbName, tableName, columns, limit) => {
        connection.execute(buildQuery(queryType.GET_RECORDS, { dbName, tableName, limit }));
        const records = connection.fetchall();
        return records.map(record => mapValuesByColumns(record, columns));
    };

    const getVersion = () => {
        connection.execute('{fn teradata_nativesql}{fn teradata_database_version}');
        const result = connection.fetchall();
        return result[0]?.[0];
    };

    const getDatabaseComment = (dbName) => {
        connection.execute(`COMMENT ON DATABASE ${dbName};`);
        const result = connection.fetchall();
        return result?.[0]?.[0];
    };

    const describeDatabase = async (dbName) => {
        connection.execute(buildQuery(queryType.DESCRIBE_DATABASE, { dbName }));

        const databaseInfo = connection.fetchall();
        const databaseDescription = getDatabaseComment(dbName);
        const journalStrategies = getJournalStrategies(databaseInfo[0]);

        return {
            db_account: databaseInfo?.[0]?.[1].trim(),
            db_permanent_storage_size: databaseInfo.reduce((size, databaseRaw) => size + Number(databaseRaw[2]), 0),
            spool_files_size: databaseInfo.reduce((size, databaseRaw) => size + Number(databaseRaw[3]), 0),
            temporary_tables_size: databaseInfo.reduce((size, databaseRaw) => size + Number(databaseRaw[4]), 0),
            db_before_journaling_strategy: journalStrategies.beforeStrategy,
            db_after_journaling_strategy: journalStrategies.afterStrategy,
            has_fallback: hasFallback(databaseInfo[0]),
            description: databaseDescription,
        };
    };

    const getFunctions = async (dbName) => {
        const functions = await query(`show function status WHERE Db = '${dbName}'`);

        return Promise.all(functions.map(f => query(`show create function \`${dbName}\`.\`${f.Name}\`;`).then(functionCode => ({
            meta: f, data: functionCode,
        }))));
    };

    const getProcedures = async (dbName) => {
        const functions = await query(`show procedure status WHERE Db = '${dbName}'`);

        return Promise.all(functions.map(f => query(`show create procedure \`${dbName}\`.\`${f.Name}\`;`).then(functionCode => ({
            meta: f, data: functionCode,
        }))));
    };

    const showCreateEntity = async (dbName, tableName, entityType) => {
        connection.execute(buildQuery(queryType.SHOW_CREATE_ENTITY_STATEMENT, { dbName, tableName, entityType }));
        const result = connection.fetchall();

        return result[0]?.[0];
    };

    const getConstraints = async (dbName, tableName) => {
        try {
            const result = await query(`select *
                                        from information_schema.check_constraints
                                        where CONSTRAINT_SCHEMA = '${dbName}'
                                          AND TABLE_NAME = '${tableName}';`);

            return result;
        } catch (error) {
            logger.log('error', {
                message: '[Warning] ' + error.message, stack: error.stack,
            });
            return [];
        }
    };

    const getColumns = async (dbName, tableName) => {
        const query = buildQuery(queryType.GET_COLUMNS, { dbName, tableName });
        connection.execute(query);
        const result = connection.fetchall();

        return result.map(raw => ({
            dbName: raw[0],
            tableName: raw[1],
            columnName: raw[2],
            dataType: raw[3].trim(),
            columnLength: raw[4],
            decimalTotalDigits: raw[5],
            decimalFractionalDigits: raw[6],
            nullable: raw[7],
            defaultValue: raw[8],
            columnConstraint: raw[9],
            primaryIndex: raw[10],
            primaryKey: raw[11],
            foreignKey: raw[12],
            uniqueKey: raw[13],
        }));
    };

    const getIndexes = async (dbName) => {
        const query = buildQuery(queryType.GET_INDEXES, { dbName });
        connection.execute(query);
        const result = connection.fetchall();

        return result.map(raw => ({
            dbName: raw[0],
            tableName: raw[1],
            indxName: raw[2],
            indexType: raw[3],
            indxKey: raw[4],
            unique: raw[5],
        }));
    };

    const showCreateView = async (dbName, viewName) => {
        const result = await query(`show create view \`${dbName}\`.\`${viewName}\`;`);

        return result[0]?.['Create View'];
    };

    const query = (sql) => {
        return promisify(connection.execute, connection)(sql);
    };

    const serverVersion = async () => {
        const result = await query('{fn teradata_nativesql}{fn teradata_database_version}');

        return result[0]?.version || '';
    };

    return {
        getCount,
        getRecords,
        getVersion,
        describeDatabase,
        getFunctions,
        getProcedures,
        showCreateEntity,
        getConstraints,
        getColumns,
        getIndexes,
        showCreateView,
        query,
        serverVersion,
        getDatabases,
        getTables,
        getDatabasesWithTableNames,
    };
};

const close = () => {
    if (connection) {
        connection.close();
        connection = null;
    }
};

const groupBy = (items = [], getComparisonValue) => items.reduce(
    (result, item) => {
        const comparisonValue = getComparisonValue(item);
        return {
            ...result,
            [comparisonValue]: [
                ...(result[comparisonValue] || []),
                item,
            ],
        };
    },
    {},
);

const hasFallback = (row = []) => row[5]?.trim() === 'F';

const getJournalStrategies = (row = []) => {
    return {
        beforeStrategy: getJournalStrategy(row[6]?.[0]),
        afterStrategy: getJournalStrategy(row[6]?.[1]),
    }
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

const mapValuesByColumns = (values, columns) => {
    const columnNames = columns.map(column => column.columnName);
    return columnNames.reduce((resultObject, columnName, index) => {
        return {
            ...resultObject,
            [columnName]: values[index]
        };
    }, {});
}

module.exports = {
    connect,
    createInstance,
    close,
};
