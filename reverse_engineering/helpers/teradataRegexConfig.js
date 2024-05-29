const teradataRegexConfig = {
	createHashIndex:
		/^CREATE\s+HASH\s+INDEX\s(?<indexName>'[\s\S]+?'|[${}'. \w-]+)(?:(?:\s+,|,\s+|\s+|,)(?<fallback>(?:NO\s+)?FALLBACK(?:\s+PROTECTION)?))?(?:(?:\s+,|,\s+|\s+|,)CHECKSUM\s+?=\s+?(?<checksum>OFF|DEFAULT|ON))?(?:(?:\s+,|,\s+|\s+|,)MAP\s+?=\s+?(?<map>[\s\S]+?)(?:\s+COLOCATE\s+USING\s+(?<colocationName>[\s\S]+?))?)?(?:(?:\s+,|,\s+|\s+|,)BLOCKCOMPRESSION\s+?=\s+?(?<blockCompression>AUTOTEMP|DEFAULT|MANUAL|NEVER))?\s+?\((?<indexColumns>.*)\)\s+ON\s+(?<tableName>'[\s\S]+?'|[${}'. \w-]+)(?:\s+BY\s+\(.*\))?(?:\s+ORDER\s+BY(?<orderByType>\s+HASH|\s+VALUES)?\s+\((?<orderByColumns>.*)\))?\s+?;$/im,
	createJoinIndex:
		/^CREATE\s+JOIN\s+INDEX\s(?<indexName>(?:[`"'][\s\S]+?[`"'])|\S+?)(?:(?:\s+,|,\s+|\s+|,)(?<fallback>(?:NO\s+)?FALLBACK(?:\s+PROTECTION)?))?(?:(?:\s+,|,\s+|\s+|,)CHECKSUM\s+?=\s+?(?<checksum>OFF|DEFAULT|ON))?(?:(?:\s+,|,\s+|\s+|,)MAP\s+?=\s+?(?<map>[\s\S]+?)(?:\s+COLOCATE\s+USING\s+(?<colocationName>[\s\S]+?))?)?(?:(?:\s+,|,\s+|\s+|,)BLOCKCOMPRESSION\s+?=\s+?(?<blockCompression>AUTOTEMP|DEFAULT|MANUAL|NEVER))?\s+AS\s+(?<selectStatement>SELECT[\s\S]*);$/im,
	indexKeyName: /^(")(?:(?=(\\?))\2.)*?\1|\S+/i,
	createDistinctUdt:
		/^CREATE\s+TYPE\s+(?:SYSUDTLIB.)?(?<name>[`"'][\s\S]+?[`"']|\S+?)\s+AS\s+(?<childType>[\s\S]+)\sFINAL(?<methodSpecification>(?:CONSTRUCTOR|INSTANCE)\s*METHOD\s+[\s\S]+)?\s*?;$/im,
	createStructuredUdt:
		/^CREATE\s+TYPE\s+(?:SYSUDTLIB.)?(?<name>[`"'][\s\S]+?[`"']|\S+?)\s+AS\s+\((?<columns>[\s\S()]*)\)(?:\s+)?(?<final>NOT\s+FINAl)?\s*(?<methodSpecification>(?:CONSTRUCTOR|INSTANCE)\s*METHOD\s+[\s\S]+)?\s*?;$/im,
	createArrayUdt:
		/^CREATE\s+TYPE\s+(?:SYSUDTLIB.)?(?<name>[`"'][\s\S]+?[`"']|\S+?)\s+AS\s+(?<childType>[\s\S]+)\s+ARRAY(?:\s*?\[(?<arrayLength>\d+)\])?\s+(?:DEFAULT\s+(?<default>NULL))?\s*?;$/im,
	udtField: /\b(?<name>[`"'][\s\S]+?[`"']|\S+?)\s+(?<type>[\s\S\(\)]+)/i,

	//db types
	numeric:
		/\b(?<typeName>BYTEINT|SMALLINT|INTEGER|INT|BIGINT|DECIMAL|DEC|NUMERIC|FLOAT|REAL|DOUBLE\s+PRECISION|NUMBER)\s*(?:\((?<precision>-?[0-9]+|\*)+(?:\s*,\s*(?<scale>-?[0-9]+|\*))?\))?/i,
	char: /\b(?<typeName>CHARACTER|CHAR|VARCHAR|CHAR\s+VARYING|CHARACTER\s+VARYING|LONG\s+VARCHAR|VARGRAPHIC|LONG\s+VARGRAPHIC|CLOB|CHARACTER\s+LARGE\s+OBJECT)\s*(?:\((?<length>-?[0-9]+|\*)\))?(?:\s+CHARACTER\s+SET\s+(?<characterSet>LATIN|UNICODE|KANJISJIS|GRAPHIC))?/i,
	byte: /\b(?<typeName>BYTE|VARBYTE|BLOB)\s*(?:\((?<length>-?[0-9]+|\*)\))?/i,
	datetime:
		/\b(?<typeName>TIMESTAMP|DATE|TIME)\s*(?:\((?<precision>-?[0-9]+|\*)\))?\s*(?<withTimeZone>WITH\s+TIME\s+ZONE)?/i,
	period: /\b(?<typeName>PERIOD)\s*\((?<nestedType>.*)\)/i,
	interval:
		/\b(?<typeName>INTERVAL\s+(?:YEAR|MONTH|DAY|HOUR|MINUTE|SECOND))\s*(?:\((?<precision>-?[0-9]+|\*)+(?:\s*,\s*(?<secondPrecision>-?[0-9]+|\*))?\))?\s*(?:TO\s+(?<toPeriod>MONTH|HOUR|MINUTE|SECOND))?\s*(?:\((?<toSecondPrecision>-?[0-9]+|\*)\))?/i,
	predefinedUdt:
		/\b(?:SYSUDTLIB\.)?(?<typeName>ST_GEOMETRY|MBR|MBB|XMLTYPE|XML|JSON)\s*(?:\((?<length>-?[0-9]+|\*)\))?\s*(?:INLINE\s+LENGTH\s+(?<inlineLength>-?[0-9]+|\*))?(?:\s+CHARACTER\s+SET\s+(?<characterSet>LATIN|UNICODE|KANJISJIS|GRAPHIC))?/i,
};

module.exports = teradataRegexConfig;
