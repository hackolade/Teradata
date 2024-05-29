const cleanUpCommand = (command = '') => command.replaceAll(/\s+/g, ' ');

const getDatabaseAndTableNames = ({ tableType, systemDatabases }) => {
	const command = `SELECT DatabaseName, TableName
                FROM DBC.TablesV
            WHERE TableKind = '${tableType}'
              AND DatabaseName NOT IN (${systemDatabases.map(name => `'${name}'`).join(', ')})
            ORDER BY DatabaseName, TableName;`;

	return cleanUpCommand(command);
};

const getColumns = ({ dbName, tableName }) => {
	const command = `SELECT col.DatabaseName,
                   col.TableName,
                   col.ColumnName,
                   col.ColumnType as DataType
            FROM DBC.ColumnsV col
            WHERE col.DataBaseName = '${dbName}'
              AND col.TableName = '${tableName}'
            ORDER BY col.DatabaseName,
                     col.TableName,
                     col.ColumnId;`;

	return cleanUpCommand(command);
};

const describeDatabase = ({ dbName }) => {
	const command = `SELECT DatabaseName,
                   AccountName,
                   DefaultMapName,
                   ProtectionType,
                   JournalFlag,
                   PermSpace,
                   SpoolSpace,
                   TempSpace,
                   CommentString
            FROM DBC.DatabasesV
            WHERE DatabaseName = '${dbName}';`;

	return cleanUpCommand(command);
};

const countColumns = ({ dbName, tableName }) => {
	const command = `SELECT COUNT(*) FROM <$>${dbName}<$>.<$>${tableName}<$>`;
	return cleanUpCommand(command);
};

const getRecords = ({ dbName, tableName, limit }) => {
	const command = `SELECT TOP ${limit} * FROM <$>${dbName}<$>.<$>${tableName}<$>;`;
	return cleanUpCommand(command);
};

const showCreateEntityStatement = ({ entityType = 'TABLE', dbName, tableName }) => {
	const command = `SHOW ${entityType} <$>${dbName}<$>.<$>${tableName}<$>;`;
	return cleanUpCommand(command);
};

const getIndexesStatement = ({ dbName }) => {
	const command = `SELECT IND.TableName,
                   IND.DatabaseName,
                   IND.IndexName,
                   IND.IndexType
            FROM DBC.IndicesV IND
            WHERE IND.DatabaseName = '${dbName}'
              AND IND.IndexType IN ('J', 'N')
            GROUP BY IND.DatabaseName,
                     IND.TableName,
                     IND.IndexName,
                     IND.IndexType
            ORDER BY IND.DatabaseName,
                     IND.TableName,
                     IND.IndexName;`;

	return cleanUpCommand(command);
};

const buildQuery = (queryName, args) => {
	switch (queryName) {
		case queryType.GET_COLUMNS:
			return getColumns(args);
		case queryType.DESCRIBE_DATABASE:
			return describeDatabase(args);
		case queryType.COUNT_COLUMNS:
			return countColumns(args);
		case queryType.GET_RECORDS:
			return getRecords(args);
		case queryType.SHOW_CREATE_ENTITY_STATEMENT:
			return showCreateEntityStatement(args);
		case queryType.GET_INDEXES:
			return getIndexesStatement(args);
		case queryType.GET_DATABASE_AND_TABLE_NAMES:
			return getDatabaseAndTableNames(args);
	}
};

const queryType = {
	GET_COLUMNS: 'GET_COLUMNS',
	DESCRIBE_DATABASE: 'DESCRIBE_DATABASE',
	COUNT_COLUMNS: 'COUNT_COLUMNS',
	GET_RECORDS: 'GET_RECORDS',
	SHOW_CREATE_ENTITY_STATEMENT: 'SHOW_CREATE_ENTITY_STATEMENT',
	GET_INDEXES: 'GET_INDEXES',
	GET_DATABASE_AND_TABLE_NAMES: 'GET_DATABASE_AND_TABLE_NAMES',
};

module.exports = {
	buildQuery,
	queryType,
};
