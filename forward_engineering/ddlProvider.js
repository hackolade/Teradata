const templates = require('./configs/templates');
const defaultTypes = require('./configs/defaultTypes');
const types = require('./configs/types');
const getAdditionalOptions = require('./helpers/getAdditionalOptions');
const dropStatementProxy = require('./helpers/dropStatementProxy');

/**
 * @param {BaseProvider} baseProvider
 * @param {DdlProviderOptions} options
 * @param {App} app
 * @return {Object}
 */
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
		wrap,
		getDifferentProperties,
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
	const {
		getTableName,
		getIndexName,
		getDatabaseOptions,
		getViewData,
		getJournalingStrategy,
		viewColumnsToString,
		shouldDropDefaultJournalTable,
	} = require('./helpers/general')(_, tab, commentIfDeactivated);
	const { getTableOptions, getUsingOptions, getInlineTableIndexes, getIndexOptions, getIndexKeys } =
		require('./helpers/tableHelper')({
			_,
			tab,
			getJournalingStrategy,
			commentIfDeactivated,
			checkAllKeysDeactivated,
			divideIntoActivatedAndDeactivated,
		});
	const { decorateType } = require('./helpers/columnDefinitionHelper')(_);

	const additionalOptions = getAdditionalOptions(options.additionalOptions);

	return dropStatementProxy({ commentIfDeactivated })(additionalOptions.applyDropStatements, {
		hydrateDatabase(containerData) {
			return {
				databaseName: containerData.name,
				isActivated: containerData.isActivated,
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
				tableOptions: detailsTab.tableOptions,
				partitioning: detailsTab.partitioning,
				selectStatement: detailsTab.selectStatement,
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

		/**
		 * @param {Index} indexData
		 * @return {Index}
		 */
		hydrateIndex(indexData) {
			return indexData;
		},

		/**
		 * @param {CheckConstraint} checkConstraint
		 * @return {HydratedCheckConstraint}
		 */
		hydrateCheckConstraint(checkConstraint) {
			const buildExpression = expr => {
				const plainExpr = _.trim(expr).replace(/^\(([\s\S]*)\)$/, '$1');
				return `CHECK (${plainExpr})`;
			};

			return {
				name: checkConstraint.chkConstrName || '',
				expression: buildExpression(checkConstraint.constrExpression),
			};
		},

		hydrateViewColumn(data) {
			return {
				name: data.name,
				tableName: data.entityName,
				alias: data.alias,
				isActivated: data.isActivated,
				dbName: data.dbName,
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
			isActivated,
			db_account,
			db_default_map,
			db_permanent_storage_size,
			spool_files_size,
			has_fallback,
			db_before_journaling_strategy,
			db_after_journaling_strategy,
			db_default_journal_table,
			db_default_journal_db,
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
				db_default_journal_db,
			});

			const databaseStatement = commentIfDeactivated(
				assignTemplates(templates.createDatabase, {
					name: databaseName,
					databaseOptions,
				}),
				{
					isActivated,
				},
			);

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

				const columnDefinitions = udt.properties
					.map(field => {
						let columnDefinition = `"${field.name}" ${decorateType(field.type, field)}`;
						columnDefinition += field.characterSet ? ` CHARACTER SET ${field.characterSet}` : '';
						return columnDefinition;
					})
					.join(',\n\t');

				return commentIfDeactivated(
					assignTemplates(templates.createStructuredType, {
						typeName: `"${udt.name}"`,
						columnDefinitions,
						methodSpecification: udt.methodSpecification ? `\n\t${udt.methodSpecification}` : '',
					}),
					{
						isActivated: udt.isActivated,
					},
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
					},
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
				},
			);
		},

		createTable(tableData, isActivated) {
			const { name, dbData, columns, checkConstraints, foreignKeyConstraints, selectStatement, tableOptions } =
				tableData;
			const preparedTableOptions = getTableOptions(tableOptions);
			const tableName = getTableName(name, dbData.databaseName);
			const tableIndexes = getInlineTableIndexes(tableData);
			const tablePreservationStatement = tableOptions.TABLE_PRESERVATION
				? `\n\tON COMMIT ${tableOptions.TABLE_PRESERVATION}`
				: '';
			const checkConstraintsStatement = !_.isEmpty(checkConstraints)
				? ',\n\t\t' + checkConstraints.join(',\n\t\t')
				: '';

			const dividedKeysConstraints = divideIntoActivatedAndDeactivated(
				tableData.keyConstraints.map(createKeyConstraint(templates, isActivated)),
				key => key.statement,
			);
			const keyConstraintsString = generateConstraintsString(dividedKeysConstraints, isActivated);

			const dividedForeignKeys = divideIntoActivatedAndDeactivated(foreignKeyConstraints, key => key.statement);
			const foreignKeyConstraintsString = generateConstraintsString(dividedForeignKeys, isActivated);

			if (tableOptions.FOREIGN_TABLE && tableOptions.USING?.location) {
				const usingOptions = getUsingOptions(tableOptions.USING);

				return commentIfDeactivated(
					assignTemplates(templates.createForeignTable, {
						name: tableName,
						usingOptions,
						tableIndexes,
						tableOptions: preparedTableOptions,
						column_definitions: columns.join(',\n\t\t'),
						keyConstraints: keyConstraintsString,
						foreignKeyConstraints: foreignKeyConstraintsString,
						checkConstraints: checkConstraintsStatement,
						tablePreservation: tablePreservationStatement,
					}),
					{
						isActivated,
					},
				);
			}

			if (tableOptions.ERROR_TABLE && tableOptions.FOR_TABLE) {
				return commentIfDeactivated(
					assignTemplates(templates.createErrorTable, {
						tableName: tableName,
						targetDataTable: tableOptions.FOR_TABLE,
					}),
					{
						isActivated,
					},
				);
			}

			if (!_.isEmpty(selectStatement)) {
				return commentIfDeactivated(
					assignTemplates(templates.createAsSelectTable, {
						tableSet: tableOptions.SET_MULTISET ? ` ${tableOptions.SET_MULTISET}` : '',
						temporary: tableOptions.TEMPORARY_VOLATILE ? ` ${tableOptions.TEMPORARY_VOLATILE}` : '',
						name: tableName,
						tableOptions: preparedTableOptions,
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
					},
				);
			}

			return commentIfDeactivated(
				assignTemplates(templates.createTable, {
					name: tableName,
					tableIndexes,
					tableOptions: preparedTableOptions,
					tableSet: tableOptions.SET_MULTISET ? ` ${tableOptions.SET_MULTISET}` : '',
					temporary: tableOptions.TEMPORARY_VOLATILE ? ` ${tableOptions.TEMPORARY_VOLATILE}` : '',
					traceTable: tableOptions.TRACE_TABLE ? ` TRACE` : '',
					column_definitions: columns.join(',\n\t\t'),
					keyConstraints: keyConstraintsString,
					foreignKeyConstraints: foreignKeyConstraintsString,
					checkConstraints: checkConstraintsStatement,
					tablePreservation: tablePreservationStatement,
				}),
				{
					isActivated,
				},
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

				const isOrderByKeys = !_.isEmpty(index.orderKeys) && !checkAllKeysDeactivated(index.orderKeys || []);

				let orderBy = '';
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
						isActivated: isParentActivated && index.isActivated && !allKeysDeactivated,
					},
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
						isActivated: isParentActivated && index.isActivated,
					},
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

		/**
		 * @param {string} tableName
		 * @param {HydratedCheckConstraint} checkConstraint
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		createCheckConstraintStatement(tableName, checkConstraint, dbData) {
			const table = getTableName(tableName, dbData.databaseName);

			return assignTemplates(templates.alterTable, {
				tableName: table,
				tableOptions: '',
				alterStatement: assignTemplates(templates.addCheckConstraint, {
					name: wrap(checkConstraint.name, '"', '"'),
					expression: checkConstraint.expression,
				}),
			});
		},

		/**
		 * @param {string} tableName
		 * @param {HydratedCheckConstraint} checkConstraint
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		dropCheckConstraint(tableName, checkConstraint, dbData) {
			const table = getTableName(tableName, dbData.databaseName);

			return assignTemplates(templates.alterTable, {
				tableName: table,
				tableOptions: '',
				alterStatement: assignTemplates(templates.dropCheckConstraint, {
					name: wrap(checkConstraint.name, '"', '"'),
				}),
			});
		},

		/**
		 * @param {string} tableName
		 * @param {CheckConstraint} newCheck
		 * @param {CheckConstraint} oldCheck
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		alterCheckConstraint(tableName, { new: newCheck, old: oldCheck }, dbData) {
			const table = getTableName(tableName, dbData.databaseName);

			const alterStatements = [];
			if (newCheck.chkConstrName !== oldCheck.chkConstrName) {
				const renameConstraint = assignTemplates(templates.rename, {
					oldName: wrap(oldCheck.chkConstrName, '"', '"'),
					newName: wrap(newCheck.chkConstrName, '"', '"'),
				});

				alterStatements.push(renameConstraint);
			}

			if (newCheck.constrExpression !== oldCheck.constrExpression) {
				const modifyConstraint = assignTemplates(templates.modifyCheckConstraint, {
					name: wrap(oldCheck.chkConstrName, '"', '"'),
					expression: newCheck.chkConstrName,
				});

				alterStatements.push(modifyConstraint);
			}

			return assignTemplates(templates.alterTable, {
				tableName: table,
				tableOptions: '',
				alterStatement: '\n' + tab(alterStatements.join(',\n')),
			});
		},

		createForeignKeyConstraint(
			{
				foreignKey,
				primaryTable,
				primaryKey,
				primaryTableActivated,
				foreignTableActivated,
				customProperties,
				isActivated,
			},
			dbData,
		) {
			const isAllPrimaryKeysDeactivated = checkAllKeysDeactivated(primaryKey);
			const isAllForeignKeysDeactivated = checkAllKeysDeactivated(foreignKey);
			const isRelationshipActivated =
				!isAllPrimaryKeysDeactivated &&
				!isAllForeignKeysDeactivated &&
				primaryTableActivated &&
				foreignTableActivated &&
				isActivated !== false; // * It is done so to support old version of the application where there is no isActivated property

			return {
				statement: assignTemplates(templates.createForeignKeyConstraint, {
					checkOption: customProperties.checkOption,
					primaryTable: getTableName(primaryTable, dbData.databaseName),
					foreignKey: isRelationshipActivated
						? foreignKeysToString(foreignKey)
						: foreignActiveKeysToString(foreignKey),
					primaryKey: isRelationshipActivated
						? foreignKeysToString(primaryKey)
						: foreignActiveKeysToString(primaryKey),
				}),
				isActivated: isRelationshipActivated,
			};
		},

		convertColumnDefinition(columnDefinition) {
			const type = this.hasType(columnDefinition.type)
				? decorateType(columnDefinition.type, columnDefinition)
				: `"${columnDefinition.type}"`;
			const inlineLength = columnDefinition.inlineLength ? ` INLINE LENGTH ${columnDefinition.inlineLength}` : '';
			const notNull = columnDefinition.required ? ' NOT NULL' : '';
			const inlineUniqueConstraint = columnDefinition.unique && !columnDefinition.nullable ? ' UNIQUE' : '';
			const inlinePKConstraint = columnDefinition.primaryKey && !columnDefinition.nullable ? ' PRIMARY KEY' : '';
			const characterSet = columnDefinition.characterSet ? ` CHARACTER SET ${columnDefinition.characterSet}` : '';
			const storageFormat = columnDefinition.storageFormat
				? ` STORAGE FORMAT ${columnDefinition.storageFormat}`
				: '';
			const withSchema = columnDefinition.withSchema ? ` WITH SCHEMA ${columnDefinition.withSchema}` : '';
			const defaultValue = columnDefinition.default ? ` DEFAULT ${columnDefinition.default}` : '';
			const uppercase = columnDefinition.uppercase ? ' UPPERCASE' : '';
			const caseSpecific = columnDefinition.caseSpecific ? ' CASESPECIFIC' : '';
			const format = columnDefinition.format ? ` FORMAT '${columnDefinition.format}'` : '';
			const autoColumn = columnDefinition.autoColumn ? ' AUTO COLUMN' : '';
			const compress = columnDefinition.compress ? ` COMPRESS (${columnDefinition.compress})` : '';
			const compressUsing = columnDefinition.compressUsing
				? ` COMPRESS USING ${columnDefinition.compressUsing}`
				: '';
			const decompressUsing = columnDefinition.decompressUsing
				? ` DECOMPRESS USING ${columnDefinition.decompressUsing}`
				: '';

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
					inlineCheckConstraint: '',
				}),
				{
					isActivated: columnDefinition.isActivated,
				},
			);
		},

		/**
		 * @param {Array<HydrateDropContainerData>} containerData
		 * @return {DropContainerData}
		 */
		hydrateDropDatabase(containerData) {
			return {
				databaseName: containerData[0]?.name || '',
			};
		},

		/**
		 * @param {Array<HydrateModifyContainerData>} containerData
		 * @param {ContainerCompModeData} compModeData
		 * @return {ModifyContainerData}
		 */
		hydrateAlterDatabase({ containerData, compModeData }) {
			const data = containerData[0] || {};

			const isDbAccountModified = compModeData.new.db_account !== compModeData.old.db_account;
			const isDefaultMapModified = compModeData.new.db_default_map !== compModeData.old.db_default_map;
			const isPermanentStorageSizeModified =
				compModeData.new.db_permanent_storage_size !== compModeData.old.db_permanent_storage_size;
			const isSpoolFilesSizeModified = compModeData.new.spool_files_size !== compModeData.old.spool_files_size;
			const isTemporaryTablesSizeModified =
				compModeData.new.temporary_tables_size !== compModeData.old.temporary_tables_size;
			const isFallbackModified = compModeData.new.has_fallback !== compModeData.old.has_fallback;
			const isBeforeJournalStrategyModified =
				compModeData.new.db_before_journaling_strategy !== compModeData.old.db_before_journaling_strategy;
			const isAfterJournalStrategyModified =
				compModeData.new.db_after_journaling_strategy !== compModeData.old.db_after_journaling_strategy;
			const isDefaultJournalTableModified =
				compModeData.new.db_default_journal_db !== compModeData.old.db_default_journal_db ||
				compModeData.new.db_default_journal_table !== compModeData.old.db_default_journal_table;
			const dropDefaultJournalTable = shouldDropDefaultJournalTable(compModeData);

			return {
				name: data.name || '',
				...(isDbAccountModified && { db_account: data.db_account }),
				...(isDefaultMapModified && { db_default_map: data.db_default_map }),
				...(isPermanentStorageSizeModified && { db_permanent_storage_size: data.db_permanent_storage_size }),
				...(isSpoolFilesSizeModified && { spool_files_size: data.spool_files_size }),
				...(isTemporaryTablesSizeModified && { temporary_tables_size: data.temporary_tables_size }),
				...(isFallbackModified && { has_fallback: data.has_fallback }),
				...(isBeforeJournalStrategyModified && {
					db_before_journaling_strategy: data.db_before_journaling_strategy,
				}),
				...(isAfterJournalStrategyModified && {
					db_after_journaling_strategy: data.db_after_journaling_strategy,
				}),
				...(isDefaultJournalTableModified && {
					db_default_journal_db: dropDefaultJournalTable
						? compModeData.old.db_default_journal_db
						: data.db_default_journal_db,
					db_default_journal_table: dropDefaultJournalTable
						? compModeData.old.db_default_journal_table
						: data.db_default_journal_table,
					dropDefaultJournalTable,
				}),
			};
		},

		/**
		 * @param {TableData} tableData
		 * @param {EntityData} entityData
		 * @return {DropEntityData}
		 */
		hydrateDropTable({ tableData, entityData }) {
			const detailsTab = entityData[0];

			return {
				name: tableData.name,
				dbName: tableData.dbData.databaseName,
				temporary: detailsTab?.tableOptions?.TEMPORARY_VOLATILE === 'GLOBAL TEMPORARY',
			};
		},

		/**
		 * @param {string} name
		 * @param {EntityData} newEntityData
		 * @param {EntityData} oldEntityData
		 * @return {ModifyEntityData}
		 */
		hydrateAlterTable({ name, newEntityData, oldEntityData }) {
			const newTableOptions = newEntityData[0]?.tableOptions || {};
			const oldTableOptions = oldEntityData[0]?.tableOptions || {};

			const isErrorTableModified = newTableOptions.ERROR_TABLE !== oldTableOptions.ERROR_TABLE;
			const isForTableModified = newTableOptions.FOR_TABLE !== oldTableOptions.FOR_TABLE;
			const isForeignTableModified = newTableOptions.FOREIGN_TABLE !== oldTableOptions.FOREIGN_TABLE;
			const isMultisetModified = newTableOptions.SET_MULTISET !== oldTableOptions.SET_MULTISET;
			const isTemporaryVolatileModified =
				newTableOptions.TEMPORARY_VOLATILE !== oldTableOptions.TEMPORARY_VOLATILE;
			const isQueuedTableModified = newTableOptions.QUEUE_TABLE !== oldTableOptions.QUEUE_TABLE;
			const isTraceTableModified = newTableOptions.TRACE_TABLE !== oldTableOptions.TRACE_TABLE;
			const isExternalSecurityModified = newTableOptions.EXTERNAL_SECURITY !== oldTableOptions.EXTERNAL_SECURITY;
			const isAuthorizationNameModified =
				newTableOptions.AUTHORIZATION_NAME !== oldTableOptions.AUTHORIZATION_NAME;
			const isMapModified = newTableOptions.MAP !== oldTableOptions.MAP;
			const isColocateUsingModified = newTableOptions.COLOCATE_USING !== oldTableOptions.COLOCATE_USING;
			const isFallbackModified = newTableOptions.FALLBACK !== oldTableOptions.FALLBACK;
			const isDefaultJournalTableModified =
				newTableOptions.DEFAULT_JOURNAL_TABLE !== oldTableOptions.DEFAULT_JOURNAL_TABLE;
			const isLogModified = newTableOptions.LOG !== oldTableOptions.LOG;
			const isBeforeJournalModified = newTableOptions.BEFORE_JOURNAL !== oldTableOptions.BEFORE_JOURNAL;
			const isAfterJournalModified = newTableOptions.AFTER_JOURNAL !== oldTableOptions.AFTER_JOURNAL;
			const isChecksumModified = newTableOptions.TABLE_CHECKSUM !== oldTableOptions.TABLE_CHECKSUM;
			const isIsolateLoadingModified = newTableOptions.ISOLATED_LOADING !== oldTableOptions.ISOLATED_LOADING;
			const isTablePreservationModified =
				newTableOptions.TABLE_PRESERVATION !== oldTableOptions.TABLE_PRESERVATION;
			const isFreespaceModified =
				newTableOptions.FREESPACE?.freeSpaceValue !== oldTableOptions.FREESPACE?.freeSpaceValue ||
				newTableOptions.FREESPACE?.percentUnit !== oldTableOptions.FREESPACE?.percentUnit;
			const isMergeBlockRatioModified =
				newTableOptions.MERGE_BLOCK_RATIO?.mergeRatio !== oldTableOptions.MERGE_BLOCK_RATIO?.mergeRatio ||
				newTableOptions.MERGE_BLOCK_RATIO?.specificRatio !== oldTableOptions.MERGE_BLOCK_RATIO?.specificRatio ||
				newTableOptions.MERGE_BLOCK_RATIO?.percentUnit !== oldTableOptions.MERGE_BLOCK_RATIO?.percentUnit;
			const isDataBlockSizeModified =
				newTableOptions.DATA_BLOCK_SIZE.blockSize !== oldTableOptions.DATA_BLOCK_SIZE?.blockSize ||
				newTableOptions.DATA_BLOCK_SIZE?.specificSize !== oldTableOptions.DATA_BLOCK_SIZE?.specificSize ||
				newTableOptions.DATA_BLOCK_SIZE?.units !== oldTableOptions.DATA_BLOCK_SIZE?.units;
			const isBlockCompressionModified =
				newTableOptions.BLOCK_COMPRESSION?.blockCompressionType !==
					oldTableOptions.BLOCK_COMPRESSION?.blockCompressionType ||
				newTableOptions.BLOCK_COMPRESSION?.blockCompressionAlgorithm !==
					oldTableOptions.BLOCK_COMPRESSION?.blockCompressionAlgorithm ||
				newTableOptions.BLOCK_COMPRESSION?.blockCompressionLevel !==
					oldTableOptions.BLOCK_COMPRESSION?.blockCompressionLevel ||
				newTableOptions.BLOCK_COMPRESSION?.specificBlockCompressionLevel !==
					oldTableOptions.BLOCK_COMPRESSION?.specificBlockCompressionLevel;
			const isUsingModified =
				newTableOptions.USING?.location !== oldTableOptions.USING?.location ||
				newTableOptions.USING?.scanPercentage !== oldTableOptions.USING?.scanPercentage ||
				newTableOptions.USING?.pathPattern !== oldTableOptions.USING?.pathPattern ||
				newTableOptions.USING?.manifest !== oldTableOptions.USING?.manifest ||
				newTableOptions.USING?.tableFormat !== oldTableOptions.USING?.tableFormat ||
				newTableOptions.USING?.rowFormat !== oldTableOptions.USING?.rowFormat ||
				newTableOptions.USING?.storedAs !== oldTableOptions.USING?.storedAs ||
				newTableOptions.USING?.header !== oldTableOptions.USING?.header ||
				newTableOptions.USING?.stripSpaces !== oldTableOptions.USING?.stripSpaces ||
				newTableOptions.USING?.stripEnclosingChar !== oldTableOptions.USING?.stripEnclosingChar;

			return {
				name,
				tableOptions: {
					...(isErrorTableModified && { ERROR_TABLE: newTableOptions.ERROR_TABLE }),
					...(isForTableModified && { FOR_TABLE: newTableOptions.FOR_TABLE }),
					...(isForeignTableModified && { FOREIGN_TABLE: newTableOptions.FOREIGN_TABLE }),
					...(isMultisetModified && { SET_MULTISET: newTableOptions.SET_MULTISET }),
					...(isTemporaryVolatileModified && { TEMPORARY_VOLATILE: newTableOptions.TEMPORARY_VOLATILE }),
					...(isQueuedTableModified && { QUEUE_TABLE: newTableOptions.QUEUE_TABLE }),
					...(isTraceTableModified && { TRACE_TABLE: newTableOptions.TRACE_TABLE }),
					...(isExternalSecurityModified && { EXTERNAL_SECURITY: newTableOptions.EXTERNAL_SECURITY }),
					...(isAuthorizationNameModified && { AUTHORIZATION_NAME: newTableOptions.AUTHORIZATION_NAME }),
					...(isMapModified && { MAP: newTableOptions.MAP }),
					...(isColocateUsingModified && { COLOCATE_USING: newTableOptions.COLOCATE_USING }),
					...(isFallbackModified && { FALLBACK: newTableOptions.FALLBACK }),
					...(isDefaultJournalTableModified && {
						DEFAULT_JOURNAL_TABLE: newTableOptions.DEFAULT_JOURNAL_TABLE,
					}),
					...(isLogModified && { LOG: newTableOptions.LOG }),
					...(isBeforeJournalModified && { BEFORE_JOURNAL: newTableOptions.BEFORE_JOURNAL }),
					...(isAfterJournalModified && { AFTER_JOURNAL: newTableOptions.AFTER_JOURNAL }),
					...(isChecksumModified && { TABLE_CHECKSUM: newTableOptions.TABLE_CHECKSUM }),
					...(isIsolateLoadingModified && { ISOLATED_LOADING: newTableOptions.ISOLATED_LOADING }),
					...(isTablePreservationModified && { TABLE_PRESERVATION: newTableOptions.TABLE_PRESERVATION }),
					...(isFreespaceModified && { FREESPACE: newTableOptions.FREESPACE }),
					...(isMergeBlockRatioModified && { MERGE_BLOCK_RATIO: newTableOptions.MERGE_BLOCK_RATIO }),
					...(isDataBlockSizeModified && { DATA_BLOCK_SIZE: newTableOptions.DATA_BLOCK_SIZE }),
					...(isBlockCompressionModified && { BLOCK_COMPRESSION: newTableOptions.BLOCK_COMPRESSION }),
					...(isUsingModified && { USING: newTableOptions.USING }),
				},
			};
		},

		/**
		 * @param {string} name
		 * @return {DropColumnData}
		 */
		hydrateDropColumn({ name }) {
			return {
				name,
			};
		},

		/**
		 * @param {ColumnDefinition} newColumn
		 * @param {ColumnDefinition} oldColumn
		 * @param oldCompData
		 * @param newCompData
		 * @return {ModifyColumnData}
		 */
		hydrateAlterColumn({ newColumn, oldColumn, oldCompData, newCompData }) {
			const diff = getDifferentProperties(newColumn, oldColumn, ['name', 'type']);

			const result = { ...newColumn };

			if (oldCompData.name !== newCompData.name) {
				result.oldName = oldCompData.name;
			}

			if (oldCompData.type !== newCompData.type) {
				result.oldType = oldCompData.type;
			}

			if (!_.isEmpty(diff)) {
				result.newOptions = diff;
			}

			return result;
		},

		/**
		 * @param {TableData} tableData
		 * @return {DropViewData}
		 */
		hydrateDropView({ tableData }) {
			return {
				name: tableData.name,
				dbData: tableData.dbData,
			};
		},

		/**
		 * @param {string} name
		 * @param {ViewEntityData} newEntityData
		 * @param {ViewEntityData} oldEntityData
		 * @param {ViewData} viewData
		 * @return {AlterViewData}
		 */
		hydrateAlterView({ name, newEntityData, oldEntityData, viewData }) {
			const newData = this.hydrateView({
				viewData: {},
				entityData: newEntityData,
			});

			const oldData = this.hydrateView({
				viewData: {},
				entityData: oldEntityData,
			});

			const oldDViewData = {};

			if (oldEntityData[0]?.name !== newEntityData[0]?.name) {
				oldDViewData.oldName = oldEntityData[0]?.name;
			}

			const options = getDifferentProperties(newData, oldData);

			return {
				name,
				keys: viewData.keys,
				selectStatement: options.selectStatement || newEntityData[0]?.selectStatement,
				recursive: options.recursive || newEntityData[0]?.recursive,
				options,
				...oldDViewData,
			};
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

		/**
		 * @param {DropContainerData} dropDbData
		 * @return {string}
		 */
		dropDatabase(dropDbData) {
			return assignTemplates(templates.dropDatabase, dropDbData);
		},

		/**
		 * @param {ModifyContainerData} alterDbData
		 * @return {string}
		 */
		alterDatabase(alterDbData) {
			const databaseOptions = getDatabaseOptions(alterDbData);

			return assignTemplates(templates.modifyDatabase, {
				databaseName: alterDbData.name,
				databaseOptions,
			});
		},

		/**
		 * @param {DropEntityData} dropEntityData
		 * @return {string}
		 */
		dropTable(dropEntityData) {
			return assignTemplates(templates.dropTable, {
				name: getTableName(dropEntityData.name, dropEntityData.dbName),
				temporary: dropEntityData.temporary ? 'TEMPORARY ' : '',
			});
		},

		/**
		 *
		 * @param {ModifyEntityData} alterTableData
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		alterTable(alterTableData, dbData) {
			const tableName = getTableName(alterTableData.name, dbData.databaseName);
			const tableOptions = getTableOptions(alterTableData.tableOptions, true);

			if (!_.trim(tableOptions)) {
				return '';
			}

			return assignTemplates(templates.alterTable, {
				tableName,
				tableOptions,
			});
		},

		/**
		 * @param {string} tableName
		 * @param {DropColumnData} columnData
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		dropColumn(tableName, columnData, dbData) {
			const fullTableName = getTableName(tableName, dbData.databaseName);

			return assignTemplates(templates.alterTable, {
				tableName: fullTableName,
				tableOptions: '',
				alterStatement: assignTemplates(templates.dropColumn, {
					name: wrap(columnData.name, '"', '"'),
				}),
			});
		},

		/**
		 * @param {string} tableName
		 * @param {ColumnDefinition} columnDefinition
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		addColumn(tableName, columnDefinition, dbData) {
			const table = getTableName(tableName, dbData.databaseName);

			return assignTemplates(templates.alterTable, {
				tableName: table,
				tableOptions: '',
				alterStatement: assignTemplates(templates.addColumn, {
					columnDefinition: this.convertColumnDefinition(columnDefinition),
				}),
			});
		},

		/**
		 * @param {string} tableName
		 * @param {ModifyColumnData} columnData
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		renameColumn(tableName, columnData, dbData) {
			const table = getTableName(tableName, dbData.databaseName);

			return assignTemplates(templates.alterTable, {
				tableName: table,
				tableOptions: '',
				alterStatement: assignTemplates(templates.rename, {
					oldName: wrap(columnData.oldName, '"', '"'),
					newName: wrap(columnData.name, '"', '"'),
				}),
			});
		},

		/**
		 * @param {string} tableName
		 * @param {ModifyColumnData} columnData
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		alterColumn(tableName, columnData, dbData) {
			const table = getTableName(tableName, dbData.databaseName);
			let alterStatement = [];

			if ((columnData.oldName && columnData.oldType) || columnData.oldType) {
				const dropOldColumnStatement = this.dropColumn(tableName, { name: columnData.name }, dbData);

				const createNewColumnStatement = this.addColumn(
					tableName,
					{ ...columnData, isActivated: true },
					dbData,
				);

				alterStatement.push(dropOldColumnStatement, createNewColumnStatement);
			} else if (columnData.oldName && !columnData.newOptions) {
				const renameColumnStatement = this.renameColumn(tableName, columnData, dbData);
				alterStatement.push(renameColumnStatement);
			} else if (columnData.oldName && columnData.newOptions) {
				const renameColumnStatement = this.renameColumn(tableName, columnData, dbData);

				// ADD "column_name"... statement in Teradata also used for modification column properties
				const modifyColumnStatement = this.addColumn(tableName, { ...columnData, isActivated: true }, dbData);
				alterStatement.push(renameColumnStatement, modifyColumnStatement);
			} else {
				// ADD "column_name"... statement in Teradata also used for modification column properties
				const modifyColumnStatement = this.addColumn(tableName, { ...columnData, isActivated: true }, dbData);
				alterStatement.push(modifyColumnStatement);
			}

			return commentIfDeactivated(alterStatement.join('\n\n'), { isActivated: columnData.isActivated });
		},

		/**
		 * @param {string} tableName
		 * @param {Index} indexData
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		dropIndex(tableName, indexData, dbData) {
			if (!indexData.indxName) {
				return '';
			}

			const table = getTableName(tableName, dbData.databaseName);

			if (['PRIMARY', 'PRIMARY AMP'].includes(indexData.indexType)) {
				return '';
			} else if (!indexData.indexType || indexData.indexType === 'SECONDARY') {
				return assignTemplates(templates.dropSecondaryIndex, {
					indexName: wrap(indexData.indxName, '"', '"'),
					tableName: table,
				});
			}

			const indexType = indexData.indexType ? ` ${indexData.indexType}` : '';
			const indexName = getIndexName(indexData.indxName, dbData.databaseName);

			return assignTemplates(templates.dropIndex, {
				indexName,
				indexType,
			});
		},

		/**
		 * @param {string} tableName
		 * @param {Index} newIndexData
		 * @param {Index} oldIndexData
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		alterIndex(tableName, { new: newIndexData, old: oldIndexData }, dbData) {
			return [
				this.dropIndex(tableName, oldIndexData, dbData),
				this.createIndex(
					tableName,
					{
						...newIndexData,
						indxKey: newIndexData.indxKey.filter(key => !(key.isActivated === false)),
					},
					dbData,
				),
			].join('\n\n');
		},

		/**
		 * @param {string} name
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		dropView({ name, dbData }) {
			const viewName = getTableName(name, dbData.databaseName);

			return assignTemplates(templates.dropView, {
				viewName,
			});
		},

		/**
		 * @param {AlterViewData} alterData
		 * @param {CollectionDbData} dbData
		 * @return {string}
		 */
		alterView(alterData, dbData) {
			const isEmptyDiffOptions = _.isEmpty(alterData.options);
			const viewName = getTableName(alterData.name, dbData.databaseName);

			if (alterData.oldName && isEmptyDiffOptions) {
				const oldViewName = getTableName(alterData.oldName, dbData.databaseName);
				return assignTemplates(templates.renameView, {
					oldViewName: oldViewName,
					newViewName: viewName,
				});
			} else if (isEmptyDiffOptions) {
				return '';
			}

			return [
				this.dropView({ name: alterData.oldName || alterData.name, dbData }),
				this.createView(alterData, dbData, true),
			].join('\n\n');
		},
	});
};
