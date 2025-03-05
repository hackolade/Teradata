/**
 * @typedef {import('./types').ColumnDefinition} ColumnDefinition
 * @typedef {import('./types').ConstraintDto} ConstraintDto
 * @typedef {import('./types').JsonSchema} JsonSchema
 */
const { identity, toLower, toUpper } = require('lodash');

const types = require('./configs/types');
const defaultTypes = require('./configs/defaultTypes');
const getKeyHelper = require('./helpers/keyHelper');
const columnDefinitionHelper = require('./helpers/columnDefinitionHelper');

class DbtProvider {
	/**
	 * @returns {DbtProvider}
	 */
	static createDbtProvider() {
		return new DbtProvider();
	}

	/**
	 * @param {string} type
	 * @returns {string | undefined}
	 */
	getDefaultType(type) {
		return defaultTypes[type];
	}

	/**
	 * @returns {Record<string, object>}
	 */
	getTypesDescriptors() {
		return types;
	}

	/**
	 * @param {string} type
	 * @returns {boolean}
	 */
	hasType(type) {
		return Object.keys(types).map(toLower).includes(toLower(type));
	}

	/**
	 * @param {{ columnDefinition: ColumnDefinition }}
	 * @returns {{ type: string; }}
	 */
	decorateType({ type, columnDefinition }) {
		return columnDefinitionHelper.decorateType(toUpper(type), columnDefinition);
	}

	/**
	 * @param {{ jsonSchema: JsonSchema }}
	 * @returns {ConstraintDto[]}
	 */
	getCompositeKeyConstraints({ jsonSchema }) {
		const keyHelper = getKeyHelper(identity);
		const compositePrimaryKeys = keyHelper.getCompositePrimaryKeys(jsonSchema);
		const compositeUniqueKeys = keyHelper.getCompositeUniqueKeys(jsonSchema);

		return [...compositePrimaryKeys, ...compositeUniqueKeys];
	}

	/**
	 * @param {{ columnDefinition: ColumnDefinition; jsonSchema: JsonSchema }}
	 * @returns {ConstraintDto[]}
	 */
	getColumnConstraints({ columnDefinition, jsonSchema }) {
		const keyHelper = getKeyHelper(identity);

		return keyHelper.getColumnConstraints({ columnDefinition, jsonSchema });
	}
}

module.exports = DbtProvider;
