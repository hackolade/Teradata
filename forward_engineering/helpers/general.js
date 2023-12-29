module.exports = (_, tab, commentIfDeactivated) => {
	const viewColumnsToString = (keys, isParentActivated) => {
		if (!isParentActivated) {
			return keys.map(key => `"${key.name}"`).join(',\n\t');
		}
	
		let activatedKeys = keys.filter(key => key.isActivated).map(key => `"${key.name}"`);
		let deactivatedKeys = keys.filter(key => !key.isActivated).map(key => `"${key.name}"`);
	
		if (activatedKeys.length === 0) {
			return commentIfDeactivated(deactivatedKeys.join(',\n\t'), { isActivated: false }, true);
		}
		if (deactivatedKeys.length === 0) {
			return activatedKeys.join(',\n\t');
		}
	
		return (
			activatedKeys.join(',\n\t') +
			'\n\t' +
			commentIfDeactivated(deactivatedKeys.join(',\n\t'), { isActivated: false }, true)
		);
	};

	const getTableName = (tableName, databaseName) => {
		if (databaseName) {
			return `"${databaseName}"."${tableName}"`;
		} else {
			return `"${tableName}"`;
		}
	};

	const getIndexName = getTableName;

	const getDefaultJournalTableName = (dbName, tableName) => {
		if (dbName) {
			return `"${dbName}"."${tableName}"`;
		} else {
			return tableName;
		}
	};
	const getJournalingStrategy = (strategy, type) => {
		if (strategy === type) {
			return `${type} JOURNAL`;
		}

		return `${strategy} ${type} JOURNAL`;
	};

	/**
	 *
	 * @param {ContainerOptions} containerOptions
	 * @return {string}
	 */
	const getDatabaseOptions = ({
		db_account,
		db_default_map,
		db_permanent_storage_size,
		spool_files_size,
		has_fallback,
		db_before_journaling_strategy,
		db_after_journaling_strategy,
		db_default_journal_table,
		db_default_journal_db,
		dropDefaultJournalTable,
	}) => {
		const add = (condition, value, falsyValue = false) => (dbOptions) => {
			if (condition) {
				return [ ...dbOptions, value ];
			} else if (falsyValue) {
				return [ ...dbOptions, falsyValue ];
			}

			return dbOptions;
		}

		const dropDefaultJournalTableStatement = dropDefaultJournalTable ? 'DROP ' : '';
		const defaultJournalTableStatement =
			`${dropDefaultJournalTableStatement}DEFAULT JOURNAL TABLE = ${getDefaultJournalTableName(db_default_journal_db, db_default_journal_table)}`;

		return _.flow([
			add(db_permanent_storage_size, `PERMANENT = ${db_permanent_storage_size}`),
			add(spool_files_size, `SPOOL = ${spool_files_size}`),
			add(db_account, `ACCOUNT = ${db_account}`),
			add(db_default_map, `DEFAULT MAP = ${db_default_map}`),
			add(has_fallback, 'FALLBACK', 'NO FALLBACK'),
			add(db_before_journaling_strategy, getJournalingStrategy(db_before_journaling_strategy, 'BEFORE')),
			add(db_after_journaling_strategy, getJournalingStrategy(db_after_journaling_strategy, 'AFTER')),
			add(db_default_journal_table, defaultJournalTableStatement),
			(dbOptions) => tab('\n ' + dbOptions.join(',\n ')),
		])([]);
	};

	const getKeyWithAlias = key => {
		if (!key) {
			return '';
		}

		if (key.alias) {
			return `"${key.name}" AS "${key.alias}"`;
		} else {
			return `"${key.name}"`;
		}
	};

	const getViewData = keys => {
		if (!Array.isArray(keys)) {
			return { tables: [], columns: [] };
		}

		return keys.reduce(
			(result, key) => {
				if (!key.tableName) {
					result.columns.push(getKeyWithAlias(key));

					return result;
				}

				const tableName = `"${key.dbName}"."${key.tableName}"`;

				if (!result.tables.includes(tableName)) {
					result.tables.push(tableName);
				}

				result.columns.push({
					statement: `${tableName}.${getKeyWithAlias(key)}`,
					isActivated: key.isActivated,
				});

				return result;
			},
			{
				tables: [],
				columns: [],
			},
		);
	};

    /**
     * @param {ContainerCompModeData} compModeData
     * @return {boolean}
     */
    const shouldDropDefaultJournalTable = (compModeData) => {
        const shouldDrop = compModeData.old.db_default_journal_db
            && compModeData.old.db_default_journal_table
            && !compModeData.new.db_default_journal_db
            && !compModeData.new.db_default_journal_table;
        return Boolean(shouldDrop);
    };

	return {
		getTableName,
		getIndexName,
		getJournalingStrategy,
		getDefaultJournalTableName,
		getDatabaseOptions,
		getViewData,
		viewColumnsToString,
        shouldDropDefaultJournalTable,
	};
};
