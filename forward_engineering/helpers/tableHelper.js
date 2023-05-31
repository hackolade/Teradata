module.exports = ({
	  _,
	  tab,
	  getJournalingStrategy,
	  commentIfDeactivated,
	  divideIntoActivatedAndDeactivated
	}) => {

	/**
	 * @param {FreespaceTableOption} freespace
	 * @return {number|string}
	 */
	const getFreeSpaceValue = (freespace) => {
		if (freespace?.percentUnit) {
			return `${freespace.freeSpaceValue} PERCENT`;
		} else {
			return freespace?.freeSpaceValue || '';
		}
	};

	/**
	 * @param {MergeBlockRationTableOption} mergeBlockRatio
	 * @return {string}
	 */
	const getMergeBlockRatio = (mergeBlockRatio = {}) => {
		if (mergeBlockRatio.mergeRatio === 'SPECIFIC' && mergeBlockRatio.specificRatio) {
			const percentStatement = mergeBlockRatio.percentUnit ? 'PERCENT' : '';
			return `MERGEBLOCKRATIO = ${mergeBlockRatio.specificRatio} ${percentStatement}`;
		}

		return `${mergeBlockRatio.mergeRatio} MERGEBLOCKRATIO`;
	};

	/**
	 * @param {DataBlockSizeTableOption} dataBlockSize
	 * @return {string}
	 */
	const getDataBlockSize = (dataBlockSize = {}) => {
		if (dataBlockSize.blockSize === 'SPECIFIC' && dataBlockSize.specificSize) {
			const unitsType = dataBlockSize.units ? ` ${dataBlockSize.units}` : '';
			return dataBlockSize.blockSize + unitsType;
		}

		return `${dataBlockSize.blockSize} DATABLOCKSIZE`;
	};

	/**
	 * @param {string} blockCompressionLevel
	 * @param {number} specificBlockCompressionLevel
	 * @return {string}
	 */
	const getBlockCompressionLevel = (blockCompressionLevel, specificBlockCompressionLevel) => {
		if (blockCompressionLevel === 'SPECIFIC' && specificBlockCompressionLevel) {
			return `BLOCKCOMPRESSIONLEVEL = ${specificBlockCompressionLevel}`
		}

		return `BLOCKCOMPRESSIONLEVEL = ${blockCompressionLevel}`;
	};

	/**
	 * @param {BlockComparisonTableOption} blockComparisonOption
	 * @return {Array<string>}
	 */
	const getBlockCompression = (blockComparisonOption = {}) => _.flow([
			add(Boolean(blockComparisonOption.blockCompressionType), `BLOCKCOMPRESSION = ${blockComparisonOption.blockCompressionType}`),
			add(Boolean(blockComparisonOption.blockCompressionType), `BLOCKCOMPRESSIONALGORITHM = ${blockComparisonOption.blockCompressionAlgorithm}`),
			add(
				Boolean(blockComparisonOption.blockCompressionLevel),
				getBlockCompressionLevel(blockComparisonOption.blockCompressionLevel, blockComparisonOption.specificBlockCompressionLevel)
			),
		])([]);

	/**
	 * @param {string} isolatedLoading
	 * @return {string}
	 */
	const getIsolatedLoading = (isolatedLoading) => {
		if (['NO', 'CONCURRENT'].includes(isolatedLoading)) {
			return `WITH ${isolatedLoading} ISOLATED LOADING`
		}

		return `WITH ISOLATED LOADING ${isolatedLoading}`;
	};

	/**
	 * @param {boolean} condition
	 * @param {string|Array<string>} value
	 * @param {boolean|string} falsyValue
	 * @return {Array<string>}
	 */
	const add = (condition, value, falsyValue = false) => (tableOptions) => {
		if (condition) {
			return _.flatten([ ...tableOptions, value ]);
		} else if (falsyValue) {
			return [ ...tableOptions, falsyValue ];
		}

		return tableOptions;
	}

	/**
	 * @param {Array<string>} tableOptions
	 * @return {string}
	 */
	const formatTableOptions = (tableOptions) => {
		const tableOptionsString = tab(tableOptions.join(',\n'));
		if (_.isEmpty(tableOptions)) {
			return tableOptionsString;
		} else {
			return ',\n' + tableOptionsString;
		}
	};

	/**
	 * @param {TableOptions} tableOptions
	 * @param {boolean} ignoreFalsyValue
	 * @return {string}
	 */
	const getTableOptions = ({
		FALLBACK,
		BEFORE_JOURNAL,
		AFTER_JOURNAL,
		DEFAULT_JOURNAL_TABLE,
		FREESPACE,
		TABLE_CHECKSUM,
		LOG,
		MAP,
		USING,
		ISOLATED_LOADING,
		MERGE_BLOCK_RATIO,
		DATA_BLOCK_SIZE,
		BLOCK_COMPRESSION,
		QUEUE_TABLE,
		EXTERNAL_SECURITY,
		AUTHORIZATION_NAME,
	}, ignoreFalsyValue = false) =>  _.flow([
			add(QUEUE_TABLE, 'QUEUE'),
			add(Boolean(MAP), `MAP = ${MAP}${USING ? ` COLOCATE USING ${USING}` : ''}`),
			add(FALLBACK, 'FALLBACK', ignoreFalsyValue ? '' : 'NO FALLBACK'),
			add(Boolean(DEFAULT_JOURNAL_TABLE), `WITH JOURNAL TABLE = ${DEFAULT_JOURNAL_TABLE}`),
			add(LOG, 'LOG', ignoreFalsyValue ? '' : 'NO LOG'),
			add(Boolean(BEFORE_JOURNAL), getJournalingStrategy(BEFORE_JOURNAL, 'BEFORE')),
			add(Boolean(AFTER_JOURNAL), getJournalingStrategy(BEFORE_JOURNAL, 'AFTER')),
			add(Boolean(TABLE_CHECKSUM), `CHECKSUM = ${TABLE_CHECKSUM}`),
			add(Boolean(FREESPACE?.freeSpaceValue), `FREESPACE = ${getFreeSpaceValue(FREESPACE)}`),
			add(Boolean(MERGE_BLOCK_RATIO?.mergeRatio), getMergeBlockRatio(MERGE_BLOCK_RATIO)),
			add(Boolean(DATA_BLOCK_SIZE?.blockSize), getDataBlockSize(DATA_BLOCK_SIZE)),
			add(Boolean(BLOCK_COMPRESSION?.blockCompressionType), getBlockCompression(BLOCK_COMPRESSION)),
			add(Boolean(ISOLATED_LOADING), getIsolatedLoading(ISOLATED_LOADING)),
			add(Boolean(EXTERNAL_SECURITY), `EXTERNAL SECURITY ${EXTERNAL_SECURITY} TRUSTED${AUTHORIZATION_NAME ? ' ' + AUTHORIZATION_NAME : ''}`),
			formatTableOptions,
		])([]);

	const getIndexType = (indexType, unique) => {
		let indexTypeSt = ''
		indexTypeSt += unique ? ' ' : '';
		indexTypeSt += !indexType || indexType === 'SECONDARY' ? 'INDEX' : `${indexType} INDEX`;

		return indexTypeSt;
	};

	const getIndexKeys = (indexKeys = []) => {
		if (_.isEmpty(indexKeys)) {
			return '';
		}

		const dividedKeys = divideIntoActivatedAndDeactivated(
			indexKeys,
			key => `"${key.name}"`,
		);

		if (_.isEmpty(dividedKeys.activatedItems)) {
			return dividedKeys.deactivatedItems.join(', ');
		}

		const commentedKeys = dividedKeys.deactivatedItems.length
			? commentIfDeactivated(dividedKeys.deactivatedItems.join(', '), {
				isActivated: false,
				isPartOfLine: true,
			})
			: '';

		return dividedKeys.activatedItems.join(', ') + commentedKeys;
	};

	const getIndexOptions = ({
		indexMap,
		colocateUsing,
		indexFallback,
		checksum,
		blockCompression,
	}) => _.flow([
			add(indexMap, `MAP = ${indexMap}${colocateUsing ? ` COLOCATE USING ${colocateUsing}` : ''}`),
			add(indexFallback, 'FALLBACK', 'NO FALLBACK'),
			add(checksum, `CHECKSUM = ${checksum}`),
			add(blockCompression, `BLOCKCOMPRESSION = ${blockCompression}`),
			formatTableOptions,
		])([]);

	const getTableInlineIndexStatement = ({
		isActivated,
		unique,
		indexType,
		all,
		indxKey,
		indxName,
		orderBy,
		orderKeys,
		loadIdentity,
	}) => {
		if (_.isEmpty(indxKey)) {
			return '';
		}

		let indexStatement = '';
		indexStatement += unique ? 'UNIQUE' : '';
		indexStatement += getIndexType(indexType, unique);
		indexStatement += indxName ? ` "${indxName}"` : '';
		indexStatement += all ? ' ALL' : '';
		indexStatement += !_.isEmpty(indxKey) ?` ( ${getIndexKeys(indxKey)} )` : '';
		indexStatement += orderBy ? ` ORDER BY ${orderBy}` : '';
		indexStatement += !_.isEmpty(orderKeys) ? ` ( ${getIndexKeys(orderKeys)} )` : '';
		indexStatement += loadIdentity ? ` ${loadIdentity}` : '';

		return commentIfDeactivated(indexStatement, { isActivated });
	};

	const getTableInlineIndexStatements = (tableIndexes) => tableIndexes.map(getTableInlineIndexStatement);

	const findPrimaryIndex = indexes => {
		const primaryIndex = indexes.find(index => ['PRIMARY', 'PRIMARY AMP'].includes(index.indexType) && !_.isEmpty(index.indxKey));
		if (primaryIndex) {
			return primaryIndex;
		}
		return {};
	};

	const filterSecondaryIndexes = indexes => indexes.filter(index =>
		(!index.indexType || index.indexType === 'SECONDARY') && !_.isEmpty(index.indxKey)
	);

	const getPrimaryIndex = _.flow([
			findPrimaryIndex,
			getTableInlineIndexStatement,
		]);

	const getSecondaryIndexes = _.flow([
			filterSecondaryIndexes,
			getTableInlineIndexStatements,
			_.compact,
		]);

	const getPartitionKeys = (compositePartitionKeys) => {
		return compositePartitionKeys.map(key => {
			let keyStatement = ''

			keyStatement += key.columnFormat ? key.columnFormat : '';
			keyStatement += key.name && key.columnFormat ? ` "${key.name}"` : `"${key.name}"`;
			keyStatement += key.autoCompression ? ` ${key.autoCompression}` : '';

			return keyStatement;
		});
	};

	const getPartitions = (partitioning = {}) => {
		let partitionStatement = 'PARTITION BY';
		partitionStatement += partitioning.partitionBy === 'column' ? ' COLUMN' : '';
		partitionStatement += partitioning.partitioningExpression ? ` ${partitioning.partitioningExpression}` : '';
		partitionStatement += partitioning.compositePartitionKey ? ` (\n\t${getPartitionKeys(partitioning.compositePartitionKey).join(',\n\t')}\n)` : '';

		return partitionStatement;
	};

	const getInlineTableIndexes = (tableData) => {
		const primaryIndex = getPrimaryIndex(tableData.tableIndexes || []);
		const partitions = _.isEmpty(tableData.partitioning.partitioningExpression) && _.isEmpty(tableData.partitioning.compositePartitionKey)
			? ''
			: getPartitions(tableData.partitioning)
		const secondaryIndexes = getSecondaryIndexes(tableData.tableIndexes || []);

		if (!primaryIndex && !partitions && _.isEmpty(secondaryIndexes)) {
			return '';
		}

		let primaryIndexStatement = '';
		primaryIndexStatement += primaryIndex ? primaryIndex : '';
		primaryIndexStatement += partitions ? '\n' + partitions : '';

		return '\n' + tab([ primaryIndexStatement, ...secondaryIndexes ].filter(Boolean).join(',\n'));
	};

	const getUsingOptions = ({
		location,
		scanPercentage,
		pathPattern,
		manifest,
		tableFormat,
		rowFormat,
		storedAs,
		header,
		stripSpaces,
		stripEnclosingChar,
	}) => {
		return _.flow([
			add(location, `LOCATION ( '${location}' )`),
			add(scanPercentage, `SCANPCT = '${scanPercentage}'`),
			add(pathPattern, `PATHPATTERN ( '${pathPattern}' )`),
			add(manifest, 'MANIFEST ( \'TRUE\' )', 'MANIFEST ( \'FALSE\' )'),
			add(tableFormat, `TABLE_FORMAT ( '${tableFormat}' )`),
			add(rowFormat, `ROWFORMAT ( '${rowFormat}' )`),
			add(storedAs, `STOREDAS ( '${storedAs}' )`),
			add(header, 'HEADER ( \'TRUE\' )', 'STRIP_EXTERIOR_SPACES ( \'FALSE\' )'),
			add(stripSpaces, 'STRIP_EXTERIOR_SPACES ( \'TRUE\' )', 'STRIP_EXTERIOR_SPACES ( \'FALSE\' )'),
			add(stripEnclosingChar, `STRIP_ENCLOSING_CHAR ( '${stripEnclosingChar}' )`),
			(options) => tab(options.join('\n\t'))
		])([]);
	}

	return {
		getTableOptions,
		getUsingOptions,
		getInlineTableIndexes,
		getIndexOptions,
		getIndexKeys,
	};

}

