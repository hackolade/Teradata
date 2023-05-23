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
