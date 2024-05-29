module.exports = ({
	_,
	commentIfDeactivated,
	checkAllKeysDeactivated,
	divideIntoActivatedAndDeactivated,
	assignTemplates,
}) => {
	const foreignKeysToString = keys => {
		if (Array.isArray(keys)) {
			const activatedKeys = keys
				.filter(key => _.get(key, 'isActivated', true))
				.map(key => `"${_.trim(key.name)}"`);
			const deactivatedKeys = keys
				.filter(key => !_.get(key, 'isActivated', true))
				.map(key => `"${_.trim(key.name)}"`);
			const deactivatedKeysAsString = deactivatedKeys.length
				? commentIfDeactivated(deactivatedKeys, { isActivated: false, isPartOfLine: true })
				: '';

			return activatedKeys.join(', ') + deactivatedKeysAsString;
		}
		return keys;
	};

	const foreignActiveKeysToString = keys => {
		return keys.map(key => _.trim(key.name)).join(', ');
	};
	const generateConstraintsString = (dividedConstraints, isParentActivated) => {
		const deactivatedItemsAsString = commentIfDeactivated(
			(dividedConstraints?.deactivatedItems || []).join(',\n\t\t'),
			{
				isActivated: !isParentActivated,
				isPartOfLine: true,
			},
		);
		const activatedConstraints = dividedConstraints?.activatedItems?.length
			? ',\n\t\t' + dividedConstraints.activatedItems.join(',\n\t\t')
			: '';

		const deactivatedConstraints = dividedConstraints?.deactivatedItems?.length
			? '\n\t\t' + deactivatedItemsAsString
			: '';

		return activatedConstraints + deactivatedConstraints;
	};
	const createKeyConstraint = (templates, isParentActivated) => keyData => {
		const columnMapToString = ({ name }) => `"${name}"`;

		const isAllColumnsDeactivated = checkAllKeysDeactivated(keyData.columns);
		const dividedColumns = divideIntoActivatedAndDeactivated(keyData.columns, columnMapToString);
		const deactivatedColumnsAsString = dividedColumns?.deactivatedItems?.length
			? commentIfDeactivated(dividedColumns.deactivatedItems.join(', '), {
					isActivated: false,
					isPartOfLine: true,
				})
			: '';

		const columns =
			!isAllColumnsDeactivated && isParentActivated
				? ' (' + dividedColumns.activatedItems.join(', ') + deactivatedColumnsAsString + ')'
				: ' (' + keyData.columns.map(columnMapToString).join(', ') + ')';

		return {
			statement: assignTemplates(templates.createKeyConstraint, {
				constraintName: keyData.name ? `"${_.trim(keyData.name)}" ` : '',
				constraintType: keyData.keyType,
				columns,
			}),
			isActivated: !isAllColumnsDeactivated,
		};
	};

	return {
		generateConstraintsString,
		foreignKeysToString,
		foreignActiveKeysToString,
		createKeyConstraint,
	};
};
