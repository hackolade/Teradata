const regexConfig = require('./teradataRegexConfig');
const { parseFieldType } = require('./typeHelper');

const parseFieldRow = row => {
	const matchResult = regexConfig.udtField.exec(row);

	if (!matchResult || !matchResult.groups) {
		return;
	}

	const fieldType = parseFieldType(matchResult.groups.type);

	return {
		name: matchResult.groups.name,
		...fieldType,
	};
};

const parseUdtFields = fieldsStatement => {
	return fieldsStatement.split(/,[\n\r]/).map(parseFieldRow);
};

const parseStructuredUdt = udt => {
	const matchResult = regexConfig.createStructuredUdt.exec(udt.createStatement);

	if (!matchResult || !matchResult.groups) {
		return {};
	}

	return {
		name: matchResult.groups.name.toLowerCase(),
		childType: 'object',
		type: 'document',
		methodSpecification: matchResult.groups.methodSpecification,
		properties: parseUdtFields(matchResult.groups.columns),
	};
};

const parseArrayUdt = udt => {
	const matchResult = regexConfig.createArrayUdt.exec(udt.createStatement);

	if (!matchResult || !matchResult.groups) {
		return {};
	}

	return {
		name: matchResult.groups.name.toLowerCase(),
		childType: 'array',
		type: 'array',
		default: matchResult.groups.default,
		length: Number(matchResult.groups.arrayLength),
		properties: [
			{
				name: 0,
				...parseFieldType(matchResult.groups.childType),
			},
		],
	};
};

const parseDistinctUdt = udt => {
	const matchResult = regexConfig.createDistinctUdt.exec(udt.createStatement);

	if (!matchResult || !matchResult.groups) {
		return {};
	}

	return {
		...parseFieldType(matchResult.groups.childType),
		name: matchResult.groups.name.toLowerCase(),
		methodSpecification: matchResult.groups.methodSpecification,
	};
};
const parseUdt = udt => {
	if (regexConfig.createStructuredUdt.test(udt.createStatement)) {
		return parseStructuredUdt(udt);
	} else if (regexConfig.createArrayUdt.test(udt.createStatement)) {
		return parseArrayUdt(udt);
	} else if (regexConfig.createDistinctUdt.test(udt.createStatement)) {
		return parseDistinctUdt(udt);
	}
};
const convertToJsonSchema = udts => {
	return udts.reduce((convertedUdt, udt) => {
		if (udt.properties) {
			return {
				...convertedUdt,
				[udt.name]: {
					...udt,
					properties: convertToJsonSchema(udt.properties),
				},
			};
		}

		return {
			...convertedUdt,
			[udt.name]: udt,
		};
	}, {});
};

const parseUserDefinedTypes = userDefinedTypes => {
	return convertToJsonSchema(userDefinedTypes.map(parseUdt));
};

module.exports = {
	parseUserDefinedTypes,
};
