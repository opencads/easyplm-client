import { DateTime } from "../.tsc/System/DateTime";
import { Guid } from "../.tsc/System/Guid";
import { RawJsonDocument } from "./IRawJson";

export interface ImportInterface {
    filePath?: string,
    directory?: string,
    rawJsonDocument?: any,
    documentNumber0?: string,
    documentNumber1?: string,
    documentNumber2?: string,
    partNumber0?: string,
    partNumber1?: string,
    partNumber2?: string,
    documentRemoteID?: string,
    partRemoteID?: string,
    displayName?: string,
}

export interface DocumentInterface {
    id: Guid,
    key: string,
    originFileName: string,
    formatFileName: string,
    lowerFormatFileName: string,
    contentMD5: string,
    rawJsonDocumentMD5: string,
    documentNumber0: string,
    documentNumber1: string,
    documentNumber2: string,
    partNumber0: string,
    partNumber1: string,
    partNumber2: string,
    documentRemoteID: string,
    partRemoteID: string,
    displayName: string,
    createTime: DateTime,
    updateTime: DateTime,
    fileLastWriteTime: DateTime,
    fileLength: number
}

export interface DirectoryInterface {
    id: Guid,
    path: string,
    documents: Guid[]
}

export interface ContentToAttachmentRelation {
    id: Guid,
    key: string,
    extensionKey: string,
    contentMD5: string,
    attachmentFileName: string,
    attachmentMD5: string
}

export interface PluginSubscriber {
    url: string,
    name: string,
    type: 'git-release' | 'git-repository'
}

export interface LocalSubscriber {
    name: string,
    url: string
}

export interface GitRemote {
    url: string,
    name: string
    type: 'fetch' | 'push'
}

export interface DocumentWithRawJsonInterface extends DocumentInterface {
    rawJsonDocument: RawJsonDocument
}

export interface ScanResult {
    untrackedFiles: string[],
    documents: DocumentInterface[],
    modifiedDocuments: DocumentInterface[],
    missingDocuments: DocumentInterface[],
}

export interface ContentToRawjsonRelation {
    id: Guid,
    contentMD5: string,
    rawJsonMD5: string
}
