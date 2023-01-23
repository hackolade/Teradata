const getColumns = ({dbName, tableName}) => {
    return `SELECT col.DatabaseName,
                   col.TableName,
                   col.ColumnName,
                   col.ColumnType    as DataType,
                   col.ColumnLength,
                   col.DecimalTotalDigits,
                   col.DecimalFractionalDigits,
                   case col.Nullable
                       when 'Y' then 'Yes'
                       else 'No' end as Nullable,
                   col.DefaultValue,
                   col.ColumnConstraint,
                   CASE
                       WHEN pks.TableName IS NOT NULL
                           THEN 'Yes'
                       ELSE 'No' END AS PrimaryIndex,
                   CASE
                       WHEN pks.TableName IS NOT NULL
                           THEN 'Yes'
                       ELSE 'No' END AS PrimaryKey,
                   CASE
                       WHEN fks.ChildDB IS NOT NULL
                           THEN 'Yes'
                       ELSE 'No' END AS ForeignKey,
                   CASE
                       WHEN uqs.UniqueFlag IS NOT NULL
                           THEN 'Yes'
                       ELSE 'No' END AS UniqueKey
            FROM DBC.ColumnsV col

                     JOIN DBC.TablesV tab
                          ON col.DataBaseName = tab.DataBaseName
                              AND col.TableName = tab.TableName
                              AND tab.TableKind = 'T'

                     LEFT JOIN DBC.IndicesV pks
                               ON tab.DatabaseName = pks.DatabaseName
                                   AND tab.TableName = pks.TableName
                                   AND tab.PrimaryKeyIndexId = pks.IndexNumber
                                   AND col.ColumnName = pks.ColumnName

                     LEFT JOIN DBC.IndicesV uqs
                               ON col.DatabaseName = uqs.DatabaseName
                                   AND col.TableName = uqs.TableName
                                   AND col.ColumnName = uqs.ColumnName
                                   AND uqs.IndexType = 'U'

                     LEFT JOIN DBC.IndicesV pis
                               ON col.DatabaseName = pis.DatabaseName
                                   AND col.TableName = pis.TableName
                                   AND col.ColumnName = pis.ColumnName
                                   AND uqs.IndexNumber = 1

                     LEFT JOIN DBC.All_RI_ChildrenV fks
                               ON fks.ChildDB = col.DatabaseName
                                   AND fks.ChildTable = col.TableName
                                   AND fks.ChildKeyColumn = col.ColumnName
            WHERE col.DataBaseName = '${dbName}'
              AND col.TableName = '${tableName}'
            ORDER BY col.DatabaseName,
                     col.TableName,
                     col.ColumnId;`
};

const describeDatabase = ({dbName}) => {
    return `SELECT DISTINCT allSpace.Vproc,
                            allSpace.AccountName,
                            allSpace.MaxPerm,
                            allSpace.MaxSpool,
                            allSpace.MaxTemp,
                            tablesV.ProtectionType,
                            tablesV.JournalFlag
            FROM DBC.ALLSPACE allSpace
            RIGHT JOIN DBC.TablesV tablesV ON allSpace.DatabaseName = tablesV.DataBaseName
            WHERE allSpace.DatabaseName = '${dbName}' AND allSpace.TableName = 'All';`
};

const countColumns = ({dbName, tableName}) => `SELECT COUNT(*) FROM ${dbName}.${tableName}`;

const getRecords = ({ dbName, tableName, limit }) => {
    return `SELECT TOP ${limit} * FROM "${dbName}"."${tableName}";`
};

const showCreateEntityStatement = ({ entityType = 'TABLE', dbName, tableName }) => {
    return `SHOW ${entityType} ${dbName}.${tableName};`
};

const getIndexesStatement = ({ dbName }) => {
    return `SELECT IND.DatabaseName,
                   IND.TableName,
                   IND.IndexName,
                   CASE IND.IndexType
                       WHEN 'P' THEN 'nonpartitioned primary index'
                       WHEN 'Q' THEN 'partitioned primary index'
                       WHEN 'A' THEN 'amp primary index'
                       WHEN 'S' THEN 'secondary index'
                       WHEN 'J' THEN 'join index'
                       WHEN 'N' THEN 'hash index'
                       WHEN 'K' THEN 'primary key'
                       WHEN 'U' THEN 'unique constraint'
                       WHEN 'V' THEN 'value-ordered secondary index'
                       WHEN 'H' THEN 'hash-ordered all covering secondary index'
                       WHEN 'O' THEN 'valued-ordered all covering secondary index'
                       WHEN 'I' THEN 'ordering column of a composite secondary index'
                       WHEN 'G' THEN 'geospatial nonunique secondary index'
                       END AS IndexType,
                   TRIM(TRAILING ',' FROM
                        XMLAGG(IND.ColumnName || ',' ORDER BY IND.ColumnPosition) (varchar(250)))  Columns,
                   CASE
                       WHEN IND.UniqueFlag = 'Y' THEN 'Unique'
                       ELSE 'Not Unique'
                       END AS Uniqueness
            FROM DBC.IndicesV IND
                     JOIN DBC.TablesV TAB
                          ON IND.DatabaseName = TAB.DatabaseName
                              AND IND.TableName = TAB.TableName
            WHERE IND.DatabaseName = '${dbName}'
              AND TAB.TableKind in ('T', 'V')
            GROUP BY IND.DatabaseName,
                     IND.TableName,
                     IND.IndexName,
                     IND.IndexType,
                     IND.UniqueFlag,
                     TAB.TableKind
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
            return getIndexesStatement(args)
    }
}

const queryType = {
    GET_COLUMNS: 'GET_COLUMNS',
    DESCRIBE_DATABASE: 'DESCRIBE_DATABASE',
    COUNT_COLUMNS: 'COUNT_COLUMNS',
    GET_RECORDS: 'GET_RECORDS',
    SHOW_CREATE_ENTITY_STATEMENT: 'SHOW_CREATE_ENTITY_STATEMENT',
    GET_INDEXES: 'GET_INDEXES',
};

module.exports = {
    buildQuery,
    queryType,
};
