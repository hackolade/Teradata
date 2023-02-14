module.exports = ({
	  _,
	  tab,
	  getJournalingStrategy,
	  commentIfDeactivated,
	  divideIntoActivatedAndDeactivated
	}) => {

	const getFreeSpaceValue = (freespace) => {
		if (freespace.percentUnit) {
			return `${freespace.freeSpaceValue} PERCENT`;
		} else {
			return freespace.freeSpaceValue;
		}
	};

	const getMergeBlockRatio = ({
		mergeRatio,
		specificRatio,
		percentUnit,
	}) => {
		if (mergeRatio === 'SPECIFIC' && specificRatio) {
			const percentStatement = percentUnit ? 'PERCENT' : '';
			return `MERGEBLOCKRATIO = ${specificRatio} ${percentStatement}`;
		}

		return `${mergeRatio} MERGEBLOCKRATIO`;
	};

	const getDataBlockSize = ({
		blockSize,
		specificSize,
		units,
	}) => {
		if (blockSize === 'SPECIFIC' && specificSize) {
			const unitsType = units ? ` ${units}` : '';
			return blockSize + unitsType;
		}

		return `${blockSize} DATABLOCKSIZE`;
	};

	const getBlockCompressionLevel = (blockCompressionLevel, specificBlockCompressionLevel) => {
		if (blockCompressionLevel === 'SPECIFIC' && specificBlockCompressionLevel) {
			return `BLOCKCOMPRESSIONLEVEL = ${specificBlockCompressionLevel}`
		}

		return `BLOCKCOMPRESSIONLEVEL = ${blockCompressionLevel}`;
	};

	const getBlockCompression = ({
		blockCompressionType,
		blockCompressionAlgorithm,
		blockCompressionLevel,
		specificBlockCompressionLevel
	}) => _.flow([
			add(blockCompressionType, `BLOCKCOMPRESSION = ${blockCompressionType}`),
			add(blockCompressionType, `BLOCKCOMPRESSIONALGORITHM = ${blockCompressionAlgorithm}`),
			add(blockCompressionLevel, getBlockCompressionLevel(blockCompressionLevel, specificBlockCompressionLevel)),
		])([]);

	const getIsolatedLoading = (isolatedLoading) => {
		if (['NO', 'CONCURRENT'].includes(isolatedLoading)) {
			return `WITH ${isolatedLoading} ISOLATED LOADING`
		}

		return `WITH ISOLATED LOADING ${isolatedLoading}`;
	};

	const add = (condition, value, falsyValue = false) => (tableOptions) => {
		if (condition) {
			return _.flatten([ ...tableOptions, value ]);
		} else if (falsyValue) {
			return [ ...tableOptions, falsyValue ];
		}

		return tableOptions;
	}

	const formatTableOptions = (tableOptions) => {
		const tableOptionsString = tab(tableOptions.join(',\n'));
		if (_.isEmpty(tableOptions)) {
			return tableOptionsString;
		} else {
			return ',\n' + tableOptionsString;
		}
	};

	const getTableOptions = ({
		fallback,
		beforeJournaling,
		afterJournaling,
		defaultJournalTable,
		freespace,
		checksum,
		log,
		tableMap,
		colocateUsing,
		isolatedLoading,
		mergeBlockRatio,
		dataBlockSize,
		blockCompression,
		queueTable,
		externalSecurity,
		authorizationName,
	}) =>  _.flow([
			add(queueTable, 'QUEUE'),
			add(tableMap, `MAP = ${tableMap}${colocateUsing ? ` COLOCATE USING ${colocateUsing}` : ''}`),
			add(fallback, 'FALLBACK', 'NO FALLBACK'),
			add(defaultJournalTable, `WITH JOURNAL TABLE = ${defaultJournalTable}`),
			add(log, 'LOG', 'NO LOG'),
			add(beforeJournaling, getJournalingStrategy(beforeJournaling, 'BEFORE')),
			add(afterJournaling, getJournalingStrategy(beforeJournaling, 'AFTER')),
			add(checksum, `CHECKSUM = ${checksum}`),
			add(freespace.freeSpaceValue, `FREESPACE = ${getFreeSpaceValue(freespace)}`),
			add(mergeBlockRatio.mergeRatio, getMergeBlockRatio(mergeBlockRatio)),
			add(dataBlockSize.blockSize, getDataBlockSize(dataBlockSize)),
			add(blockCompression.blockCompressionType, getBlockCompression(blockCompression)),
			add(isolatedLoading, getIsolatedLoading(isolatedLoading)),
			add(externalSecurity, `EXTERNAL SECURITY ${externalSecurity} TRUSTED${authorizationName ? ' ' + authorizationName : ''}`),
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

