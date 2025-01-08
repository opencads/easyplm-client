import { args, cmdAsync, deleteDirectory, env, execAsync, md5 } from '../.tsc/context';
import { database } from '../.tsc/Cangjie/TypeSharp/System/database';
import { databaseInterface } from '../.tsc/Cangjie/TypeSharp/System/databaseInterface';
import { Console } from '../.tsc/System/Console';
import { Server } from '../.tsc/Cangjie/TypeSharp/System/Server';
import { Path } from '../.tsc/System/IO/Path';
import { ContentToRawjsonRelation, DirectoryInterface, DocumentInterface, DocumentWithRawJsonInterface, GitRemote, ImportInterface, LocalSubscriber, PluginSubscriber, ScanResult } from './interfaces';
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
import { axios } from '../.tsc/Cangjie/TypeSharp/System/axios';
import { zip } from '../.tsc/Cangjie/TypeSharp/System/zip';
import { GitHubRelease } from "./git-interfaces";
import { stringUtils } from "../.tsc/Cangjie/TypeSharp/System/stringUtils";
import { PluginInterface } from '../.tsc/VizGroup/V1/TaskQueues/Plugins/PluginInterface';
import { Task } from '../.tsc/System/Threading/Tasks/Task';
import { datetimeUtils } from '../.tsc/Cangjie/TypeSharp/System/datetimeUtils';
import { taskUtils } from "../.tsc/Cangjie/TypeSharp/System/taskUtils";
import { RawJson } from '../../../easyplm-plugins/cli/IRawJson';
let appDataDirectory = Path.Combine(env('userprofile'), '.xplm');
if (Directory.Exists(appDataDirectory) == false) {
    Directory.CreateDirectory(appDataDirectory);
}
let downloadDirectory = Path.Combine(appDataDirectory, 'download');
if (Directory.Exists(downloadDirectory) == false) {
    Directory.CreateDirectory(downloadDirectory);
}
let defaultWorkSpaceDirectory = Path.Combine(env('mydocuments'), '.xplm', 'WorkSpace');
if (Directory.Exists(defaultWorkSpaceDirectory) == false) {
    Directory.CreateDirectory(defaultWorkSpaceDirectory);
}
let pluginsDirectory = Path.Combine(appDataDirectory, 'plugins');
if (Directory.Exists(pluginsDirectory) == false) {
    Directory.CreateDirectory(pluginsDirectory);
}
let databaseDirectory = Path.Combine(appDataDirectory, 'database');
if (Directory.Exists(databaseDirectory) == false) {
    Directory.CreateDirectory(databaseDirectory);
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
                name: 'updateTime',
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
                name: 'rawJsonDocumentMD5',
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
            },
            {
                name: 'fileLastWriteTime',
                type: 'DateTime'
            },
            {
                name: 'fileLength',
                type: 'int64'
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
    let cotentToRawjsonRelationInterface = {
        name: 'xplm/contentToRawjsonRelation',
        fields: [
            {
                name: 'id',
                isMaster: true,
                type: 'Guid'
            },
            {
                name: 'contentMD5',
                type: 'md5',
                isIndex: true
            },
            {
                name: 'rawJsonMD5',
                type: 'md5',
                isIndexSet: true
            }
        ]
    } as databaseInterface;
    return {
        documentInterface,
        directoryInterface,
        cotentToRawjsonRelationInterface
    };
};

