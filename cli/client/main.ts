import { args, env, md5 } from '../.tsc/context';
import { database } from '../.tsc/Cangjie/TypeSharp/System/database';
import { databaseInterface } from '../.tsc/Cangjie/TypeSharp/System/databaseInterface';
import { Console } from '../.tsc/System/Console';
import { Server } from '../.tsc/Cangjie/TypeSharp/System/Server';
import { Path } from '../.tsc/System/IO/Path';
import { DirectoryInterface, DocumentInterface, ImportInterface } from './interfaces';
import { Regex } from '../.tsc/System/Text/RegularExpressions/Regex';
import { File } from '../.tsc/System/IO/File';
import { fileUtils } from '../.tsc/Cangjie/TypeSharp/System/fileUtils';
import { DateTime } from '../.tsc/System/DateTime';
import { Environment } from '../.tsc/System/Environment';
import { Directory } from '../.tsc/System/IO/Directory';
import { Guid } from '../.tsc/System/Guid';
import { Json } from '../.tsc/TidyHPC/LiteJson/Json'
import { Session } from '../.tsc/TidyHPC/Routers/Urls/Session';
import { FileStream } from '../.tsc/System/IO/FileStream';

let appDataDirectory = Path.Combine(env('userprofile'), '.xplm');
if (Directory.Exists(appDataDirectory) == false) {
    Directory.CreateDirectory(appDataDirectory);
}
let defaultWorkSpaceDirectory = Path.Combine(env('mydocuments'), '.xplm', 'WorkSpace');
if (Directory.Exists(defaultWorkSpaceDirectory) == false) {
    Directory.CreateDirectory(defaultWorkSpaceDirectory);
}
let DatabaseInterfaces = () => {
    let documentInterface = {
        name: 'xplm/document',
        fields: [
            {
                name: 'id',
                isMaster: true,
                type: 'Guid'
            },
            {
                name: 'createTime',
                type: 'DateTime'
            },
            {
                name: 'key',
                type: 'md5',
                isIndex: true
            },
            {
                name: 'originFileName',
                type: 'char',
                length: 256,
                isIndexSet: true
            },
            {
                name: 'formatFileName',
                type: 'char',
                length: 256,
                isIndexSet: true
            },
            {
                name: 'lowerFormatFileName',
                type: 'char',
                length: 256,
                isIndexSet: true
            },
            {
                name: 'contentMD5',
                type: 'md5',
                isIndexSet: true
            },
            {
                name: 'rawJsonMD5',
                type: 'md5',
                isIndexSet: true
            },
            {
                name: 'documentNumber0',
                type: 'char',
                length: 32,
                isIndexSet: true
            },
            {
                name: 'documentNumber1',
                type: 'char',
                length: 32,
                isIndexSet: true
            },
            {
                name: 'documentNumber2',
                type: 'char',
                length: 32,
                isIndexSet: true
            },
            {
                name: 'partNumber0',
                type: 'char',
                length: 32,
                isIndexSet: true
            },
            {
                name: 'partNumber1',
                type: 'char',
                length: 32,
                isIndexSet: true
            },
            {
                name: 'partNumber2',
                type: 'char',
                length: 32,
                isIndexSet: true
            },
            {
                name: 'documentRemoteID',
                type: 'char',
                length: 32,
                isIndexSet: true
            },
            {
                name: 'partRemoteID',
                type: 'char',
                length: 32,
                isIndexSet: true
            },
            {
                name: 'displayName',
                type: 'char',
                length: 256,
                isIndexSet: true
            }
        ]
    } as databaseInterface;
    let directoryInterface = {
        name: 'xplm/directory',
        fields: [
            {
                name: 'id',
                isMaster: true,
                type: 'Guid'
            },
            {
                name: 'path',
                type: 'char',
                length: 256,
                isIndexSet: true
            },
            {
                name: 'documents',
                type: 'Guid',
                length: 32
            }
        ]
    } as databaseInterface;
    return {
        documentInterface,
        directoryInterface
    };
};

let LocalConfig = () => {
    let filePath = Path.Combine(appDataDirectory, 'config.json');
    let config = {} as any;
    let load = () => {
        if (File.Exists(filePath)) {
            config = Json.Load(filePath);
        }
        else {
            config = {};
        }
    };
    let save = () => {
        File.WriteAllText(filePath, JSON.stringify(config));
    };
    load();
    return {
        load,
        save,
        get: () => config
    };
};

