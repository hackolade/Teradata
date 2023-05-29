type AppModule = any
type UUID = string

type ApplyDropStatementOption = {
    id: string,
    value: boolean,
    forUpdate: boolean,
    name: string,
    isDropInStatements: boolean
}

export type AdditionalDdlOptions = [ ApplyDropStatementOption ] | undefined

export type AdditionalOptionsObject = {
    applyDropStatements?: boolean
}

export type DdlProviderOptions = {
    isUpdateScript: boolean,
    additionalOptions: AdditionalDdlOptions,
    origin: string,
    fakerLocalization: string,
    showIndexStatementsInEndDdl: boolean
}

export interface App {
    require: (libName: string) => AppModule,
    utils: Object,
}

export type BaseProvider = Object

interface ContainerOptions {
    has_fallback?: boolean,
    db_before_journaling_strategy?: string,
    db_after_journaling_strategy?: string,
    db_account?: string,
    db_default_map?: string,
    db_permanent_storage_size?: string,
    spool_files_size?: string,
    temporary_tables_size?: string,
    db_default_journal_table?: string,
    db_default_journal_db?: string,
    dropDefaultJournalTable?: boolean,
}

type BackgroundColor = {
    r: number,
    g: number,
    b: number,
    a: number
}
export interface ContainerData extends ContainerOptions {
    id?: UUID,
    type?: string,
    name: string,
    code?: string,
    isActivated?: boolean,
    collectionIds?: Array<UUID>,
    backgroundColor?: BackgroundColor,
    show?: boolean,
    indexes?: Array<Object>
}

interface DropContainerData {
    databaseName: string,
}

interface ModifyContainerData extends ContainerOptions {
    name: string,
}

type ComparisonResult<CompareValueType> = {
    new: CompareValueType,
    old: CompareValueType,
}

type ModifiedContainerCompModResult = {
    name?: ComparisonResult<string>,
    code?: ComparisonResult<string>,
    isActivated?: ComparisonResult<boolean>,
    db_account?: ComparisonResult<string>,
    db_default_map?: ComparisonResult<string>,
    db_permanent_storage_size?: ComparisonResult<string>,
    spool_files_size?: ComparisonResult<string>,
    temporary_tables_size?: ComparisonResult<string>,
    has_fallback?: ComparisonResult<boolean>,
    db_before_journaling_strategy?: ComparisonResult<string>,
    db_after_journaling_strategy?: ComparisonResult<string>,
    db_default_journal_table?: ComparisonResult<string>,
    db_default_journal_db?: ComparisonResult<string>,
    backgroundColor?: ComparisonResult<BackgroundColor>
}

interface HydrateDropContainerData extends ContainerData {
    compMod: DropContainerCompModResult,
    roleType: string,
}

interface HydrateModifyContainerData extends ContainerData {
    compMod: ModifiedContainerCompModResult,
    roleType: string,
}

type ContainerCompModeData = ComparisonResult<ContainerData>

type DropContainerCompModResult = {
    created: boolean,
    deleted: boolean,
}

interface CollectionDbData extends ContainerOptions {
    databaseName: string,
    isActivated?: boolean,
}

type TableData = {
    name: string,
    dbData: CollectionDbData,
    schemaData: Object,
}

interface DataBlockSizeTableOption {
    id?: UUID,
    blockSize?: string,
    specificSize?: string,
    units?: string,
}

interface BlockComparisonTableOption {
    id?: UUID,
    blockCompressionType?: string,
    blockCompressionAlgorithm?: string,
    blockCompressionLevel?: string,
    specificBlockCompressionLevel?: number,
}

interface MergeBlockRationTableOption {
    id?: UUID,
    mergeRatio?: string,
    specificRatio?: number,
    percentUnit?: boolean,
}

interface FreespaceTableOption {
    id?: UUID,
    freeSpaceValue?: number,
    percentUnit?: boolean,
}

