const templates = require('./configs/templates');
const defaultTypes = require('./configs/defaultTypes');
const types = require('./configs/types');

module.exports = (baseProvider, options, app) => {
	const _ = app.require('lodash');
	const { assignTemplates } = app.require('@hackolade/ddl-fe-utils');
	const {
		tab,
		commentIfDeactivated,
		checkAllKeysDeactivated,
		divideIntoActivatedAndDeactivated,
		hasType,
		clean,
	} = app.require('@hackolade/ddl-fe-utils').general;
	const { generateConstraintsString, foreignKeysToString, foreignActiveKeysToString, createKeyConstraint } =
		require('./helpers/constraintHelper')({
			_,
			commentIfDeactivated,
			checkAllKeysDeactivated,
			divideIntoActivatedAndDeactivated,
			assignTemplates,
		});
	const keyHelper = require('./helpers/keyHelper')(_, clean);
	const { getTableName, getIndexName, getDatabaseOptions, getViewData, getDefaultJournalTableName, getJournalingStrategy, viewColumnsToString } = require('./helpers/general')(_, tab, commentIfDeactivated);
	const { getTableOptions, getUsingOptions, getInlineTableIndexes, getIndexOptions, getIndexKeys } = require('./helpers/tableHelper')({
		_,
		tab,
		getJournalingStrategy,
		commentIfDeactivated,
		checkAllKeysDeactivated,
		divideIntoActivatedAndDeactivated,
	});
	const { decorateType } = require('./helpers/columnDefinitionHelper')(_);

	return {
		hydrateDatabase(containerData, data) {
			return {
				databaseName: containerData.name,
				db_account: containerData.db_account,
				db_default_map: containerData.db_default_map,
				db_permanent_storage_size: containerData.db_permanent_storage_size,
				spool_files_size: containerData.spool_files_size,
				has_fallback: containerData.has_fallback,
				db_before_journaling_strategy: containerData.db_before_journaling_strategy,
				db_after_journaling_strategy: containerData.db_after_journaling_strategy,
				db_default_journal_table: containerData.db_default_journal_table,
				db_default_journal_db: containerData.db_default_journal_db,
			};
		},

		hydrateTable({ tableData, entityData, jsonSchema }) {
			const detailsTab = entityData[0];
			const tableIndexes = entityData[2].Indxs;
			return {
				...tableData,
				tableIndexes,
				keyConstraints: keyHelper.getTableKeyConstraints(jsonSchema),
				tableSet: detailsTab.tableOptions.SET_MULTISET,
				temporary: detailsTab.tableOptions.TEMPORARY_VOLATILE,
				tableMap: detailsTab.tableOptions.MAP,
				colocateUsing: detailsTab.tableOptions.COLOCATE_USING,
				fallback: detailsTab.tableOptions.FALLBACK,
				beforeJournaling: detailsTab.tableOptions.BEFORE_JOURNAL,
				afterJournaling: detailsTab.tableOptions.AFTER_JOURNAL,
				defaultJournalTable: detailsTab.tableOptions.DEFAULT_JOURNAL_TABLE,
				freespace: detailsTab.tableOptions.FREESPACE,
				checksum: detailsTab.tableOptions.TABLE_CHECKSUM,
				log: detailsTab.tableOptions.LOG,
				isolatedLoading: detailsTab.tableOptions.ISOLATED_LOADING,
				mergeBlockRatio: detailsTab.tableOptions.MERGE_BLOCK_RATIO,
				dataBlockSize: detailsTab.tableOptions.DATA_BLOCK_SIZE,
				blockCompression: detailsTab.tableOptions.BLOCK_COMPRESSION,
				tablePreservation: detailsTab.tablePreservation,
				partitioning: detailsTab.partitioning,
				selectStatement: detailsTab.selectStatement,
				queueTable: detailsTab.tableOptions.QUEUE_TABLE,
				traceTable: detailsTab.tableOptions.TRACE_TABLE,
				errorTable: detailsTab.tableOptions.ERROR_TABLE,
				targetDataTable: detailsTab.tableOptions.FOR_TABLE,
				foreignTable: detailsTab.tableOptions.FOREIGN_TABLE,
				externalSecurity: detailsTab.tableOptions.EXTERNAL_SECURITY,
				authorizationName: detailsTab.tableOptions.AUTHORIZATION_NAME,
				using: detailsTab.tableOptions.USING,
			};
		},

		hydrateView({ viewData, entityData }) {
			const detailsTab = entityData[0];

			return {
				name: viewData.name,
				tableName: viewData.tableName,
				keys: viewData.keys,
				recursive: detailsTab.recursive,
				selectStatement: detailsTab.selectStatement,
			};
		},

		hydrateIndex(indexData, tableData) {
			return indexData;
		},

		hydrateCheckConstraint(checkConstraint) {
			const buildExpression = (expr) => {
				const plainExpr = _.trim(expr).replace(/^\(([\s\S]*)\)$/, '$1');
				return `CHECK (${plainExpr})`;
			}

			return {
				name: checkConstraint.chkConstrName,
				expression: buildExpression(checkConstraint.constrExpression),
			};
		},

		hydrateViewColumn(data) {
			return {
				name: data.name,
				tableName: data.entityName,
				alias: data.alias,
				isActivated: data.isActivated,
			};
		},

		hydrateColumn({ columnDefinition, jsonSchema }) {
			return {
				name: columnDefinition.name,
				type: columnDefinition.type,
				childValueType: jsonSchema.childValueType,
				primaryKey: keyHelper.isInlinePrimaryKey(jsonSchema),
				unique: keyHelper.isInlineUnique(jsonSchema),
				isActivated: columnDefinition.isActivated,
				length: columnDefinition.length,
				inlineLength: jsonSchema.inlineLength,
				storageFormat: jsonSchema.storageFormat,
				withSchema: jsonSchema.withSchema,
				precision: columnDefinition.precision,
				scale: columnDefinition.scale,
				required: !columnDefinition.nullable,
				uppercase: jsonSchema.uppercase,
				caseSpecific: jsonSchema.caseSpecific,
				format: jsonSchema.format,
				default: columnDefinition.default,
				fractSecPrecision: jsonSchema.fractSecPrecision,
				toPrecision: jsonSchema.toPrecision,
				characterSet: jsonSchema.characterSet,
				autoColumn: jsonSchema.autoColumn,
				timezone: jsonSchema.timezone,
				compress: jsonSchema.compress,
				compressUsing: jsonSchema.compressUsing,
				decompressUsing: jsonSchema.decompressUsing,
				methodSpecification: jsonSchema.methodSpecification,
			};
		},

		createDatabase({
			databaseName,
			db_account,
			db_default_map,
			db_permanent_storage_size,
			spool_files_size,
			has_fallback,
			db_before_journaling_strategy,
			db_after_journaling_strategy,
			db_default_journal_table,
			db_default_journal_db
		}) {
			const databaseOptions = getDatabaseOptions({
				db_account,
				db_default_map,
				db_permanent_storage_size,
				spool_files_size,
				has_fallback,
				db_before_journaling_strategy,
				db_after_journaling_strategy,
				db_default_journal_table,
				db_default_journal_db
			});

			const databaseStatement = assignTemplates(templates.createDatabase, {
				name: databaseName,
				databaseOptions,
			});

			const createSessionStatement = assignTemplates(templates.createSession, {
				name: databaseName,
			});

			return [databaseStatement, createSessionStatement].join('\n');
		},

		createUdt(udt, dbData) {
			const characterSet = udt.characterSet ? ` CHARACTER SET ${udt.characterSet}` : '';
			if (udt.type === 'OBJECT') {
				if (_.isEmpty(udt.properties)) {
					return '';
				}

				const columnDefinitions = udt.properties.map(field => {
					let columnDefinition = `"${field.name}" ${decorateType(field.type, field)}`;
					columnDefinition += field.characterSet ? ` CHARACTER SET ${field.characterSet}` : '';
					return columnDefinition;
				}).join(',\n\t')

				return commentIfDeactivated(
					assignTemplates(templates.createStructuredType, {
						typeName: `"${udt.name}"`,
						columnDefinitions,
						methodSpecification: udt.methodSpecification ? `\n\t${udt.methodSpecification}` : '',
					}),
					{
						isActivated: udt.isActivated,
					}
				);
			} else if (udt.type === 'ARRAY') {
				if (_.isEmpty(udt.items)) {
					return '';
				}

				const arrayElement = _.first(udt.items);
				const childElementsType = decorateType(arrayElement.type, arrayElement);
				return commentIfDeactivated(
					assignTemplates(templates.createArrayType, {
						typeName: `"${udt.name}"`,
						baseType: `${childElementsType} ${decorateType(udt.type, udt)}`,
						default: udt.default ? `\n\tDEFAULT ${udt.default}` : '',
					}),
					{
						isActivated: udt.isActivated,
					}
				);
			}

			return commentIfDeactivated(
				assignTemplates(templates.createDistinctType, {
					typeName: `"${udt.name}"`,
					baseType: decorateType(udt.type, udt) + characterSet,
					methodSpecification: udt.methodSpecification ? `\n\t${udt.methodSpecification}` : '',
				}),
				{
					isActivated: udt.isActivated,
				}
			);
		},

		createTable(tableData, isActivated) {
			const { name, dbData, tableSet, temporary, columns, tablePreservation, checkConstraints, foreignKeyConstraints, selectStatement, traceTable, errorTable, targetDataTable, foreignTable, using } = tableData;
			const tableOptions = getTableOptions(tableData)
			const tableName = getTableName(name, dbData.databaseName);
			const tableIndexes = getInlineTableIndexes(tableData);
			const tablePreservationStatement = tablePreservation ? `\n\tON COMMIT ${tablePreservation}` : '';
			const checkConstraintsStatement = !_.isEmpty(checkConstraints) ? ',\n\t\t' + checkConstraints.join(',\n\t\t') : '';

			const dividedKeysConstraints = divideIntoActivatedAndDeactivated(
				tableData.keyConstraints.map(createKeyConstraint(templates, isActivated)),
				key => key.statement,
			);
			const keyConstraintsString = generateConstraintsString(dividedKeysConstraints, isActivated);

			const dividedForeignKeys = divideIntoActivatedAndDeactivated(foreignKeyConstraints, key => key.statement);
			const foreignKeyConstraintsString = generateConstraintsString(dividedForeignKeys, isActivated);

			if (foreignTable && using?.location) {
				const usingOptions = getUsingOptions(using);

				return commentIfDeactivated(
					assignTemplates(templates.createForeignTable, {
						name: tableName,
						usingOptions,
						tableOptions,
						tableIndexes,
						column_definitions: columns.join(',\n\t\t'),
						keyConstraints: keyConstraintsString,
						foreignKeyConstraints: foreignKeyConstraintsString,
						checkConstraints: checkConstraintsStatement,
						tablePreservation: tablePreservationStatement,
					}),
					{
						isActivated,
					}
				);
			}

			if (errorTable && targetDataTable) {
				return commentIfDeactivated(
					assignTemplates(templates.createErrorTable, {
						tableName: tableName,
						targetDataTable,
					}),
					{
						isActivated,
					}
				);
			}

			if (!_.isEmpty(selectStatement)) {
				return commentIfDeactivated(
					assignTemplates(templates.createAsSelectTable, {
						tableSet: tableSet ? ` ${tableSet}` : '',
						temporary: temporary ? ` ${temporary}` : '',
						name: tableName,
						tableOptions,
						column_definitions: columns.join(',\n\t\t'),
						keyConstraints: keyConstraintsString,
						foreignKeyConstraints: foreignKeyConstraintsString,
						checkConstraints: checkConstraintsStatement,
						selectStatement,
						tableIndexes,
						tablePreservation: tablePreservationStatement,
					}),
					{
						isActivated,
					}
				);
			}

			return commentIfDeactivated(
				assignTemplates(templates.createTable, {
					name: tableName,
					tableIndexes,
					tableOptions,
					tableSet: tableSet ? ` ${tableSet}` : '',
					temporary: temporary ? ` ${temporary}` : '',
					traceTable: traceTable ? ` TRACE` : '',
					column_definitions: columns.join(',\n\t\t'),
					keyConstraints: keyConstraintsString,
					foreignKeyConstraints: foreignKeyConstraintsString,
					checkConstraints: checkConstraintsStatement,
					tablePreservation: tablePreservationStatement,
				}),
				{
					isActivated,
				}
			);
		},

		createView(viewData, dbData, isActivated) {
			const { deactivatedWholeStatement, selectStatement } = this.viewSelectStatement(viewData, isActivated);

			return commentIfDeactivated(
				assignTemplates(templates.createView, {
					name: getTableName(viewData.name, dbData.databaseName),
					recursive: viewData.recursive ? ' RECURSIVE' : '',
					selectStatement,
					columnList: viewColumnsToString(viewData.keys, isActivated),
				}),
				{ isActivated: !deactivatedWholeStatement },
			);
		},

		viewSelectStatement(viewData, isActivated = true) {
			const allDeactivated = checkAllKeysDeactivated(viewData.keys || []);
			const deactivatedWholeStatement = allDeactivated || !isActivated;
			const { columns, tables } = getViewData(viewData.keys);
			let columnsAsString = columns.map(column => column.statement).join(',\n\t\t');

			if (!deactivatedWholeStatement) {
				const dividedColumns = divideIntoActivatedAndDeactivated(columns, column => column.statement);
				const deactivatedColumnsString = dividedColumns.deactivatedItems.length
					? commentIfDeactivated(dividedColumns.deactivatedItems.join(',\n\t\t'), {
						isActivated: false,
						isPartOfLine: true,
					})
					: '';
				columnsAsString = dividedColumns.activatedItems.join(',\n\t\t') + deactivatedColumnsString;
			}

			const selectStatement = _.trim(viewData.selectStatement)
				? _.trim(tab(viewData.selectStatement))
				: assignTemplates(templates.viewSelectStatement, {
					tableName: tables.join(', '),
					keys: columnsAsString,
				});

			return { deactivatedWholeStatement, selectStatement };
		},

		createIndex(tableName, index, dbData, isParentActivated = true) {
			const inlineIndex = !['HASH', 'JOIN'].includes(index.indexType);
			if (inlineIndex || !index.indxName) {
				return '';
			}

			const indexOptions = getIndexOptions(index);

			if (index.indexType === 'HASH') {
				if (_.isEmpty(index.indxKey)) {
					return '';
				}

				const isOrderByKeys = !_.isEmpty(index.orderKeys) && !checkAllKeysDeactivated(index.orderKeys || [])

				let orderBy = ''
				orderBy += index.orderBy ? ` ORDER BY ${index.orderBy}` : '';
				orderBy += !index.orderBy && isOrderByKeys ? ' ORDER BY' : '';
				orderBy += isOrderByKeys ? ` ( ${getIndexKeys(index.orderKeys)} )` : '';

				const allKeysDeactivated = checkAllKeysDeactivated(index.indxKey || []);

				return commentIfDeactivated(
					assignTemplates(templates.createHashIndex, {
						indexName: getIndexName(index.indxName, dbData.databaseName),
						tableName: getTableName(tableName, dbData.databaseName),
						indexKeys: getIndexKeys(index.indxKey),
						orderBy,
						indexOptions,
					}),
					{
						isActivated: isParentActivated && index.isActivated && !allKeysDeactivated
					}
				);
			} else if (index.indexType === 'JOIN') {
				if (_.isEmpty(index.asSelect)) {
					return '';
				}

				return commentIfDeactivated(
					assignTemplates(templates.createJoinIndex, {
						indexName: getIndexName(index.indxName, dbData.databaseName),
						selectStatement: index.asSelect,
						indexOptions,
					}),
					{
						isActivated: isParentActivated && index.isActivated
					}
				);
			}

			return '';
		},

		createCheckConstraint(checkConstraint) {
			return assignTemplates(templates.checkConstraint, {
				name: checkConstraint.name ? `CONSTRAINT "${checkConstraint.name}" ` : '',
				expression: checkConstraint.expression,
			});
		},

		createForeignKeyConstraint(
			{ foreignKey, primaryTable, primaryKey, primaryTableActivated, foreignTableActivated, customProperties },
			dbData,
		) {
			const isAllPrimaryKeysDeactivated = checkAllKeysDeactivated(primaryKey);
			const isAllForeignKeysDeactivated = checkAllKeysDeactivated(foreignKey);
			const isActivated =
				!isAllPrimaryKeysDeactivated &&
				!isAllForeignKeysDeactivated &&
				primaryTableActivated &&
				foreignTableActivated;

			return {
				statement: assignTemplates(templates.createForeignKeyConstraint, {
					checkOption: customProperties.checkOption,
					primaryTable: getTableName(primaryTable, dbData.databaseName),
					foreignKey: isActivated ? foreignKeysToString(foreignKey) : foreignActiveKeysToString(foreignKey),
					primaryKey: isActivated ? foreignKeysToString(primaryKey) : foreignActiveKeysToString(primaryKey),
				}),
				isActivated,
			};
		},

		convertColumnDefinition(columnDefinition) {
			const type = this.hasType(columnDefinition.type) ? decorateType(columnDefinition.type, columnDefinition) : columnDefinition.type;
			const inlineLength = columnDefinition.inlineLength ? ` INLINE LENGTH ${columnDefinition.inlineLength}` : '';
			const notNull = columnDefinition.required ? ' NOT NULL' : '';
			const inlineUniqueConstraint = columnDefinition.unique && !columnDefinition.nullable ? ' UNIQUE' : '';
			const inlinePKConstraint = columnDefinition.primaryKey && !columnDefinition.nullable ? ' PRIMARY KEY' : '';
			const characterSet = columnDefinition.characterSet ? ` CHARACTER SET ${columnDefinition.characterSet}` : '';
			const storageFormat = columnDefinition.storageFormat ? ` STORAGE FORMAT ${columnDefinition.storageFormat}` : '';
			const withSchema = columnDefinition.withSchema ? ` WITH SCHEMA ${columnDefinition.withSchema}` : '';
			const defaultValue = columnDefinition.default ? ` DEFAULT ${columnDefinition.default}` : '';
			const uppercase = columnDefinition.uppercase ? ' UPPERCASE' : '';
			const caseSpecific = columnDefinition.caseSpecific ? ' CASESPECIFIC' : '';
			const format = columnDefinition.format ? ` FORMAT '${columnDefinition.format}'` : '';
			const autoColumn = columnDefinition.autoColumn ? ' AUTO COLUMN' : '';
			const compress = columnDefinition.compress ? ` COMPRESS (${columnDefinition.compress})` : '';
			const compressUsing = columnDefinition.compressUsing ? ` COMPRESS USING ${columnDefinition.compressUsing}` : '';
			const decompressUsing = columnDefinition.decompressUsing ? ` DECOMPRESS USING ${columnDefinition.decompressUsing}` : '';

			return commentIfDeactivated(
				assignTemplates(templates.columnDefinition, {
					name: columnDefinition.name,
					not_null: notNull,
					default: defaultValue,
					type,
					inlineLength,
					storageFormat,
					withSchema,
					uppercase,
					caseSpecific,
					format,
					autoColumn,
					compress,
					compressUsing,
					decompressUsing,
					characterSet,
					inlineUniqueConstraint,
					inlinePKConstraint,
					inlineCheckConstraint: ''
				}),
				{
					isActivated: columnDefinition.isActivated,
				},
			);
		},

		hydrateForDeleteSchema(containerData) {
			return { };
		},

		hydrateAlertTable(collection) {
			return {};
		},

		alterTable(data) {
			return '';
		},

		getDefaultType(type) {
			return defaultTypes[type];
		},

		getTypesDescriptors() {
			return types;
		},

		hasType(type) {
			return hasType(types, type);
		},
	};
};
