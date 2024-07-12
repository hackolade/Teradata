module.exports = (_, clean) => {
	const mapProperties = (jsonSchema, iteratee) => {
		return Object.entries(jsonSchema.properties).map(iteratee);
	};

	const isUniqueKey = column => {
		if (column.compositeUniqueKey) {
			return false;
		} else if (!column.unique) {
			return false;
		} else {
			return true;
		}
	};

	const isPrimaryKey = column => {
		if (column.compositeUniqueKey) {
			return false;
		} else if (column.compositePrimaryKey) {
			return false;
		} else if (!column.primaryKey) {
			return false;
		} else {
			return true;
		}
	};

	const isInlineUnique = column => {
		return isUniqueKey(column) && _.isEmpty(column.uniqueKeyConstraintName);
	};

	const isInlinePrimaryKey = column => {
		return isPrimaryKey(column) && _.isEmpty(column.primaryKeyConstraintName);
	};

	const hydrateKeyConstraintOptions = (constraintName, constraintType, columnName, isActivated) =>
		clean({
			keyType: constraintType,
			name: constraintName,
			columns: [
				{
					name: columnName,
					isActivated: isActivated,
				},
			],
		});

	const findName = (keyId, properties) => {
		return Object.keys(properties).find(name => properties[name].GUID === keyId);
	};

	const checkIfActivated = (keyId, properties) => {
		return _.get(
			Object.values(properties).find(prop => prop.GUID === keyId),
			'isActivated',
			true,
		);
	};

	const getKeys = (keys, jsonSchema) => {
		return _.map(keys, key => {
			return {
				name: findName(key.keyId, jsonSchema.properties),
				isActivated: checkIfActivated(key.keyId, jsonSchema.properties),
			};
		});
	};

	const getCompositePrimaryKeys = jsonSchema => {
		if (!Array.isArray(jsonSchema.primaryKey)) {
			return [];
		}

		return jsonSchema.primaryKey
			.filter(primaryKey => !_.isEmpty(primaryKey.compositePrimaryKey))
			.map(primaryKey => ({
				...hydrateKeyConstraintOptions(primaryKey.constraintName, 'PRIMARY KEY', null, jsonSchema),
				columns: getKeys(primaryKey.compositePrimaryKey, jsonSchema),
			}));
	};

	const getCompositeUniqueKeys = jsonSchema => {
		if (!Array.isArray(jsonSchema.uniqueKey)) {
			return [];
		}

		return jsonSchema.uniqueKey
			.filter(uniqueKey => !_.isEmpty(uniqueKey.compositeUniqueKey))
			.map(uniqueKey => ({
				...hydrateKeyConstraintOptions(uniqueKey.constraintName, 'UNIQUE', null, jsonSchema),
				columns: getKeys(uniqueKey.compositeUniqueKey, jsonSchema),
			}));
	};

	const getTableKeyConstraints = jsonSchema => {
		if (!jsonSchema.properties) {
			return [];
		}

		const primaryKeyConstraints = mapProperties(jsonSchema, ([name, schema]) => {
			if (!isPrimaryKey(schema) || _.isEmpty(schema.primaryKeyConstraintName)) {
				return;
			}

			return hydrateKeyConstraintOptions(
				schema.primaryKeyConstraintName,
				'PRIMARY KEY',
				name,
				schema.isActivated,
			);
		}).filter(Boolean);

		const uniqueKeyConstraints = _.flatten(
			mapProperties(jsonSchema, ([name, schema]) => {
				if (!isUniqueKey(schema) || _.isEmpty(schema.uniqueKeyConstraintName)) {
					return;
				}

				return hydrateKeyConstraintOptions(schema.uniqueKeyConstraintName, 'UNIQUE', name, schema.isActivated);
			}),
		).filter(Boolean);

		return [
			...primaryKeyConstraints,
			...getCompositePrimaryKeys(jsonSchema),
			...uniqueKeyConstraints,
			...getCompositeUniqueKeys(jsonSchema),
		];
	};

	return {
		getTableKeyConstraints,
		isInlineUnique,
		isInlinePrimaryKey,
	};
};