let GitManager = () => {
    let getGitInfo = (url: string) => {
        // https://github.com/opencads/xplm-ui-home.git
        if (url.endsWith(".git")) {
            url = url.substring(0, url.length - 4);
        }
        if (url.startsWith("https://")) {
            url = url.substring(8);
        }
        else if (url.startsWith("http://")) {
            url = url.substring(7);
        }
        let items = url.split("/");
        if (items.length > 2) {
            return {
                success: true,
                owner: items[1],
                repo: items[2]
            }
        }
        else {
            return {
                success: false,
                owner: "",
                repo: ""
            }
        }
    };
    // 根据git release下载、判断是否更新等功能
    let getLatestRelease = async (owner: string, repo: string) => {
        // 构造用于获取最新发布的 GitHub API URL
        let url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
        let response = await axios.get(url, {
            headers: {
                'User-Agent': 'tscl'
            }
        });

        if (response.status == 200) {
            return response.data as GitHubRelease;
        }
        else {
            throw `获取最新发布失败: ${response.status}`;
        }

    };
    let downloadRelease = async (owner: string, repo: string, outputDirectory: string) => {
        let latestRelease = await getLatestRelease(owner, repo);
        let lastRelease = {} as GitHubRelease;
        let localReleaseJsonPath = Path.Combine(outputDirectory, '.xplm.gitrelease.json');
        if (File.Exists(localReleaseJsonPath)) {
            lastRelease = Json.Load(localReleaseJsonPath);
        }
        // 判断版本是否一致，不一致就下载
        if (latestRelease.tag_name != lastRelease.tag_name) {
            let downloadPaths = [] as string[];
            for (let asset of latestRelease.assets) {
                let downloadUrl = asset.browser_download_url;
                let downloadPath = Path.Combine(outputDirectory, Path.GetFileName(downloadUrl));
                downloadPaths.push(downloadPath);
                await axios.download(downloadUrl, downloadPath);
            }
            for (let downloadPath of downloadPaths) {
                let zipExtractDirectory = Path.Combine(outputDirectory, Path.GetFileNameWithoutExtension(downloadPath));
                await zip.extract(downloadPath, zipExtractDirectory);
            }
            // 下载完成后，更新本地版本号
            File.WriteAllText(localReleaseJsonPath, JSON.stringify(latestRelease));
        }
    };
    let cloneRepository = async (url: string, outputDirectory: string) => {
        let gitDirectory = Path.Combine(outputDirectory, '.git');
        if (Directory.Exists(gitDirectory)) {
            await cmdAsync(outputDirectory, `git pull`);
        }
        else {
            await cmdAsync(outputDirectory, `git clone ${url} .`);
        }
    };
    let getRemotes = async (outputDirectory: string) => {
        let cmdResult = await cmdAsync(outputDirectory, `git remote -v`, {
            redirect: true,
            useShellExecute: false
        });
        let lines = (cmdResult.output ?? "").replace('\r', '').split('\n');
        let result = [] as GitRemote[];
        for (let line of lines) {
            let items = line.split('\t');
            if (items.length == 2) {
                let subItems = items[1].split(' ');
                result.push({
                    name: items[0],
                    url: subItems[0],
                    type: stringUtils.trim(subItems[1], '()') as any
                });
            }
        }
        return result;
    };
    return {
        getGitInfo,
        getLatestRelease,
        downloadRelease,
        cloneRepository,
        getRemotes
    };
};

let gitManager = GitManager();

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
    let getDefaultDirectory = () => {
        return config.defaultDirectory ?? defaultWorkSpaceDirectory;
    };
    let setDefaultDirectory = (directory: string) => {
        config.defaultDirectory = directory;
        save();
    };
    let getPluginSubscribers = () => {
        return (config.pluginSubscribers ?? []) as PluginSubscriber[];
    };
    let setPluginSubscribers = (pluginSubscribers: PluginSubscriber[]) => {
        config.pluginSubscribers = pluginSubscribers;
        save();
    };
    let addPluginSubscriber = (pluginSubscriber: PluginSubscriber) => {
        let pluginSubscribers = getPluginSubscribers();
        if (pluginSubscribers.find(item => item.name == pluginSubscriber.name || item.url == pluginSubscriber.url)) {
            throw `Plugin ${pluginSubscriber.name}/${pluginSubscriber.url} already subscribed`;
        }
        pluginSubscribers.push(pluginSubscriber);
        setPluginSubscribers(pluginSubscribers);
    };
    load();
    return {
        load,
        save,
        get: () => config,
        getDefaultDirectory,
        getPluginSubscribers,
        setPluginSubscribers,
        addPluginSubscriber,
        setDefaultDirectory,

    };
};

let localConfig = LocalConfig();