interface TableOptions {
    id?: UUID,
    ERROR_TABLE?: boolean,
    FOR_TABLE?: string,
    FOREIGN_TABLE?: boolean,
    SET_MULTISET?: string,
    TEMPORARY_VOLATILE?: string,
    QUEUE_TABLE?: boolean,
    TRACE_TABLE?: boolean,
    EXTERNAL_SECURITY?: string,
    AUTHORIZATION_NAME?: string,
    MAP?: string,
    COLOCATE_USING?: string,
    FALLBACK?: boolean,
    DEFAULT_JOURNAL_TABLE?: string,
    LOG?: boolean,
    BEFORE_JOURNAL?: string,
    AFTER_JOURNAL?: string,
    TABLE_CHECKSUM?: string,
    FREESPACE?: FreespaceTableOption,
    MERGE_BLOCK_RATIO?: MergeBlockRationTableOption,
    DATA_BLOCK_SIZE?: DataBlockSizeTableOption,
    BLOCK_COMPRESSION?: BlockComparisonTableOption,
    ISOLATED_LOADING?: string,
    TABLE_PRESERVATION?: string,
    USING?: {
        id: UUID,
        location?: string,
        scanPercentage?: number,
        pathPattern?: string,
        manifest?: boolean,
        tableFormat?: string,
        rowFormat?: string,
        storedAs?: string,
        header?: boolean,
        stripSpaces?: boolean,
        stripEnclosingChar?: string,
    }
}

type EntityDetails = {
    collectionName: string,
    code?: string,
    isActivated: boolean,
    schemaId?: string,
    bucketId: UUID,
    additionalProperties: boolean,
    tableOptions?: TableOptions,
    partitioning?: {
        id: UUID,
        partitionBy?: string,
        partitioningExpression?: string,
        compositePartitionKey?: Array<ConstraintKey>,
    },
    selectStatement?: string,
    comments?: string,
}

type ConstraintKey = {
    keyId: UUID,
    type: string,
    name: string,
    isActivated: boolean,
}

type PrimaryKey = {
    id: UUID,
    constraintName?: string,
    compositePrimaryKey?: Array<ConstraintKey>
    indexComment?: string,
}

type UniqueKey = {
    id: UUID,
    constraintName?: string,
    compositeUniqueKey?: Array<ConstraintKey>
    indexComment?: string,
}

type EntityCompositeKeys = {
    primaryKey?: Array<PrimaryKey>,
    uniqueKey?: Array<UniqueKey>,
}

type Index = {
    id: UUID,
    isActivated: boolean,
    indxName?: string,
    indexType?: string,
    unique?: boolean,
    indxKey?: Array<ConstraintKey>,
    orderBy?: string,
    orderKeys?: Array<ConstraintKey>,
    loadIdentity?: string,
    indexComment?: string,
}

type EntityIndexes = {
    Indxs?: Array<Index>,
}

type CheckConstraint = {
    id: UUID,
    chkConstrName?: string,
    constrDescription?: string,
    constrExpression?: string,
    constrComments?: string
}

type EntityCheckConstraints = {
    chkConstr?: Array<CheckConstraint>,
}

type EntityData = [ EntityDetails, EntityCompositeKeys, EntityIndexes, EntityCheckConstraints ]

type DropEntityData = {
    name: string,
    dbName: string,
    temporary: boolean,
}

type ModifyEntityData = {
    name: string,
    tableOptions: TableOptions,
}

type DropColumnData = {
    name: string,
}

interface ColumnDefinitionOptions {
    childValueType?: string,
    primaryKey?: boolean,
    unique?: boolean,
    isActivated: boolean,
    length?: number,
    inlineLength?: number,
    storageFormat?: string,
    withSchema?: string,
    precision?: number,
    scale?: number,
    required?: boolean,
    uppercase?: boolean,
    caseSpecific?: boolean,
    format?: string,
    default?: string,
    fractSecPrecision?: number,
    toPrecision?: string,
    characterSet?: string,
    autoColumn?: boolean,
    timezone?: string,
    compress?: string,
    compressUsing?: string,
    decompressUsing?: string,
    methodSpecification?: string,
}

interface ColumnDefinition extends ColumnDefinitionOptions{
    name: string,
    type: string,
}

interface ModifyColumnData extends ColumnDefinition {
    oldName?: string,
    oldType?: string,
    newOptions?: ColumnDefinitionOptions,
}

interface HydratedCheckConstraint {
    name: string,
    expression: string,
}
