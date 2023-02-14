const regexConfig = require("./teradataRegexConfig");

const cleanKeyName = (name = '') => {
    return name.replace(/^("|,|\s+)+|("|,|\s+)+$/gmi, '')
};
const parseIndexKeys = (statement) => {
    const mathResult = statement.match(regexConfig.indexKeyName);
    if (!mathResult || !mathResult.length) {
        return [];
    }

    return mathResult.map(cleanKeyName);
};

const parseHashIndexStatement = (statement) => {
    const matchResult = regexConfig.createHashIndex.exec(statement);
    if (!matchResult || !matchResult.groups) {
        return {};
    }

    return {
        indexMap: matchResult.groups.map,
        colocateUsing: matchResult.groups.colocationName,
        indexFallback: matchResult.groups.fallback,
        checksum: matchResult.groups.checksum,
        blockCompression: matchResult.groups.blockCompression,
        indxKey: parseIndexKeys(matchResult.groups.indexColumns),
        orderBy: matchResult.groups.orderByType,
        orderKeys: parseIndexKeys(matchResult.groups.orderByColumns)
    }
};

const parseJoinIndexStatement = (statement) => {
    const matchResult = regexConfig.createJoinIndex.exec(statement);
    if (!matchResult || !matchResult.groups) {
        return {};
    }

    return {
        indexMap: matchResult.groups.map,
        colocateUsing: matchResult.groups.colocationName,
        indexFallback: matchResult.groups.fallback,
        checksum: matchResult.groups.checksum,
        blockCompression: matchResult.groups.blockCompression,
        asSelect: matchResult.groups.selectStatement,
    }
};

const parseIndexStatement = (index) => {
    let parsedOptions = {};
    if (index.indexType === 'HASH') {
        parsedOptions = parseHashIndexStatement(index.createStatement);
    } else {
        parsedOptions = parseJoinIndexStatement(index.createStatement);
    }

    return {
        ...index,
        ...parsedOptions,
    };
};

const parseTableIndexes = (tableName, indexes) => {
    return indexes
        .filter(index => index.tableName === tableName)
        .map(parseIndexStatement);
};

module.exports = {
    parseTableIndexes,
};