let Client = () => {
    let server = new Server();
    let db: database;
    let databaseInterfaces = DatabaseInterfaces();
    let localConfig = LocalConfig();
    let registerService = () => {

    };
    let start = async (port: number) => {
        console.log(`start server at port ${port}`);
        server.start(port);
        await server.onConfigCompleted.Task;
        db = server.getDatabase();
        let interfaceKeys = Object.keys(databaseInterfaces);
        for (let interfaceKey of interfaceKeys) {
            let databaseInterface = databaseInterfaces[interfaceKey];
            await db.register(databaseInterface);
        }
        registerService();
    };
    let digitFileExtensionReg = new Regex('\\.\\d+$');
    let formatImport = (data: ImportInterface) => {
        let fileName = data.filePath == undefined ? "" : Path.GetFileName(data.filePath);
        let formatFileName = "";
        if (fileName != "") {
            let formatFileName = digitFileExtensionReg.Replace(fileName, "");
        }
        let contentMD5 = "";
        if (data.filePath != undefined && (File.Exists(data.filePath))) {
            contentMD5 = fileUtils.md5(data.filePath);
        }
        else {
            contentMD5 = md5("");
        }
        let abstract = {
            lowerFormatFileName: formatFileName.toLowerCase(),
            contentMD5: contentMD5,
            rawJsonMD5: md5(JSON.stringify(data.rawJson, null, 0)),
            documentNumber0: data.documentNumber0,
            documentNumber1: data.documentNumber1,
            documentNumber2: data.documentNumber2,
            partNumber0: data.partNumber0,
            partNumber1: data.partNumber1,
            partNumber2: data.partNumber2
        };
        let abstractMD5 = md5(JSON.stringify(abstract, null, 0));
        return {
            ...abstract,
            key: abstractMD5,
            originFileName: fileName,
            formatFileName: formatFileName
        }
    };
    let tryAddToDirectory = async (directory: string, documentIDs: Guid[]) => {
        let directoryRecords = await db.findByIndexSet(databaseInterfaces.directoryInterface.name, "path", directory.toLowerCase()) as DirectoryInterface[];
        if (directoryRecords.length == 0) {
            let directoryRecord = {
                path: directory.toLowerCase(),
                documents: documentIDs
            } as DirectoryInterface;
            await db.insert(databaseInterfaces.directoryInterface.name, directoryRecord);
        }
        else {
            for (let directoryRecord of directoryRecords) {
                let documents = directoryRecord.documents;
                documents = documents.filter(item => item != Guid.Empty);
                let isUpdated = false;
                for (let documentID of [...documentIDs]) {
                    if (documents.indexOf(documentID) == -1 && (documents.length < 32)) {
                        documents.push(documentID);
                        documentIDs.splice(documentIDs.indexOf(documentID), 1);
                        isUpdated = true;
                    }
                }
                if (isUpdated) {
                    directoryRecord.documents = documents;
                    await db.updatebyMaster(databaseInterfaces.directoryInterface.name, directoryRecord);
                }
            }
            for (let i = 0; i < documentIDs.length; i += 32) {
                let documentIDsChunk = documentIDs.slice(i, i + 32);
                let directoryRecord = {
                    path: directory.toLowerCase(),
                    documents: documentIDsChunk
                } as DirectoryInterface;
                await db.insert(databaseInterfaces.directoryInterface.name, directoryRecord);
            }

        }
    };
    let archiveDocument = async (data: ImportInterface) => {
        let abstract = formatImport(data);
        if (await db.containsByIndex(databaseInterfaces.documentInterface.name, "key", abstract.key)) {
            let record = await db.findByIndex(databaseInterfaces.documentInterface.name, "key", abstract.key) as DocumentInterface;
            let isUpdated = false;
            if (record.documentRemoteID == "" && (data.documentRemoteID) && (record.documentRemoteID != data.documentRemoteID)) {
                record.documentRemoteID = data.documentRemoteID;
                isUpdated = true;
            }
            if (record.partRemoteID == "" && (data.partRemoteID) && (record.partRemoteID != data.partRemoteID)) {
                record.partRemoteID = data.partRemoteID;
                isUpdated = true;
            }
            if (record.displayName == "" && (data.displayName) && (record.displayName != data.displayName)) {
                record.displayName = data.displayName;
                isUpdated = true;
            }
            if (isUpdated) {
                await db.updatebyMaster(databaseInterfaces.documentInterface.name, record);
            }
            return record as DocumentInterface;
        }
        else {
            let record = {
                ...abstract,
                createTime: DateTime.Now,
                documentRemoteID: data.documentRemoteID,
                partRemoteID: data.partRemoteID,
                displayName: data.displayName
            };
            let index = await db.insert(databaseInterfaces.documentInterface.name, record);
            return {
                ...record,
                id: index.Master
            } as DocumentInterface;

        }
    };
    let importDocumentsToDirectory = async (data: ImportInterface[]) => {
        let result = [] as DocumentInterface[];
        let mapDirectoryToDocumentIDs = {} as { [key: string]: Guid[] };
        for (let item of data) {
            let documentInterface = await archiveDocument(item);
            result.push(documentInterface);
            if (item.directory) {
                let lowerDirectory = item.directory.toLowerCase();
                if (mapDirectoryToDocumentIDs[lowerDirectory] == undefined) {
                    mapDirectoryToDocumentIDs[lowerDirectory] = [];
                }
                mapDirectoryToDocumentIDs[lowerDirectory].push(documentInterface.id);
            }
        }
        let directoryKeys = Object.keys(mapDirectoryToDocumentIDs);
        for (let directoryKey of directoryKeys) {
            let documentIDs = mapDirectoryToDocumentIDs[directoryKey];
            await tryAddToDirectory(directoryKey, documentIDs);
        }
        return result;

    };
    let isArchivedDocument = async (data: ImportInterface) => {
        let abstract = formatImport(data);
        if (await db.containsByIndex(databaseInterfaces.documentInterface.name, "key", abstract.key)) {
            return true;
        }
        else {
            return false;
        }
    };
    let getDocumentsByDirectory = async (directory: string) => {
        let directoryRecords = await db.findByIndexSet(databaseInterfaces.directoryInterface.name, "path", directory.toLowerCase()) as DirectoryInterface[];
        let records = [] as DocumentInterface[];
        for (let directoryRecord of directoryRecords) {
            let documentIDs = directoryRecord.documents;
            for (let documentID of documentIDs) {
                let record = await db.findByMaster(databaseInterfaces.documentInterface.name, documentID) as DocumentInterface;
                records.push(record);
            }
        }
        let mapFileNameToRecord = {} as { [key: string]: DocumentInterface };
        let mapDocumentNumber0ToRecord = {} as { [key: string]: DocumentInterface };
        let mapDocumentNumber1ToRecord = {} as { [key: string]: DocumentInterface };
        let mapDocumentNumber2ToRecord = {} as { [key: string]: DocumentInterface };
        let mapPartNumber0ToRecord = {} as { [key: string]: DocumentInterface };
        let mapPartNumber1ToRecord = {} as { [key: string]: DocumentInterface };
        let mapPartNumber2ToRecord = {} as { [key: string]: DocumentInterface };
        for (let record of records) {
            if (record.lowerFormatFileName.length > 0) {
                if (mapFileNameToRecord[record.lowerFormatFileName]) {
                    if (record.createTime > mapFileNameToRecord[record.lowerFormatFileName].createTime) {
                        mapFileNameToRecord[record.lowerFormatFileName] = record;
                    }
                }
                else {
                    mapFileNameToRecord[record.lowerFormatFileName] = record;
                }
            }
            else if (record.documentNumber0.length > 0) {
                if (mapDocumentNumber0ToRecord[record.documentNumber0]) {
                    if (record.createTime > mapDocumentNumber0ToRecord[record.documentNumber0].createTime) {
                        mapDocumentNumber0ToRecord[record.documentNumber0] = record;
                    }
                }
                else {
                    mapDocumentNumber0ToRecord[record.documentNumber0] = record;
                }
            }
            else if (record.documentNumber1.length > 0) {
                if (mapDocumentNumber1ToRecord[record.documentNumber1]) {
                    if (record.createTime > mapDocumentNumber1ToRecord[record.documentNumber1].createTime) {
                        mapDocumentNumber1ToRecord[record.documentNumber1] = record;
                    }
                }
                else {
                    mapDocumentNumber1ToRecord[record.documentNumber1] = record;
                }
            }
            else if (record.documentNumber2.length > 0) {
                if (mapDocumentNumber2ToRecord[record.documentNumber2]) {
                    if (record.createTime > mapDocumentNumber2ToRecord[record.documentNumber2].createTime) {
                        mapDocumentNumber2ToRecord[record.documentNumber2] = record;
                    }
                }
                else {
                    mapDocumentNumber2ToRecord[record.documentNumber2] = record;
                }
            }
            else if (record.partNumber0.length > 0) {
                if (mapPartNumber0ToRecord[record.partNumber0]) {
                    if (record.createTime > mapPartNumber0ToRecord[record.partNumber0].createTime) {
                        mapPartNumber0ToRecord[record.partNumber0] = record;
                    }
                }
                else {
                    mapPartNumber0ToRecord[record.partNumber0] = record;
                }
            }
            else if (record.partNumber1.length > 0) {
                if (mapPartNumber1ToRecord[record.partNumber1]) {
                    if (record.createTime > mapPartNumber1ToRecord[record.partNumber1].createTime) {
                        mapPartNumber1ToRecord[record.partNumber1] = record;
                    }
                }
                else {
                    mapPartNumber1ToRecord[record.partNumber1] = record;
                }
            }
            else if (record.partNumber2.length > 0) {
                if (mapPartNumber2ToRecord[record.partNumber2]) {
                    if (record.createTime > mapPartNumber2ToRecord[record.partNumber2].createTime) {
                        mapPartNumber2ToRecord[record.partNumber2] = record;
                    }
                }
                else {
                    mapPartNumber2ToRecord[record.partNumber2] = record;
                }
            }
        }
        let result = [] as DocumentInterface[];
        let keys = Object.keys(mapFileNameToRecord);
        for (let key of keys) {
            result.push(mapFileNameToRecord[key]);
        }
        keys = Object.keys(mapDocumentNumber0ToRecord);
        for (let key of keys) {
            result.push(mapDocumentNumber0ToRecord[key]);
        }
        keys = Object.keys(mapDocumentNumber1ToRecord);
        for (let key of keys) {
            result.push(mapDocumentNumber1ToRecord[key]);
        }
        keys = Object.keys(mapDocumentNumber2ToRecord);
        for (let key of keys) {
            result.push(mapDocumentNumber2ToRecord[key]);
        }
        keys = Object.keys(mapPartNumber0ToRecord);
        for (let key of keys) {
            result.push(mapPartNumber0ToRecord[key]);
        }
        keys = Object.keys(mapPartNumber1ToRecord);
        for (let key of keys) {
            result.push(mapPartNumber1ToRecord[key]);
        }
        keys = Object.keys(mapPartNumber2ToRecord);
        for (let key of keys) {
            result.push(mapPartNumber2ToRecord[key]);
        }
        return result;
    };
    let downloadToDefaultDirectory = async (fileID: Guid, fileName: string) => {
        let defaultDirectory = localConfig.get().defaultDirectory;
        let filePath = Path.Combine(defaultDirectory, fileName);
        let fileInterface = await server.storageService.getFileByID(fileID);
        server.storageService.exportContentToFilePath(fileInterface.FullContentMD5, filePath);
    };
    registerService = () => {
        server.use(`/api/v1/xplm/import`, async (data: ImportInterface[]) => {
            return await importDocumentsToDirectory(data);
        });
        server.use(`/api/v1/xplm/isImported`, async (data: ImportInterface[]) => {
            let result = [] as any[];
            for (let importData of data) {
                let isImported = await isArchivedDocument(importData);
                result.push({
                    ...importData,
                    isImported
                });
            }
            return result;
        });
        server.use(`/api/v1/xplm/getDocumentsByDirectory`, async (directory: string) => {
            return await getDocumentsByDirectory(directory);
        });
        server.use(`/api/v1/xplm/getDefaultDirectory`, async () => {
            if (localConfig.get().defaultDirectory) {
                return localConfig.get().defaultDirectory;
            }
            else {
                return defaultWorkSpaceDirectory;
            }
        });
        server.use(`/api/v1/xplm/setDefaultDirectory`, async (directory: string) => {
            localConfig.get().defaultDirectory = directory;
            localConfig.save();
        });
        server.use(`/api/v1/xplm/downloadToDefaultDirectory`, async (fileID: Guid, fileName: string) => {
            await downloadToDefaultDirectory(fileID, fileName);
        });

    };
    return {
        start,
        importDocumentsToDirectory,
        getDocumentsByDirectory
    }
};

let main = async () => {
    let client = Client();
    await client.start(19799);
    Console.ReadLine();
};

await main();