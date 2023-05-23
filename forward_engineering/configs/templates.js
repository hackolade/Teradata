module.exports = {
	createDatabase:
		'CREATE DATABASE "${name}" AS ${databaseOptions};',
	createSession: 'SET SESSION DATABASE "${name}";',
	columnDefinition: '"${name}" ${type}${inlineLength}${not_null}${uppercase}${caseSpecific}${format}${default}${storageFormat}${characterSet}${withSchema}${autoColumn}${compress}${compressUsing}${decompressUsing}${inlineCheckConstraint}${inlineUniqueConstraint}${inlinePKConstraint}',
	createTable:
		'CREATE${tableSet}${temporary}${traceTable} TABLE ${name}${tableOptions} (\n' +
		'\t\t${column_definitions}${keyConstraints}${checkConstraints}${foreignKeyConstraints}\n' +
		'\t)${tableIndexes}${tablePreservation};\n',
	createAsSelectTable: 'CREATE${tableSet}${temporary} TABLE ${name}${tableOptions} (\n' +
		'\t\t${column_definitions}${keyConstraints}${checkConstraints}${foreignKeyConstraints}\n' +
		'\t)' +
		'\n\tAS (\n' +
		'\t${selectStatement} ' +
		'\n\t)${tableIndexes}${tablePreservation};\n',
	createErrorTable: 'CREATE ERROR TABLE ${tableName} FOR ${targetDataTable};\n',
	createForeignTable:
		'CREATE FOREIGN TABLE ${name}${tableOptions} (\n' +
		'\t\t${column_definitions}${keyConstraints}${checkConstraints}${foreignKeyConstraints}\n' +
		'\t)\n' +
		'\tUSING (\n' +
		'\t${usingOptions}\n' +
		'\t)${tableIndexes}${tablePreservation};\n',
	createHashIndex:
		'CREATE HASH INDEX ${indexName}${indexOptions} (\n' +
		'\t\t${indexKeys}' +
		'\n\t)' +
		'\n\tON ${tableName}${orderBy};\n',
	createJoinIndex:
		'CREATE JOIN INDEX ${indexName}${indexOptions}' +
		'\n\tAS ${selectStatement};\n',
	createKeyConstraint: 'CONSTRAINT ${constraintName}${constraintType}${columns}',
	checkConstraint: '${name}${expression}',
	createForeignKeyConstraint:
		'FOREIGN KEY (${foreignKey}) REFERENCES ${checkOption} ${primaryTable} (${primaryKey})',
	createView:
		'CREATE${recursive} VIEW ${name} (\n' +
		'\t${columnList}\n' +
		')\nAS ${selectStatement};\n',
	viewSelectStatement: 'SELECT ${keys}\n\tFROM ${tableName}',
	createStructuredType: 'CREATE TYPE ${typeName} AS (\n' +
		'\t${columnDefinitions}' +
		'\n)\n' +
		'NOT FINAL${methodSpecification};\n',
	createDistinctType: 'CREATE TYPE ${typeName} AS ${baseType} FINAL${methodSpecification};\n',
	createArrayType: 'CREATE TYPE ${typeName} AS ${baseType}${default};\n',

	dropDatabase: 'DROP DATABASE "${databaseName}";\n',
	modifyDatabase: 'MODIFY DATABASE "${databaseName}" AS ${databaseOptions};\n',
};
