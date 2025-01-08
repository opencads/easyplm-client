export interface Attributes {
    [key: string]: string;
}

export interface Component {
    Name: string;
    FamilyInstanceName?: string; // 族表实例名
    FileName: string;
    FilePath: string;
    ComponentAttributes: Attributes;
    InstanceAttributes?: Attributes; // 实例属性
    ComponentProperties: {
        Matrix: string[];
    };
    Children: (Component & {
        InstanceAttributes?: never; // 不允许存在
        FamilyInstanceName?: never; // 不允许存在
    })[];
}

export interface FamilyTableData {
    Children: FamilyTableData[];
    [key: string]: any; // 允许其他属性,key必须在Columns中定义过
}

export interface DocInfo {
    SchemaVersion: string; // 例子: "3.2.0"
    Author?: string;
    CreateTime?: string; // 应用格式化处理
}

export interface DocumentProperties {
    Agent: {
        Name: "ZWCAD" | "AutoCAD" | "NX" | "Creo" | "Solidworks" | "Catia" | "GStarCAD" | "TGCAD" | "Inventor" | "Mentor" | "Cadence" | "Altium";
        MajorVersion?: string;
        MinorVersion?: string;
    },
    PDFPaths?: string[];
    StepPaths?: string[];
    StlPaths?: string[];
    JTPaths?: string[];
    DwgPaths?: string[];
    DxfPaths?: string[];
    MengxiPath?: string[];
}

export interface RawJsonDocument {
    FileName: string;
    FilePath: string;
    Attributes?: Attributes;
    Properties: DocumentProperties;
    Children?: Component[];
    Sheets?: {
        Hash: string;
        Name: string;
        ReferenceDocuments: string[];
    }[];
    FamilyTable?: {
        Columns: {
            Key: string;
            Type: string | number;
        }[];
        Data: FamilyTableData;
    };
    PMI?: {//3.2.0置空
        Notes?: {
            Hash: string; // 至少使用这三种数据进行哈希：使用平面变换矩阵、注释的相对位置、文本信息
            PlaneTransform?: string[]; // 固定长度16 //需要确认、修正
            Location?: string[]; // 固定长度3
            Text?: string;
            Views?: {
                ViewTransform: string[]; // 固定长度16
            }[];
        }[];
    }
    Features?: { Hash: string; }[];
    ReferenceDocuments?: string[];
}

export interface RawJson {
    DocInfo: DocInfo;
    Documents: RawJsonDocument[];
}


export interface WebMessage {
    success: boolean;
    code: number;
    message: string;
    data: any;
}