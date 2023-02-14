const getDatabaseAndTableNames = ({ tableType, systemDatabases }) => {
    return `SELECT DatabaseName, TableName
                FROM DBC.TablesV
            WHERE TableKind = '${tableType}'
              AND DatabaseName NOT IN (${systemDatabases.map(name => `'${name}'`).join(', ')})
            ORDER BY DatabaseName, TableName;`
};

const getColumns = ({dbName, tableName}) => {
    return `SELECT col.DatabaseName,
                   col.TableName,
                   col.ColumnName,
                   col.ColumnType as DataType
            FROM DBC.ColumnsV col
            WHERE col.DataBaseName = '${dbName}'
              AND col.TableName = '${tableName}'
            ORDER BY col.DatabaseName,
                     col.TableName,
                     col.ColumnId;`
};

const describeDatabase = ({dbName}) => {
    return `SELECT DatabaseName,
                   AccountName,
                   DefaultMapName,
                   ProtectionType,
                   JournalFlag,
                   PermSpace,
                   SpoolSpace,
                   TempSpace,
                   CommentString
            FROM DBC.DatabasesV
            WHERE DatabaseName = '${dbName}';`
};

const countColumns = ({dbName, tableName}) => `SELECT COUNT(*) FROM <$>${dbName}<$>.<$>${tableName}<$>`;

const getRecords = ({ dbName, tableName, limit }) => {
    return `SELECT TOP ${limit} * FROM <$>${dbName}<$>.<$>${tableName}<$>;`
};

const showCreateEntityStatement = ({ entityType = 'TABLE', dbName, tableName }) => {
    return `SHOW ${entityType} <$>${dbName}<$>.<$>${tableName}<$>;`
};

const getIndexesStatement = ({ dbName }) => {
    return `SELECT IND.TableName,
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
                     IND.IndexName;`
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
            return getDatabaseAndTableNames(args)
    }
}

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
