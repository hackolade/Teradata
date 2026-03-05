module.exports = {
	createDatabase: 'CREATE DATABASE "${name}" AS ${databaseOptions};',
	createSession: 'SET SESSION DATABASE "${name}";',
	dropDatabase: 'DROP DATABASE "${databaseName}";',
	modifyDatabase: 'MODIFY DATABASE "${databaseName}" AS ${databaseOptions};',
	commentDatabase: 'COMMENT ON DATABASE ${databaseName}\nIS ${comment};',

	columnDefinition:
		'${name}${type}${inlineLength}${not_null}${uppercase}${caseSpecific}${format}${default}${storageFormat}${characterSet}${withSchema}${autoColumn}${compress}${compressUsing}${decompressUsing}${inlineCheckConstraint}${inlineUniqueConstraint}${inlinePKConstraint}',
	createTable:
		'CREATE${tableSet}${temporary}${traceTable} TABLE ${name}${tableOptions} (\n' +
		'\t\t${column_definitions}${keyConstraints}${checkConstraints}${foreignKeyConstraints}\n' +
		'\t)${tableIndexes}${tablePreservation};',
	createAsSelectTable:
		'CREATE${tableSet}${temporary} TABLE ${name}${tableOptions} (\n' +
		'\t\t${column_definitions}${keyConstraints}${checkConstraints}${foreignKeyConstraints}\n' +
		'\t)' +
		'\n\tAS (\n' +
		'\t${selectStatement} ' +
		'\n\t)${tableIndexes}${tablePreservation};',
	createErrorTable: 'CREATE ERROR TABLE ${tableName} FOR ${targetDataTable};',
	createForeignTable:
		'CREATE FOREIGN TABLE ${name}${tableOptions} (\n' +
		'\t\t${column_definitions}${keyConstraints}${checkConstraints}${foreignKeyConstraints}\n' +
		'\t)\n' +
		'\tUSING (\n' +
		'\t${usingOptions}\n' +
		'\t)${tableIndexes}${tablePreservation};',
	createHashIndex:
		'CREATE HASH INDEX ${indexName}${indexOptions} (\n' +
		'\t\t${indexKeys}' +
		'\n\t)' +
		'\n\tON ${tableName}${orderBy};',
	createJoinIndex: 'CREATE JOIN INDEX ${indexName}${indexOptions}' + '\n\tAS ${selectStatement};',
	createKeyConstraint: '${constraintName}${constraintType} (${columns})',
	checkConstraint: '${name}${expression}',

	createForeignKeyConstraint:
		'${constraintName}FOREIGN KEY (${foreignKey}) REFERENCES ${checkOption} ${primaryTable} (${primaryKey})',
	dropForeignKeyUnnamed:
		'ALTER TABLE ${tableName} DROP FOREIGN KEY (${foreignKey}) REFERENCES ${primaryTable} (${primaryKey});',

	createView: 'CREATE${recursive} VIEW ${name} (\n' + '\t${columnList}\n' + ')\nAS ${selectStatement};',
	viewSelectStatement: 'SELECT ${keys}\n\tFROM ${tableName}',
	createStructuredType:
		'CREATE TYPE ${typeName} AS (\n' + '\t${columnDefinitions}' + '\n)\n' + 'NOT FINAL${methodSpecification};',
	createDistinctType: 'CREATE TYPE ${typeName} AS ${baseType} FINAL${methodSpecification};',
	createArrayType: 'CREATE TYPE ${typeName} AS ${baseType}${default};',

	dropTable: 'DROP ${temporary}TABLE ${name};',
	alterTable: 'ALTER TABLE ${tableName}${tableOptions}${alterStatement};',
	renameTable: 'RENAME TABLE ${oldName} TO ${newName};',
	commentTable: 'COMMENT ON TABLE ${tableName}\nIS ${comment};',

	addColumn: ' ADD ${columnDefinition}',
	alterColumn: 'ALTER TABLE ${tableName} ADD ${columnName} ${columnDefinition};',
	dropColumn: ' DROP ${name}',
	rename: ' RENAME ${oldName} TO ${newName}',
	commentColumn: 'COMMENT ON COLUMN ${columnName}\nIS ${comment};',

	dropCheckConstraint: ' DROP CONSTRAINT ${name} CHECK',
	addCheckConstraint: ' ADD ${constraintName}${expression}',
	alterCheckConstraint: ' ADD ${constraintName}${expression}',

	dropSecondaryIndex: 'DROP INDEX ${indexName} ON ${tableName};',
	dropIndex: 'DROP${indexType} INDEX ${indexName};',

	dropView: 'DROP VIEW ${viewName};',
	renameView: 'RENAME VIEW ${oldViewName} TO ${newViewName};',
	commentView: 'COMMENT ON VIEW ${viewName}\nIS ${comment};',

	dropConstraint: 'ALTER TABLE ${tableName} DROP CONSTRAINT ${constraintName};',

	alterPrimaryKey: 'ALTER TABLE ${tableName} ADD ${constraintName}PRIMARY KEY (${columns});',
	alterUniqueKey: 'ALTER TABLE ${tableName} ADD ${constraintName}UNIQUE (${columns});',

	dropNamedIndex: 'DROP INDEX ${indexName} ON ${tableName};',
	dropUnnamedIndex: 'DROP INDEX (${columns}) ON ${tableName};',
};
