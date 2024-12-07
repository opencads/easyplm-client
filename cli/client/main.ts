import { args, env, md5 } from '../.tsc/context';
import { database } from '../.tsc/Cangjie/TypeSharp/System/database';
import { databaseInterface } from '../.tsc/Cangjie/TypeSharp/System/databaseInterface';
import { Console } from '../.tsc/System/Console';
import { Server } from '../.tsc/Cangjie/TypeSharp/System/Server';
import { Path } from '../.tsc/System/IO/Path';
import { DocumentInterface, ImportInterface } from './interfaces';
import { Regex } from '../.tsc/System/Text/RegularExpressions/Regex';
import { File } from '../.tsc/System/IO/File';
import { fileUtils } from '../.tsc/Cangjie/TypeSharp/System/fileUtils';
import { DateTime } from '../.tsc/System/DateTime';
import { Environment } from '../.tsc/System/Environment';
import { Directory } from '../.tsc/System/IO/Directory';

let DatabaseInterfaces = () => {
    let documentInterface = {
        name: 'document',
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
                name: 'directory',
                type: 'char',
                length: 256,
                isIndexSet: true
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

    return {
        documentInterface
    };
};

let Client = () => {
    let server = new Server();
    let db: database;
    let databaseInterfaces = DatabaseInterfaces();
    let registerService = () => {

    };
    let start = async (port: number) => {
        await server.start(port);
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
            formatFileName: formatFileName,
            directory: data.directory,
        }
    };
    let importDocument = async (data: ImportInterface) => {
        let abstract = formatImport(data);
        if (await db.containsByIndex(databaseInterfaces.documentInterface.name, "key", abstract.key)) {
            let record = await db.findByIndex(databaseInterfaces.documentInterface.name, "key", abstract.key) as DocumentInterface;
            if (record.documentRemoteID == "" && data.documentRemoteID) {
                record.documentRemoteID = data.documentRemoteID;
            }
            if (record.partRemoteID == "" && data.partRemoteID) {
                record.partRemoteID = data.partRemoteID;
            }
            if (record.displayName == "" && data.displayName) {
                record.displayName = data.displayName;
            }
            await db.updatebyMaster(databaseInterfaces.documentInterface.name, record);
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
    let isImportedDocument = async (data: ImportInterface) => {
        let abstract = formatImport(data);
        if (await db.containsByIndex(databaseInterfaces.documentInterface.name, "key", abstract.key)) {
            return true;
        }
        else {
            return false;
        }
    };
    let getDocumentsByDirectory = async (directory: string) => {
        let records = await db.findByIndexSet(databaseInterfaces.documentInterface.name, "directory", directory) as DocumentInterface[];
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
    registerService = () => {
        server.use(`/api/v1/xplm/import`, async (data: ImportInterface[]) => {
            let result = [] as DocumentInterface[];
            for (let importData of data) {
                let record = await importDocument(importData);
                result.push(record);
            }
            return result;
        });
        server.use(`/api/v1/xplm/isImported`, async (data: ImportInterface[]) => {
            let result = [] as any[];
            for (let importData of data) {
                let isImported = await isImportedDocument(importData);
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
    };
    return {
        start,
        importDocument,
        getDocumentsByDirectory
    }
};

let main = async () => {
    let client = Client();
    await client.start(19799);
};

await main();