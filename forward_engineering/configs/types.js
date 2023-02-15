module.exports = {
    BYTEINT: {
        capacity: 1,
    },
    SMALLINT: {
        capacity: 2,
    },
    INT: {
        capacity: 4,
    },
    INTEGER: {
        capacity: 4,
    },
    BIGINT: {
        capacity: 8,
    },
    DECIMAL: {
        mode: 'decimal',
    },
    DEC: {
        mode: 'decimal',
    },
    NUMERIC: {
        mode: 'decimal',
    },
    FLOAT: {
        capacity: 4,
        mode: 'float',
    },
    'DOUBLE PRECISION': {
        capacity: 8,
        mode: 'float',
    },
    REAL: {
        capacity: 8,
        mode: 'float',
    },
    NUMBER: {
        mode: 'number',
    },
    CHAR: {
        mode: 'char',
    },
    CHARACTER: {
        mode: 'char',
    },
    VARCHAR: {
        mode: 'varchar',
    },
    'CHAR VARYING': {
        mode: 'varchar',
    },
    'CHARACTER VARYING': {
        mode: 'varchar',
    },
    'LONG VARCHAR': {
        mode: 'long varchar',
    },
    VARGRAPHIC: {
        mode: 'vargraphic',
    },
    'LONG VARGRAPHIC': {
        mode: 'long vargraphic',
    },
    CLOB: {
        mode: 'clob',
    },
    'CHARACTER LARGE OBJECT': {
        mode: 'clob',
    },
    BYTE: {
        mode: 'byte',
    },
    VARBYTE: {
        mode: 'varbyte',
    },
    BLOB: {
        mode: 'blob',
    },
    DATE: {
        format: 'YYYY-MM-DD',
    },
    TIME: {
        format: 'hh:mm:ss',
    },
    TIMESTAMP: {
        format: 'YYYY-MM-DD hh:mm:ss',
    },
    ST_Geometry: {
        mode: 'ST_Geometry',
    },
    MBR: {
        mode: 'MBR',
    },
    MBB: {
        mode: 'MBB',
    },
    JSON: {},
    XML: {},
    XMLTYPE: {},
    DATASET: {},
    PERIOD: {},
    'INTERVAL YEAR': {},
    'INTERVAL MONTH': {},
    'INTERVAL DAY': {},
    'INTERVAL HOUR': {},
    'INTERVAL MINUTE': {},
    'INTERVAL SECOND': {}
};
