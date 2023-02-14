const regexConfig = require("./teradataRegexConfig");

const getModeByNumericType = (typeName) => {
    switch (typeName.toUpperCase()) {
        case 'BYTEINT':
            return 'byteint';
        case 'SMALLINT':
            return 'smallint';
        case 'INT':
        case 'INTEGER':
            return 'int';
        case 'BIGINT':
            return 'bigint';
        case 'DEC':
        case 'DECIMAL':
        case 'NUMERIC':
            return 'decimal';
        case 'FLOAT':
        case 'REAL':
        case 'DOUBLE PRECISION':
            return 'float';
        case 'NUMBER':
            return 'number';
        default: return 'int';
    }
};
const parseNumeric = (type) => {
    const { typeName, precision, scale } = regexConfig.numeric.exec(type).groups;

    return {
        type: 'numeric',
        childType: 'numeric',
        mode: getModeByNumericType(typeName),
        ...(precision && { precision: Number(precision) }),
        ...(scale && { scale: Number(scale) }),
    }
};

const getModeByCharType = typeName => {
    switch (typeName.toUpperCase()) {
        case 'CHAR':
        case 'CHARACTER':
            return 'char';
        case 'VARCHAR':
        case 'CHAR VARYING':
        case 'CHARACTER VARYING':
            return 'varchar';
        case 'LONG VARCHAR':
            return 'long varchar';
        case 'VARGRAPHIC':
            return 'vargraphic';
        case 'LONG VARGRAPHIC':
            return 'long vargraphic';
        case 'CLOB':
        case 'CHARACTER LARGE OBJECT':
            return 'clob';
        default: return 'char'
    }
};

const parseChar = (type) => {
    const { typeName, length, characterSet } = regexConfig.char.exec(type).groups;

    return {
        type: 'string',
        childType: 'char',
        mode: getModeByCharType(typeName),
        ...(characterSet && { characterSet: characterSet.toUpperCase() }),
        ...(length && { length: Number(length) }),
    }
};

const getModeByBinaryType = typeName => {
    switch (typeName.toUpperCase()) {
        case 'BYTE':
            return 'byte';
        case 'VARBYTE':
            return 'varbyte';
        case 'BLOB':
            return 'blob';
        default: return 'byte'
    }
};

const parseBinary = (type) => {
    const { typeName, length } = regexConfig.byte.exec(type).groups;

    return {
        type: 'binary',
        childType: 'byte',
        mode: getModeByBinaryType(typeName),
        ...(length && { length: Number(length) }),
    }
};

const getModeByDatetimeType = (typeName) => {
    switch (typeName.toUpperCase()) {
        case 'DATE':
            return 'date';
        case 'TIME':
            return 'time';
        case 'TIMESTAMP':
            return 'timestamp';
        default: return 'date'
    }
};
const parseDatetime = (type) => {
    const { typeName, precision, withTimeZone } = regexConfig.datetime.exec(type).groups;

    return {
        type: 'string',
        childType: 'datetime',
        mode: getModeByDatetimeType(typeName),
        ...(precision && { fractSecPrecision: Number(precision) }),
        ...(withTimeZone && { timezone: withTimeZone.toUpperCase() }),
    }
};

const parsePeriod = (type) => {
    const { nestedType } = regexConfig.period.exec(type).groups;
    const nestedTypeData = parseDatetime(nestedType);

    return {
        type: 'string',
        childType: 'period',
        childValueType: nestedTypeData.mode,
        ...(nestedTypeData.fractSecPrecision && { fractSecPrecision: nestedTypeData.fractSecPrecision }),
        ...(nestedTypeData.timezone && { timezone: nestedTypeData.timezone }),
    }
};
const parseInterval = (type) => {
    const {typeName, precision, secondPrecision, toPeriod, toSecondPrecision} = regexConfig.interval.exec(type).groups;

    return {
        type: 'string',
        childType: 'interval',
        subtype: typeName.toLowerCase(),
        ...(precision && { precision }),
        ...(toPeriod && { toPrecision: toPeriod.toUpperCase() }),
        ...((secondPrecision || toSecondPrecision) && { fractSecPrecision: Number(secondPrecision || toSecondPrecision) })
    };
};
const getModeByGeospatialType = (typeName) => {
    switch (typeName.toUpperCase()) {
        case 'ST_GEOMETRY':
            return 'ST_Geometry';
        case 'MBR':
            return 'MBR';
        case 'MBB':
            return 'MBB';
        default: return 'ST_Geometry'
    }
};

const isGeoType = typeName => ['ST_GEOMETRY', 'MBR', 'MBB'].includes(typeName.toUpperCase());
const parsePredefinedUdt = (type) => {
    const {typeName, length, inlineLength, characterSet} = regexConfig.predefinedUdt.exec(type).groups;
    const typeDescriptors = {
        ...(characterSet && { characterSet: characterSet.toUpperCase() }),
        ...(length && { length: Number(length) }),
        ...(inlineLength && { inlineLength: Number(inlineLength) }),
    };

    if (isGeoType(typeName)) {
        return {
            type: 'string',
            childType: 'geospatial',
            mode: getModeByGeospatialType(typeName),
            ...typeDescriptors,
        };
    } else if (typeName.toUpperCase() === 'JSON') {
        return {
            type: 'jsonObject',
            childType: 'json',
            subtype: 'json',
            ...typeDescriptors
        }
    } else if (typeName.toUpperCase() === 'XML') {
        return {
            type: 'binary',
            childType: 'xml',
            ...typeDescriptors,
        }
    }
};

const createReferenceToUdt = (type) => {
    const cleanTypeName = type.replace(/^SYSUDTLIB\./i, '').toLowerCase();
    return {
        refType: 'model',
        $ref: `#model/definitions/${cleanTypeName}`,
    }
};

const parseFieldType = (type) => {
    if (regexConfig.numeric.test(type)) {
        return parseNumeric(type);
    } else if (regexConfig.char.test(type)) {
        return parseChar(type);
    } else if (regexConfig.byte.test(type)) {
        return parseBinary(type);
    } else if (regexConfig.datetime.test(type)) {
        return parseDatetime(type);
    } else if (regexConfig.period.test(type)) {
        return parsePeriod(type);
    } else if (regexConfig.interval.test(type)) {
        return parseInterval(type);
    } else if (regexConfig.predefinedUdt.test(type)) {
        return parsePredefinedUdt(type);
    } else {
        return createReferenceToUdt(type);
    }
};

module.exports = {
    parseFieldType,
};