let PluginManager = () => {
    let updateSubscribers = async () => {
        let subscribers = localConfig.getPluginSubscribers();
        for (let subscriber of subscribers) {
            let outputDirectory = Path.Combine(pluginsDirectory, subscriber.name);
            if (!Directory.Exists(outputDirectory)) {
                Directory.CreateDirectory(outputDirectory);
            }
            if (subscriber.type == 'git-release') {
                let gitInfo = gitManager.getGitInfo(subscriber.url);
                await gitManager.downloadRelease(gitInfo.owner, gitInfo.repo, outputDirectory);
            }
            else if (subscriber.type == 'git-repository') {
                await gitManager.cloneRepository(subscriber.url, outputDirectory);
            }
        }
    };
    let getLocalSubscribers = async () => {
        let subDirectories = Directory.GetDirectories(pluginsDirectory);
        let result = [] as LocalSubscriber[];
        for (let subDirectory of subDirectories) {
            let localReleaseJsonPath = Path.Combine(subDirectory, '.xplm.gitrelease.json');
            let gitDirectory = Path.Combine(subDirectory, '.git');
            if (File.Exists(localReleaseJsonPath)) {
                let gitReleaseJson = Json.Load(localReleaseJsonPath) as GitHubRelease;
                result.push({
                    name: Path.GetFileName(subDirectory),
                    url: gitReleaseJson.html_url
                });
            }
            else if (Directory.Exists(gitDirectory)) {
                let remotes = await gitManager.getRemotes(subDirectory);
                let fetchUrl = remotes.find(item => item.type == 'fetch')?.url;
                result.push({
                    name: Path.GetFileName(subDirectory),
                    url: fetchUrl ?? ""
                });
            }
        }
        return result;
    };
    let removeLocalSubscriber = (name: string) => {
        let subDirectory = Path.Combine(pluginsDirectory, name);
        if (Directory.Exists(subDirectory)) {
            deleteDirectory(subDirectory);
        }
    };
    return {
        updateSubscribers,
        getLocalSubscribers,
        removeLocalSubscriber
    };
};

let pluginManager = PluginManager();

