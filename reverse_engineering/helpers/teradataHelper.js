const getIndexType = (rawIndexType) => {
    switch (true) {
        case rawIndexType.includes('primary index'):
            return 'PRIMARY';
        case rawIndexType.includes('secondary index'):
            return 'SECONDARY';
        case rawIndexType.includes('hash index'):
            return 'HASH';
        case rawIndexType.includes('join index'):
            return 'JOIN';
    }
};

const getIndexKeys = (rawIndexKeys = '') => {
    return rawIndexKeys.split(', ').map(key => ({
        name: key,
        type: ''
    }));
};

const maintainAllRawIdPointers = (rawIndexType) => {
    return rawIndexType.includes('all');
};

const parseTableIndexes = (tableName, indexes) => {
    const tableIndexes = indexes.filter(index => index.tableName === tableName);
    return tableIndexes.map(index => ({
        indxName: index.indxName,
        indexType: getIndexType(index.indexType),
        unique: index.unique === 'Unique',
        all: maintainAllRawIdPointers(index.indexType),
        indxKey: getIndexKeys(index.indxKey),
    }));
}

module.exports = {
    parseTableIndexes,
};