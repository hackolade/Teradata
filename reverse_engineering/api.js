"use strict";var ue=Object.defineProperty;var r=(e,t)=>ue(e,"name",{value:t,configurable:!0});var O=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports);var q=O((ft,k)=>{"use strict";var g=r((e="")=>e.replaceAll(/\s+/g," "),"cleanUpCommand"),le=r(({tableType:e,systemDatabases:t})=>{let s=`SELECT DatabaseName, TableName
                FROM DBC.TablesV
            WHERE TableKind = '${e}'
              AND DatabaseName NOT IN (${t.map(a=>`'${a}'`).join(", ")})
            ORDER BY DatabaseName, TableName;`;return g(s)},"getDatabaseAndTableNames"),me=r(({dbName:e,tableName:t})=>{let s=`SELECT col.DatabaseName,
                   col.TableName,
                   col.ColumnName,
                   col.ColumnType as DataType
            FROM DBC.ColumnsV col
            WHERE col.DataBaseName = '${e}'
              AND col.TableName = '${t}'
            ORDER BY col.DatabaseName,
                     col.TableName,
                     col.ColumnId;`;return g(s)},"getColumns"),pe=r(({dbName:e})=>{let t=`SELECT DatabaseName,
                   AccountName,
                   DefaultMapName,
                   ProtectionType,
                   JournalFlag,
                   PermSpace,
                   SpoolSpace,
                   TempSpace,
                   CommentString
            FROM DBC.DatabasesV
            WHERE DatabaseName = '${e}';`;return g(t)},"describeDatabase"),Te=r(({dbName:e,tableName:t})=>{let s=`SELECT COUNT(*) FROM <$>${e}<$>.<$>${t}<$>`;return g(s)},"countColumns"),de=r(({dbName:e,tableName:t,limit:s})=>{let a=`SELECT TOP ${s} * FROM <$>${e}<$>.<$>${t}<$>;`;return g(a)},"getRecords"),Se=r(({entityType:e="TABLE",dbName:t,tableName:s})=>{let a=`SHOW ${e} <$>${t}<$>.<$>${s}<$>;`;return g(a)},"showCreateEntityStatement"),Ee=r(({dbName:e})=>{let t=`SELECT IND.TableName,
                   IND.DatabaseName,
                   IND.IndexName,
                   IND.IndexType
            FROM DBC.IndicesV IND
            WHERE IND.DatabaseName = '${e}'
              AND IND.IndexType IN ('J', 'N')
            GROUP BY IND.DatabaseName,
                     IND.TableName,
                     IND.IndexName,
                     IND.IndexType
            ORDER BY IND.DatabaseName,
                     IND.TableName,
                     IND.IndexName;`;return g(t)},"getIndexesStatement"),ye=r((e,t)=>{switch(e){case C.GET_COLUMNS:return me(t);case C.DESCRIBE_DATABASE:return pe(t);case C.COUNT_COLUMNS:return Te(t);case C.GET_RECORDS:return de(t);case C.SHOW_CREATE_ENTITY_STATEMENT:return Se(t);case C.GET_INDEXES:return Ee(t);case C.GET_DATABASE_AND_TABLE_NAMES:return le(t)}},"buildQuery"),C={GET_COLUMNS:"GET_COLUMNS",DESCRIBE_DATABASE:"DESCRIBE_DATABASE",COUNT_COLUMNS:"COUNT_COLUMNS",GET_RECORDS:"GET_RECORDS",SHOW_CREATE_ENTITY_STATEMENT:"SHOW_CREATE_ENTITY_STATEMENT",GET_INDEXES:"GET_INDEXES",GET_DATABASE_AND_TABLE_NAMES:"GET_DATABASE_AND_TABLE_NAMES"};k.exports={buildQuery:ye,queryType:C}});var W=O((bt,K)=>{"use strict";var Ne=require("os"),Ae=require("util"),Ce=require("path"),De=Ae.promisify(require("child_process").exec),{spawn:ge}=require("child_process"),{buildQuery:h,queryType:R}=q(),he=["val","tdwm","DBC","TDStats","TD_ANALYTICS_DB","TD_SERVER_DB","TDQCD","TDMaps","TDBCMgmt","SystemFe","Sys_Calendar","SYSSPATIAL","SYSLIB","SYSBAR","SysAdmin","LockLogShredder","dbcmngr","SQLJ","All","Crashdumps","Default","External_AP","EXTUSER","PUBLIC","SYSJDBC","SYSUDTLIB","SYSUIF","TD_SYSFNLIB","TD_SYSGPL","TD_SYSXML","TDPUSER"],Re=["ArrayVec","InternalPeriodDateType","InternalPeriodTimeStampType","InternalPeriodTimeStampWTZType","InternalPeriodTimeType","InternalPeriodTimeWTZType","MBB","MBR","ST_Geometry","TD_AVRO","TD_CSVLATIN","TD_CSVUNICODE","TD_JSONLATIN_LOB","TD_JSONUNICODE_LOB","TD_JSON_BSON","TD_JSON_UBJSON","XML"],Ie="Path to JAVA binary file is incorrect. Please specify JAVA_HOME variable in your system or put specific path to JAVA binary file in connection settings.",b,G,fe=r(()=>Ne.platform()==="win32","isWindows"),Oe=r(e=>{let t=e.sslType;return!t||["DISABLE","ALLOW"].includes(t)?{}:{sslmode:t,sslca:e.certAuthority}},"getSslOptions"),be=r(async(e,t)=>{if(e.useSshTunnel){let{options:s}=await t.openTunnel(e);e={...e,host:s.host,port:s.port.toString()||"1025"}}return{...e,...Oe(e)}},"getConnectionSettings"),I=r((e,t)=>` --${e}="${t}"`,"createArgument"),Le=r((e,t)=>{let s=["-jar",e];return t.host&&s.push(I("host",t.host)),t.port&&s.push(I("port",t.port)),t.userName&&s.push(I("user",t.userName)),t.userPassword&&s.push(I("pass",t.userPassword)),t.sslmode&&s.push(I("sslmode",t.sslmode)),t.sslca&&s.push(I("sslca",t.sslca)),s},"buildCommand"),Be=r(()=>(fe()?"%JAVA_HOME%":"$JAVA_HOME")+"/bin/java","getDefaultJavaPath"),Ue=r(async(e,t)=>{try{let s=`"${e}" -version`;await De(s),t.info(`Path to JAVA binary file successfully checked. JAVA path: ${e}`)}catch(s){throw t.error(s),new Error(Ie)}},"checkJavaPath"),_e=r(async(e,t,s)=>{let a=await be(e,t),l=a.javaHomePath?a.javaHomePath:Be();await Ue(l,s);let m=Ce.resolve(__dirname,"..","addons","TeradataClient.jar"),d=Le(m,a);return{execute:c=>new Promise(async(E,N)=>{let A=I("query",c),S=ge(`"${l}"`,[...d,A],{shell:!0});S.on("error",o=>{N(o)});let D=[];S.stderr.on("data",o=>{D.push(o)});let i=[];S.stdout.on("data",o=>{i.push(o)}),S.on("close",o=>{if(o!==0){N(new Error(Buffer.concat(D).toString()));return}let n=Buffer.concat(i).toString().match(/<hackolade>(.*?)<\/hackolade>/)?.[1];if(!n){E([]);return}let T=JSON.parse(n);if(T.error){N(T.error);return}E(T.data)})})}},"createConnection"),Me=r(async(e,t,s)=>b||(G=e.useSshTunnel,b=await _e(e,t,s),b),"connect"),H=r((e=[])=>e.map(t=>t?.["Request Text"]||t?.RequestText).join(""),"getConcatenatedQueryResult"),xe=r((e,t)=>{let s=r(async i=>{let o=h(R.GET_DATABASE_AND_TABLE_NAMES,{tableType:i,systemDatabases:he}),u=await e.execute(o);return Pe(u,n=>n.DataBaseName,n=>n.TableName)},"getDatabasesWithTableNames"),a=r(async(i,o)=>{let u=await e.execute(h(R.COUNT_COLUMNS,{dbName:i,tableName:o}));return Number(u[0]?.Quantity||0)},"getCount"),l=r(async(i,o,u)=>e.execute(h(R.GET_RECORDS,{dbName:i,tableName:o,limit:u})),"getRecords"),m=r(async()=>(await e.execute("SELECT * FROM dbc.dbcinfo")).find(u=>u.InfoKey==="VERSION")?.InfoData,"getVersion"),d=r(async i=>{let o=await e.execute(h(R.DESCRIBE_DATABASE,{dbName:i}));if(!o.length)return{};let u=o[0]||{},n=Ge(u);return{db_account:u.AccountName.trim(),db_default_map:u.DefaultMapName,db_permanent_storage_size:Number(u.PermSpace)||0,spool_files_size:Number(u.SpoolSpace)||0,temporary_tables_size:Number(u.TempSpace)||0,db_before_journaling_strategy:n.beforeStrategy,db_after_journaling_strategy:n.afterStrategy,has_fallback:He(u),description:u.CommentString}},"describeDatabase"),c=r(async(i,o,u)=>{let n=await e.execute(h(R.SHOW_CREATE_ENTITY_STATEMENT,{dbName:i,tableName:o,entityType:u}));return H(n)},"showCreateEntity"),E=r(async(i,o)=>{let u=h(R.GET_COLUMNS,{dbName:i,tableName:o});return(await e.execute(u)).map(T=>({dbName:T.DatabaseName,tableName:T.TableName,columnName:T.ColumnName,dataType:T.DataType.trim()}))},"getColumns"),N=r(async i=>{let o=`SHOW ${i.indexType} INDEX "${i.dbName}"."${i.indxName}";`,u=await e.execute(o);return{...i,createStatement:H(u)}},"getCreateIndexStatement"),A=r(async i=>{let o=h(R.GET_INDEXES,{dbName:i}),u=await e.execute(o);return t.uniqBy(u,"IndexName").map(T=>({dbName:T.DatabaseName,tableName:T.TableName,indxName:T.IndexName,indexType:$e(T),indxKey:T.Columns})).reduce(async(T,L)=>{let M=await T,x=await N(L);return[...M,x]},Promise.resolve([]))},"getIndexes"),S=r(async i=>{let o=i["Table/View/Macro Dictionary Name"],u=`SHOW TYPE "${o}";`,n=await e.execute(u);return{name:o,createStatement:H(n)}},"getCreateUdtStatement");return{getVersion:m,getDatabasesWithTableNames:s,describeDatabase:d,getIndexes:A,getColumns:E,getCount:a,getRecords:l,showCreateEntity:c,getUserDefinedTypes:r(async()=>(await e.execute("HELP DATABASE SYSUDTLIB;")).filter(Ve).filter(ve).reduce(async(u,n)=>{let T=await u,L=await S(n);return[...T,L]},Promise.resolve([])),"getUserDefinedTypes")}},"createInstance"),we=r(async e=>{b&&(b=null),G&&(G=!1,await e.closeConsumer())},"close"),Pe=r((e=[],t,s)=>e.reduce((a,l)=>{let m=t(l);return{...a,[m]:[...a[m]||[],s(l)]}},{}),"groupBy"),He=r(e=>e.ProtectionType?.trim()==="F","hasFallback"),Ge=r(e=>({beforeStrategy:F(e.JournalFlag?.[0]),afterStrategy:F(e.JournalFlag?.[1])}),"getJournalStrategies"),F=r((e="")=>{switch(e){case"S":return"SINGLE";case"D":return"DUAL";case"L":return"LOCAL";default:return"NO"}},"getJournalStrategy"),$e=r(e=>{switch(e.IndexType){case"N":return"HASH";case"J":return"JOIN";default:return""}},"getIndexType"),Ve=r(e=>e.Kind==="U","filterUdt"),ve=r(e=>!Re.includes(e["Table/View/Macro Dictionary Name"]),"excludeSystemUdt");K.exports={connect:Me,createInstance:xe,close:we}});var U=O((Bt,j)=>{"use strict";var Ye={createHashIndex:/^CREATE\s+HASH\s+INDEX\s(?<indexName>'[\s\S]+?'|[${}'. \w-]+)(?:(?:\s+,|,\s+|\s+|,)(?<fallback>(?:NO\s+)?FALLBACK(?:\s+PROTECTION)?))?(?:(?:\s+,|,\s+|\s+|,)CHECKSUM\s+?=\s+?(?<checksum>OFF|DEFAULT|ON))?(?:(?:\s+,|,\s+|\s+|,)MAP\s+?=\s+?(?<map>[\s\S]+?)(?:\s+COLOCATE\s+USING\s+(?<colocationName>[\s\S]+?))?)?(?:(?:\s+,|,\s+|\s+|,)BLOCKCOMPRESSION\s+?=\s+?(?<blockCompression>AUTOTEMP|DEFAULT|MANUAL|NEVER))?\s+?\((?<indexColumns>.*)\)\s+ON\s+(?<tableName>'[\s\S]+?'|[${}'. \w-]+)(?:\s+BY\s+\(.*\))?(?:\s+ORDER\s+BY(?<orderByType>\s+HASH|\s+VALUES)?\s+\((?<orderByColumns>.*)\))?\s+?;$/im,createJoinIndex:/^CREATE\s+JOIN\s+INDEX\s(?<indexName>(?:[`"'][\s\S]+?[`"'])|\S+?)(?:(?:\s+,|,\s+|\s+|,)(?<fallback>(?:NO\s+)?FALLBACK(?:\s+PROTECTION)?))?(?:(?:\s+,|,\s+|\s+|,)CHECKSUM\s+?=\s+?(?<checksum>OFF|DEFAULT|ON))?(?:(?:\s+,|,\s+|\s+|,)MAP\s+?=\s+?(?<map>[\s\S]+?)(?:\s+COLOCATE\s+USING\s+(?<colocationName>[\s\S]+?))?)?(?:(?:\s+,|,\s+|\s+|,)BLOCKCOMPRESSION\s+?=\s+?(?<blockCompression>AUTOTEMP|DEFAULT|MANUAL|NEVER))?\s+AS\s+(?<selectStatement>SELECT[\s\S]*);$/im,indexKeyName:/^(")(?:(?=(\\?))\2.)*?\1|\S+/i,createDistinctUdt:/^CREATE\s+TYPE\s+(?:SYSUDTLIB.)?(?<name>[`"'][\s\S]+?[`"']|\S+?)\s+AS\s+(?<childType>[\s\S]+)\sFINAL(?<methodSpecification>(?:CONSTRUCTOR|INSTANCE)\s*METHOD\s+[\s\S]+)?\s*?;$/im,createStructuredUdt:/^CREATE\s+TYPE\s+(?:SYSUDTLIB.)?(?<name>[`"'][\s\S]+?[`"']|\S+?)\s+AS\s+\((?<columns>[\s\S()]*)\)(?:\s+)?(?<final>NOT\s+FINAl)?\s*(?<methodSpecification>(?:CONSTRUCTOR|INSTANCE)\s*METHOD\s+[\s\S]+)?\s*?;$/im,createArrayUdt:/^CREATE\s+TYPE\s+(?:SYSUDTLIB.)?(?<name>[`"'][\s\S]+?[`"']|\S+?)\s+AS\s+(?<childType>[\s\S]+)\s+ARRAY(?:\s*?\[(?<arrayLength>\d+)\])?\s+(?:DEFAULT\s+(?<default>NULL))?\s*?;$/im,udtField:/\b(?<name>[`"'][\s\S]+?[`"']|\S+?)\s+(?<type>[\s\S\(\)]+)/i,numeric:/\b(?<typeName>BYTEINT|SMALLINT|INTEGER|INT|BIGINT|DECIMAL|DEC|NUMERIC|FLOAT|REAL|DOUBLE\s+PRECISION|NUMBER)\s*(?:\((?<precision>-?[0-9]+|\*)+(?:\s*,\s*(?<scale>-?[0-9]+|\*))?\))?/i,char:/\b(?<typeName>CHARACTER|CHAR|VARCHAR|CHAR\s+VARYING|CHARACTER\s+VARYING|LONG\s+VARCHAR|VARGRAPHIC|LONG\s+VARGRAPHIC|CLOB|CHARACTER\s+LARGE\s+OBJECT)\s*(?:\((?<length>-?[0-9]+|\*)\))?(?:\s+CHARACTER\s+SET\s+(?<characterSet>LATIN|UNICODE|KANJISJIS|GRAPHIC))?/i,byte:/\b(?<typeName>BYTE|VARBYTE|BLOB)\s*(?:\((?<length>-?[0-9]+|\*)\))?/i,datetime:/\b(?<typeName>TIMESTAMP|DATE|TIME)\s*(?:\((?<precision>-?[0-9]+|\*)\))?\s*(?<withTimeZone>WITH\s+TIME\s+ZONE)?/i,period:/\b(?<typeName>PERIOD)\s*\((?<nestedType>.*)\)/i,interval:/\b(?<typeName>INTERVAL\s+(?:YEAR|MONTH|DAY|HOUR|MINUTE|SECOND))\s*(?:\((?<precision>-?[0-9]+|\*)+(?:\s*,\s*(?<secondPrecision>-?[0-9]+|\*))?\))?\s*(?:TO\s+(?<toPeriod>MONTH|HOUR|MINUTE|SECOND))?\s*(?:\((?<toSecondPrecision>-?[0-9]+|\*)\))?/i,predefinedUdt:/\b(?:SYSUDTLIB\.)?(?<typeName>ST_GEOMETRY|MBR|MBB|XMLTYPE|XML|JSON)\s*(?:\((?<length>-?[0-9]+|\*)\))?\s*(?:INLINE\s+LENGTH\s+(?<inlineLength>-?[0-9]+|\*))?(?:\s+CHARACTER\s+SET\s+(?<characterSet>LATIN|UNICODE|KANJISJIS|GRAPHIC))?/i};j.exports=Ye});var Q=O((Ut,z)=>{"use strict";var $=U(),Je=r((e="")=>e.replace(/^("|,|\s+)+|("|,|\s+)+$/gim,""),"cleanKeyName"),X=r(e=>{let t=e.match($.indexKeyName);return!t||!t.length?[]:t.map(Je)},"parseIndexKeys"),ke=r(e=>{let t=$.createHashIndex.exec(e);return!t||!t.groups?{}:{indexMap:t.groups.map,colocateUsing:t.groups.colocationName,indexFallback:t.groups.fallback,checksum:t.groups.checksum,blockCompression:t.groups.blockCompression,indxKey:X(t.groups.indexColumns),orderBy:t.groups.orderByType,orderKeys:X(t.groups.orderByColumns)}},"parseHashIndexStatement"),qe=r(e=>{let t=$.createJoinIndex.exec(e);return!t||!t.groups?{}:{indexMap:t.groups.map,colocateUsing:t.groups.colocationName,indexFallback:t.groups.fallback,checksum:t.groups.checksum,blockCompression:t.groups.blockCompression,asSelect:t.groups.selectStatement}},"parseJoinIndexStatement"),Fe=r(e=>{let t={};return e.indexType==="HASH"?t=ke(e.createStatement):t=qe(e.createStatement),{...e,...t}},"parseIndexStatement"),Ke=r((e,t)=>t.filter(s=>s.tableName===e).map(Fe),"parseTableIndexes");z.exports={parseTableIndexes:Ke}});var te=O((Mt,ee)=>{"use strict";var y=U(),We=r(e=>{switch(e.toUpperCase()){case"BYTEINT":return"byteint";case"SMALLINT":return"smallint";case"INT":case"INTEGER":return"int";case"BIGINT":return"bigint";case"DEC":case"DECIMAL":case"NUMERIC":return"decimal";case"FLOAT":case"REAL":case"DOUBLE PRECISION":return"float";case"NUMBER":return"number";default:return"int"}},"getModeByNumericType"),je=r(e=>{let{typeName:t,precision:s,scale:a}=y.numeric.exec(e).groups;return{type:"numeric",childType:"numeric",mode:We(t),...s&&{precision:Number(s)},...a&&{scale:Number(a)}}},"parseNumeric"),Xe=r(e=>{switch(e.toUpperCase()){case"CHAR":case"CHARACTER":return"char";case"VARCHAR":case"CHAR VARYING":case"CHARACTER VARYING":return"varchar";case"LONG VARCHAR":return"long varchar";case"VARGRAPHIC":return"vargraphic";case"LONG VARGRAPHIC":return"long vargraphic";case"CLOB":case"CHARACTER LARGE OBJECT":return"clob";default:return"char"}},"getModeByCharType"),ze=r(e=>{let{typeName:t,length:s,characterSet:a}=y.char.exec(e).groups;return{type:"string",childType:"char",mode:Xe(t),...a&&{characterSet:a.toUpperCase()},...s&&{length:Number(s)}}},"parseChar"),Qe=r(e=>{switch(e.toUpperCase()){case"BYTE":return"byte";case"VARBYTE":return"varbyte";case"BLOB":return"blob";default:return"byte"}},"getModeByBinaryType"),Ze=r(e=>{let{typeName:t,length:s}=y.byte.exec(e).groups;return{type:"binary",childType:"byte",mode:Qe(t),...s&&{length:Number(s)}}},"parseBinary"),et=r(e=>{switch(e.toUpperCase()){case"DATE":return"date";case"TIME":return"time";case"TIMESTAMP":return"timestamp";default:return"date"}},"getModeByDatetimeType"),Z=r(e=>{let{typeName:t,precision:s,withTimeZone:a}=y.datetime.exec(e).groups;return{type:"string",childType:"datetime",mode:et(t),...s&&{fractSecPrecision:Number(s)},...a&&{timezone:a.toUpperCase()}}},"parseDatetime"),tt=r(e=>{let{nestedType:t}=y.period.exec(e).groups,s=Z(t);return{type:"string",childType:"period",childValueType:s.mode,...s.fractSecPrecision&&{fractSecPrecision:s.fractSecPrecision},...s.timezone&&{timezone:s.timezone}}},"parsePeriod"),st=r(e=>{let{typeName:t,precision:s,secondPrecision:a,toPeriod:l,toSecondPrecision:m}=y.interval.exec(e).groups;return{type:"string",childType:"interval",subtype:t.toLowerCase(),...s&&{precision:s},...l&&{toPrecision:l.toUpperCase()},...(a||m)&&{fractSecPrecision:Number(a||m)}}},"parseInterval"),rt=r(e=>{switch(e.toUpperCase()){case"ST_GEOMETRY":return"ST_Geometry";case"MBR":return"MBR";case"MBB":return"MBB";default:return"ST_Geometry"}},"getModeByGeospatialType"),at=r(e=>["ST_GEOMETRY","MBR","MBB"].includes(e.toUpperCase()),"isGeoType"),nt=r(e=>{let{typeName:t,length:s,inlineLength:a,characterSet:l}=y.predefinedUdt.exec(e).groups,m={...l&&{characterSet:l.toUpperCase()},...s&&{length:Number(s)},...a&&{inlineLength:Number(a)}};if(at(t))return{type:"string",childType:"geospatial",mode:rt(t),...m};if(t.toUpperCase()==="JSON")return{type:"jsonObject",childType:"json",subtype:"json",...m};if(t.toUpperCase()==="XML")return{type:"binary",childType:"xml",...m}},"parsePredefinedUdt"),ct=r(e=>({refType:"model",$ref:`#model/definitions/${e.replace(/^SYSUDTLIB\./i,"").toLowerCase()}`}),"createReferenceToUdt"),ot=r(e=>y.numeric.test(e)?je(e):y.char.test(e)?ze(e):y.byte.test(e)?Ze(e):y.datetime.test(e)?Z(e):y.period.test(e)?tt(e):y.interval.test(e)?st(e):y.predefinedUdt.test(e)?nt(e):ct(e),"parseFieldType");ee.exports={parseFieldType:ot}});var ae=O((wt,re)=>{"use strict";var f=U(),{parseFieldType:V}=te(),it=r(e=>{let t=f.udtField.exec(e);if(!t||!t.groups)return;let s=V(t.groups.type);return{name:t.groups.name,...s}},"parseFieldRow"),ut=r(e=>e.split(/,[\n\r]/).map(it),"parseUdtFields"),lt=r(e=>{let t=f.createStructuredUdt.exec(e.createStatement);return!t||!t.groups?{}:{name:t.groups.name.toLowerCase(),childType:"object",type:"document",methodSpecification:t.groups.methodSpecification,properties:ut(t.groups.columns)}},"parseStructuredUdt"),mt=r(e=>{let t=f.createArrayUdt.exec(e.createStatement);return!t||!t.groups?{}:{name:t.groups.name.toLowerCase(),childType:"array",type:"array",default:t.groups.default,length:Number(t.groups.arrayLength),properties:[{name:0,...V(t.groups.childType)}]}},"parseArrayUdt"),pt=r(e=>{let t=f.createDistinctUdt.exec(e.createStatement);return!t||!t.groups?{}:{...V(t.groups.childType),name:t.groups.name.toLowerCase(),methodSpecification:t.groups.methodSpecification}},"parseDistinctUdt"),Tt=r(e=>{if(f.createStructuredUdt.test(e.createStatement))return lt(e);if(f.createArrayUdt.test(e.createStatement))return mt(e);if(f.createDistinctUdt.test(e.createStatement))return pt(e)},"parseUdt"),se=r(e=>e.reduce((t,s)=>s.properties?{...t,[s.name]:{...s,properties:se(s.properties)}}:{...t,[s.name]:s},{}),"convertToJsonSchema"),dt=r(e=>se(e.map(Tt)),"parseUserDefinedTypes");re.exports={parseUserDefinedTypes:dt}});var B=W(),St=Q(),Et=ae(),_=r(async(e,t,s)=>await B.connect(e,t,s),"connect"),yt=r(async(e,t,s,a)=>{let l=a.require("@hackolade/ssh-service");await B.close(l),s()},"disconnect"),Nt=r(async(e,t,s,a)=>{let l=a.require("lodash"),m=a.require("@hackolade/ssh-service"),d=v({title:"Test connection",hiddenKeys:e.hiddenKeys,logger:t});try{t.clear(),t.log("info",e,"connectionInfo",e.hiddenKeys),d.info("Start test connection");let c=await _(e,m,d);await B.createInstance(c,l).getVersion(),d.info("Connected successfully"),s(null)}catch(c){d.error(c),s({message:c.message,stack:c.stack})}},"testConnection"),At=r(async(e,t,s,a)=>{let l=a.require("lodash"),m=a.require("@hackolade/ssh-service"),d=v({title:"Retrieving databases and tables information",hiddenKeys:e.hiddenKeys,logger:t});try{t.clear(),t.log("info",e,"connectionInfo",e.hiddenKeys);let c=await _(e,m,d),E=B.createInstance(c,l);d.info("Get table and database names");let N=await E.getDatabasesWithTableNames("T");d.info("Get views and database names");let A=Dt(await E.getDatabasesWithTableNames("V")),D=[...Object.keys(N),...Object.keys(A)].map(i=>{let o=[...N[i]||[],...A[i]||[]];return{dbName:i,dbCollections:o,isEmpty:o.length}});d.info("Names retrieved successfully"),s(null,D)}catch(c){d.error(c),s({message:c.message,stack:c.stack})}},"getDbCollectionsNames"),Ct=r(async(e,t,s,a)=>{let l=a.require("lodash"),m=a.require("@hackolade/ssh-service"),d=a.require("async"),c=v({title:"Reverse-engineering process",hiddenKeys:e.hiddenKeys,logger:t});try{t.log("info",e,"data",e.hiddenKeys);let E=e.collectionData.collections,N=e.collectionData.dataBaseNames,A=await _(e,m,c),S=B.createInstance(A,l),D=await S.getVersion();c.info("Teradata version: "+D),c.progress("Start reverse engineering ..."),c.info("Get UDTs"),c.progress("Get User Defined Types");let i=await S.getUserDefinedTypes();c.info("Parse UDTs"),c.progress("Parse User Defined Types");let o=Et.parseUserDefinedTypes(i),u=await d.mapSeries(N,async n=>{let T=(E[n]||[]).filter(p=>!ne(p)),L=(E[n]||[]).filter(ne).map(gt);c.info(`Parsing database "${n}"`),c.progress(`Parsing database "${n}"`,n);let M=await S.describeDatabase(n);c.info(`Get indexes "${n}"`),c.progress(`Get indexes "${n}"`,n);let x=await S.getIndexes(n),Y=await d.mapSeries(T,async p=>{c.info(`Get columns "${p}"`),c.progress("Get columns",n,p);let w=await S.getColumns(n,p),P=[];if(ht(w)){c.info(`Sampling table "${p}"`),c.progress("Sampling table",n,p);let ie=await S.getCount(n,p);P=await S.getRecords(n,p,Rt(ie,e.recordSamplingSettings))}c.info(`Get create table statement "${p}"`),c.progress("Get create table statement",n,p);let ce=await S.showCreateEntity(n,p);c.info(`Parse indexes "${p}"`),c.progress("Parse indexes",n,p);let oe=St.parseTableIndexes(p,x);return{dbName:n,collectionName:p,entityLevel:{Indxs:oe},documents:P,views:[],standardDoc:P[0],ddl:{script:ce,type:"teradata",takeAllDdlProperties:!0},emptyBucket:!1,bucketInfo:{...M},modelDefinitions:{properties:o}}}),J=await d.mapSeries(L,async p=>{c.info(`Getting data from view "${p}"`),c.progress("Getting data from view",n,p);let w=await S.showCreateEntity(n,p,"VIEW");return{name:p,ddl:{script:w,type:"teradata"}}});return J.length?[...Y,{dbName:n,views:J,emptyBucket:!1}]:Y});s(null,u.flat())}catch(E){c.error(E),s({message:E.message,stack:E.stack})}},"getDbCollectionsData"),Dt=r(e=>Object.keys(e).reduce((t,s)=>({...t,[s]:e[s].map(a=>`${a} (v)`)}),{}),"getViewNames"),ne=r(e=>/ \(v\)$/i.test(e),"isViewName"),gt=r(e=>e.replace(/ \(v\)$/i,""),"getViewName"),ht=r(e=>e.some(t=>t.dataType==="JN"),"containsJson"),Rt=r((e,t)=>{if(t.active==="absolute")return Number(t.absolute.value);let s=Math.ceil(e*t.relative.value/100);return Math.min(s,t.maxValue)},"getSampleDocSize"),v=r(({title:e,logger:t,hiddenKeys:s})=>({info(a){t.log("info",{message:a},e,s)},progress(a,l="",m=""){t.progress({message:a,containerName:l,entityName:m})},error(a){t.log("error",{message:a.message,stack:a.stack},e)}}),"createLogger");module.exports={connect:_,disconnect:yt,testConnection:Nt,getDbCollectionsNames:At,getDbCollectionsData:Ct};