let Client = () => {
    let server = new Server();
    server.ApplicationConfig.PluginsDirectory = pluginsDirectory;
    server.ApplicationConfig.DatabasePath = Path.Combine(databaseDirectory, `${Environment.UserName}.db`);
    console.log(server.ApplicationConfig);
    let db: database;
    let databaseInterfaces = DatabaseInterfaces();
    let localConfig = LocalConfig();
    let emptyMD5 = md5("");
    let registerService = () => {

    };
    let start = async (port: number) => {
        console.log(`start server at port ${port}`);
        server.start(port);
        console.log(`...`);
        await server.onConfigCompleted.Task;
        console.log(`server config completed`);
        db = server.getDatabase();
        let interfaceKeys = Object.keys(databaseInterfaces);
        for (let interfaceKey of interfaceKeys) {
            let databaseInterface = databaseInterfaces[interfaceKey];
            await db.register(databaseInterface);
        }
        console.log(`register database`);
        registerService();
        console.log(`update plugin subscribers`);
        await pluginManager.updateSubscribers();
        console.log(`server started`);
    };
    let formatDirectory = (directory: string) => {
        return directory.replace('\\', '/').toLowerCase();
    };
    let digitFileExtensionReg = new Regex('\\.\\d+$');
    let getLowerFormatFileName = (filePath: string) => {
        return digitFileExtensionReg.Replace(Path.GetFileName(filePath), "").toLowerCase();
    };
    let formatImport = async (data: ImportInterface) => {
        let fileName = data.filePath == undefined ? "" : Path.GetFileName(data.filePath);
        let formatFileName = "";
        if (fileName != "") {
            formatFileName = digitFileExtensionReg.Replace(fileName, "");
        }
        let contentMD5 = "";
        let containsContentMD5 = false;
        if (data.filePath != undefined && (File.Exists(data.filePath))) {
            contentMD5 = fileUtils.md5(data.filePath);
            containsContentMD5 = true;
        }
        else {
            contentMD5 = md5("");
        }
        let rawJsonDocumentMD5 = "";
        if (data.rawJsonDocument) {
            rawJsonDocumentMD5 = md5(JSON.stringify(data.rawJsonDocument, null, 0));
        }
        if (rawJsonDocumentMD5 == "") {
            rawJsonDocumentMD5 = md5("");
        }
        let abstract = {
            lowerFormatFileName: formatFileName.toLowerCase(),
            contentMD5: contentMD5,
            rawJsonDocumentMD5: rawJsonDocumentMD5,
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
            lowerFormatFileName: formatFileName.toLowerCase(),
            fileLastWriteTime: (File.Exists(data.filePath) ? fileUtils.lastWriteTime(data.filePath) : DateTime.MinValue),
            fileLength: (File.Exists(data.filePath) ? fileUtils.size(data.filePath) : 0)
        };
    };
    let tryAddToDirectory = async (directory: string, documentIDs: Guid[]) => {
        directory = formatDirectory(directory);
        let directoryRecords = await db.findByIndexSet(databaseInterfaces.directoryInterface.name, "path", directory) as DirectoryInterface[];
        if (directoryRecords.length == 0) {
            console.log(`directoryRecords.length == 0`);
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
                    console.log(`isUpdated, documents: ${documents}`);
                    directoryRecord.documents = documents;
                    await db.updatebyMaster(databaseInterfaces.directoryInterface.name, directoryRecord);
                }
            }
            console.log(`documentIDs: ${documentIDs}`);
            for (let i = 0; i < documentIDs.length; i += 32) {
                let documentIDsChunk = documentIDs.slice(i, i + 32);
                let directoryRecord = {
                    path: directory.toLowerCase(),
                    documents: documentIDsChunk
                } as DirectoryInterface;
                console.log(`insert directoryRecord: ${directoryRecord}`);
                await db.insert(databaseInterfaces.directoryInterface.name, directoryRecord);
            }
        }
    };
    let isContentToRawJsonRelation = async (contentMD5: string) => {
        return await db.containsByIndex(databaseInterfaces.cotentToRawjsonRelationInterface.name, "contentMD5", contentMD5);
    };
    let getRawJsonByContentMD5 = async (contentMD5: string) => {
        if (await db.containsByIndex(databaseInterfaces.cotentToRawjsonRelationInterface.name, "contentMD5", contentMD5)) {
            let relation = await db.findByIndex(databaseInterfaces.cotentToRawjsonRelationInterface.name, "contentMD5", contentMD5) as ContentToRawjsonRelation;
            let rawJsonMD5 = relation.rawJsonMD5;
            return await server.storageService.readContent(rawJsonMD5);
        }
        else {
            return null;
        }
    };
    let cacheRawJson = async (contentMD5: string, rawJson: RawJson) => {
        let rawJsonString = JSON.stringify(rawJson, null, 0);
        let rawJsonMD5 = md5(rawJsonString);
        await server.storageService.importString(rawJsonString);
        await tryCreateContentToRawjsonRelation(contentMD5, rawJsonMD5);
    };
    let tryCreateContentToRawjsonRelation = async (contentMD5: string, rawJsonMD5: string) => {
        if (await db.containsByIndex(databaseInterfaces.cotentToRawjsonRelationInterface.name, "contentMD5", contentMD5)) {
            // 已存在
        }
        else {
            let relation = {
                contentMD5: contentMD5,
                rawJsonMD5: rawJsonMD5
            } as ContentToRawjsonRelation;
            await db.insert(databaseInterfaces.cotentToRawjsonRelationInterface.name, relation);
        }
    };
    let archiveDocument = async (data: ImportInterface) => {
        let abstract = await formatImport(data);
        await server.storageService.importString(JSON.stringify(data.rawJsonDocument, null, 0));
        if (data.filePath && File.Exists(data.filePath)) {
            await server.storageService.importFile(data.filePath);
        }
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
                record.updateTime = DateTime.Now;
                await db.updatebyMaster(databaseInterfaces.documentInterface.name, record);
            }
            return record as DocumentInterface;
        }
        else {
            let record = {
                ...abstract,
                createTime: DateTime.Now,
                updateTime: DateTime.Now,
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
        let abstract = await formatImport(data);
        if (await db.containsByIndex(databaseInterfaces.documentInterface.name, "key", abstract.key)) {
            return true;
        }
        else {
            return false;
        }
    };
    let getDocumentsByDirectory = async (directory: string) => {
        directory = formatDirectory(directory);
        let directoryRecords = await db.findByIndexSet(databaseInterfaces.directoryInterface.name, "path", directory) as DirectoryInterface[];
        let records = [] as DocumentInterface[];
        for (let directoryRecord of directoryRecords) {
            let documentIDs = directoryRecord.documents;
            for (let documentID of documentIDs) {
                if (documentID == Guid.Empty) {
                    continue;
                }
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
                    if (record.updateTime > mapFileNameToRecord[record.lowerFormatFileName].updateTime) {
                        mapFileNameToRecord[record.lowerFormatFileName] = record;
                    }
                }
                else {
                    mapFileNameToRecord[record.lowerFormatFileName] = record;
                }
            }
            else if (record.documentNumber0.length > 0) {
                if (mapDocumentNumber0ToRecord[record.documentNumber0]) {
                    if (record.updateTime > mapDocumentNumber0ToRecord[record.documentNumber0].updateTime) {
                        mapDocumentNumber0ToRecord[record.documentNumber0] = record;
                    }
                }
                else {
                    mapDocumentNumber0ToRecord[record.documentNumber0] = record;
                }
            }
            else if (record.documentNumber1.length > 0) {
                if (mapDocumentNumber1ToRecord[record.documentNumber1]) {
                    if (record.updateTime > mapDocumentNumber1ToRecord[record.documentNumber1].updateTime) {
                        mapDocumentNumber1ToRecord[record.documentNumber1] = record;
                    }
                }
                else {
                    mapDocumentNumber1ToRecord[record.documentNumber1] = record;
                }
            }
            else if (record.documentNumber2.length > 0) {
                if (mapDocumentNumber2ToRecord[record.documentNumber2]) {
                    if (record.updateTime > mapDocumentNumber2ToRecord[record.documentNumber2].updateTime) {
                        mapDocumentNumber2ToRecord[record.documentNumber2] = record;
                    }
                }
                else {
                    mapDocumentNumber2ToRecord[record.documentNumber2] = record;
                }
            }
            else if (record.partNumber0.length > 0) {
                if (mapPartNumber0ToRecord[record.partNumber0]) {
                    if (record.updateTime > mapPartNumber0ToRecord[record.partNumber0].updateTime) {
                        mapPartNumber0ToRecord[record.partNumber0] = record;
                    }
                }
                else {
                    mapPartNumber0ToRecord[record.partNumber0] = record;
                }
            }
            else if (record.partNumber1.length > 0) {
                if (mapPartNumber1ToRecord[record.partNumber1]) {
                    if (record.updateTime > mapPartNumber1ToRecord[record.partNumber1].updateTime) {
                        mapPartNumber1ToRecord[record.partNumber1] = record;
                    }
                }
                else {
                    mapPartNumber1ToRecord[record.partNumber1] = record;
                }
            }
            else if (record.partNumber2.length > 0) {
                if (mapPartNumber2ToRecord[record.partNumber2]) {
                    if (record.updateTime > mapPartNumber2ToRecord[record.partNumber2].updateTime) {
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
        let defaultDirectory = localConfig.getDefaultDirectory();
        let filePath = Path.Combine(defaultDirectory, fileName);
        let fileInterface = await server.storageService.getFileByID(fileID);
        await server.storageService.exportContentToFilePath(fileInterface.FullContentMD5, filePath);
        console.log(`downloaded ${fileID} to ${filePath}`);
    };

    let scanDirectory = async (directory: string) => {
        let documents = await getDocumentsByDirectory(directory);
        let files = Directory.GetFiles(directory);
        let result = {
            untrackedFiles: [],
            documents: [],
            modifiedDocuments: [],
            missingDocuments: [],
        } as ScanResult;

        let digitFileNameToFilePath = {} as {
            [key: string]: {
                filePath: string,
                digit: number
            }
        };
        let filteredFiles = [] as string[];
        for (let file of files) {
            if (digitFileExtensionReg.IsMatch(file)) {
                let fileName = Path.GetFileNameWithoutExtension(file).toLowerCase();
                let digit = Number(Path.GetExtension(file).substring(1));
                if (digitFileNameToFilePath[fileName]) {
                    if (digitFileNameToFilePath[fileName].digit >= digit) {
                        filteredFiles.push(file);
                        continue;
                    }
                    else if (digitFileNameToFilePath[fileName].digit < digit) {
                        filteredFiles.push(digitFileNameToFilePath[fileName].filePath);
                        digitFileNameToFilePath[fileName] = {
                            filePath: file,
                            digit
                        };
                    }
                }
                else {
                    digitFileNameToFilePath[fileName] = {
                        filePath: file,
                        digit
                    };
                }
            }
        }
        for (let file of files) {
            if (filteredFiles.includes(file)) {
                continue;
            }
            let lowerFormatFileName = getLowerFormatFileName(file);
            let document = documents.find(item => item.lowerFormatFileName == lowerFormatFileName);
            if (document == undefined) {
                result.untrackedFiles.push(file);
            }
            else {
                if (datetimeUtils.isSameWithMillisecond(document.fileLastWriteTime, fileUtils.lastWriteTime(file)) == false) {
                    result.modifiedDocuments.push(document);
                }
                else if (document.fileLength != fileUtils.size(file)) {
                    result.modifiedDocuments.push(document);
                }
                else result.documents.push(document);
            }
        }
        for (let document of documents) {
            if (result.documents.includes(document) == false && (result.modifiedDocuments.includes(document) == false)) {
                result.missingDocuments.push(document);
            }
        }
        let tasks = [] as any[];
        for (let document of result.documents) {
            let tempDocument = document;
            tasks.push((async () => {
                let rawJsonContent = await server.storageService.readContent(tempDocument.rawJsonDocumentMD5);
                if (Json.Validate(rawJsonContent)) {
                    (tempDocument as DocumentWithRawJsonInterface).rawJsonDocument = JSON.parse(rawJsonContent);
                }
            })());

        }
        for (let document of result.modifiedDocuments) {
            let tempDocument = document;
            tasks.push((async () => {
                let rawJsonContent = await server.storageService.readContent(tempDocument.rawJsonDocumentMD5);
                if (Json.Validate(rawJsonContent)) {
                    (tempDocument as DocumentWithRawJsonInterface).rawJsonDocument = Json.Parse(rawJsonContent);
                }
            })());

        }
        for (let document of result.missingDocuments) {
            let tempDocument = document;
            tasks.push((async () => {
                let rawJsonContent = await server.storageService.readContent(tempDocument.rawJsonDocumentMD5);
                if (Json.Validate(rawJsonContent)) {
                    (tempDocument as DocumentWithRawJsonInterface).rawJsonDocument = Json.Parse(rawJsonContent);
                }
            })());

        }
        taskUtils.whenAll(tasks);
        return result;
    };

    let getPlugins = () => {
        let result = [] as PluginInterface[];
        server.serviceScope.TaskService.PluginCollection.GetPlugins(item => {
            if (item) {
                result.push(item);
            }
        });
        return result;
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
        server.use(`/api/v1/xplm/setDefaultDirectory`, async (defaultDirectory: string) => {
            localConfig.setDefaultDirectory(defaultDirectory);
        });
        server.use(`/api/v1/xplm/getPluginSubscribers`, async () => {
            return localConfig.getPluginSubscribers();
        });
        server.use(`/api/v1/xplm/setPluginSubscribers`, async (subscribers: PluginSubscriber[]) => {
            localConfig.setPluginSubscribers(subscribers);
        });
        server.use(`/api/v1/xplm/addPluginSubscriber`, async (subscriber: PluginSubscriber) => {
            localConfig.addPluginSubscriber(subscriber);
        });
        server.use(`/api/v1/xplm/updatePlugins`, async () => {
            await pluginManager.updateSubscribers();
        });
        server.use(`/api/v1/xplm/downloadToDefaultDirectory`, async (fileID: Guid, fileName: string) => {
            await downloadToDefaultDirectory(fileID, fileName);
        });
        server.use(`/api/v1/xplm/getLocalSubscribers`, async () => {
            return await pluginManager.getLocalSubscribers();
        });
        server.use(`/api/v1/xplm/removeLocalSubscriber`, async (name: string) => {
            return pluginManager.removeLocalSubscriber(name);
        });
        server.use(`/api/v1/xplm/getPlugins`, async () => {
            return getPlugins();
        });
        server.use(`/api/v1/xplm/scanDirectory`, async (directory: string) => {
            return await scanDirectory(directory);
        });
        server.use(`/api/v1/xplm/scanDefaultDirectory`, async () => {
            return await scanDirectory(localConfig.getDefaultDirectory());
        });
        server.use(`/api/v1/xplm/getContentArchivePath`, async (contentMD5: string) => {
            return server.storageService.getContentArchivePath(contentMD5);
        });
        server.use(`/api/v1/xplm/isContentToRawJsonRelation`, async (contentMD5: string) => {
            return await isContentToRawJsonRelation(contentMD5);
        });
        server.use(`/api/v1/xplm/getRawJsonByContentMD5s`, async (contentMD5s: any[]) => {
            let result = [] as any[];
            for (let contentMD5 of contentMD5s) {
                let rawJsonContent = await getRawJsonByContentMD5(contentMD5);
                if (rawJsonContent) {
                    result.push({
                        contentMD5: contentMD5,
                        rawJson: JSON.parse(rawJsonContent)
                    });
                }
                else {
                    result.push({
                        contentMD5: contentMD5,
                        rawJson: null
                    });
                }
            }
            return result;
        });
        server.use(`/api/v1/xplm/cacheRawJson`, async (items: {
            contentMD5: string,
            rawJson: any
        }[]) => {
            for (let item of items) {
                await cacheRawJson(item.contentMD5, item.rawJson);
            }
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