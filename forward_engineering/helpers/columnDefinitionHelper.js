module.exports = (_) => {
	const addLength = (type, length) => {
		return `${type}(${length})`;
	};

	const addChildType = (type, childType) => addLength(type, childType);

	const addPrecision = (type, precision) => {
		return `${type}(${precision})`;
	};

	const addScalePrecision = (type, precision, scale) => {
		if (_.isNumber(scale)) {
			return `${type}(${precision},${scale})`;
		} else {
			return addPrecision(type, precision);
		}
	};

	const addTimezonePrecision = (type, precision, timezone) => {
		if (timezone) {
			return `${addPrecision(type, precision)} WITH TIME ZONE`;
		} else {
			return addPrecision(type, precision);
		}
	};

	const addPrecisionAndToPrecision = (type, precision, toPrecision, fractSecPrecision) => {
		let typeStatement = type;
		typeStatement += precision ? `(${precision})` : '';
		typeStatement += toPrecision ? ` TO ${toPrecision}` : '';
		typeStatement += fractSecPrecision ? `(${fractSecPrecision})` : '';

		return typeStatement;
	};

	const canHaveLength = type => ['VARCHAR', 'CHAR VARYING', 'CHARACTER VARYING', 'VARGRAPHIC', 'CLOB', 'CHARACTER LARGE OBJECT', 'BYTE', 'VARBYTE', 'BLOB', 'ARRAY', 'JSON', 'XML', 'XMLTYPE', 'ST_GEOMETRY'].includes(type);

	const canHavePrecisionAndScale = type =>
		[ 'DECIMAL', 'DEC', 'NUMERIC', 'NUMBER' ].includes(type);

	const canHavePrecisionAndToPrecision = (type) => ['INTERVAL YEAR', 'INTERVAL DAY', 'INTERVAL HOUR', 'INTERVAL MINUTE'].includes(type);

	const canHavePrecisionAndSecondPrecision = (type) => ['INTERVAL SECOND'].includes(type);

	const canHaveFractionalSecondPrecision = type => ['TIME', 'TIMESTAMP'].includes(type);

	const canHaveChildType = type => ['PERIOD'].includes(type);

	const decorateType = (type, columnDefinition) => {
		type = _.toUpper(type);

		if (canHaveChildType(type)) {
			const childValueType = decorateType(columnDefinition.childValueType, columnDefinition);
			return addChildType(type, childValueType);
		} else if (canHaveLength(type) && _.isNumber(columnDefinition.length)) {
			return addLength(type, columnDefinition.length);
		} else if (canHavePrecisionAndToPrecision(type)) {
			return addPrecisionAndToPrecision(type, columnDefinition.precision, columnDefinition.toPrecision, columnDefinition.fractSecPrecision);
		} else if (canHavePrecisionAndSecondPrecision(type)) {
			return addScalePrecision(type, columnDefinition.precision, columnDefinition.fractSecPrecision);
		} else if (canHavePrecisionAndScale(type) && _.isNumber(columnDefinition.precision)) {
			return addScalePrecision(type, columnDefinition.precision, columnDefinition.scale);
		} else if (canHaveFractionalSecondPrecision(type) && _.isNumber(columnDefinition.fractSecPrecision)) {
			return addTimezonePrecision(type, columnDefinition.fractSecPrecision, columnDefinition.timezone);
		}

		return type;
	};

	return {
		decorateType,
	}
}
