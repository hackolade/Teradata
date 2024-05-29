/**
 * @param {AdditionalDdlOptions} additionalOptions
 * @return {AdditionalOptionsObject}
 */
const getAdditionalOptions = additionalOptions => {
	if (!Array.isArray(additionalOptions)) {
		return {};
	}

	return additionalOptions.reduce((result, option) => {
		return {
			...result,
			[option.id]: option.value,
		};
	}, {});
};

module.exports = getAdditionalOptions;
