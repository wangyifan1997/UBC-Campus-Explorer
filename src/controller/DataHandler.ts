import {GeoResponse, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {JSZipObject} from "jszip";
import * as fs from "fs-extra";

export default class DataHandler {
    private allId: string[];
    private allDataset: any;
    private path: string;
    private folder: string;
    private allInsightDataset: InsightDataset[];
    private sectionCounter: number;
    private http: any;
    private parse5: any;
    private zip: JSZip;

    constructor() {
        this.http = require("http");
        this.parse5 = require("parse5");
        this.allId = [];
        this.allDataset = {};
        this.path = "./data";
        this.folder = "courses";
        this.allInsightDataset = [];
        this.sectionCounter = 0;
        this.zip = new JSZip();
    }

    private isIdIllegal(id: string): boolean {
        if (id === null) {
            return true;
        } else {
            let count: number = 0;
            for (let letter of id) {
                if (letter === " ") {
                    count++;
                }
                if (letter === "_") {
                    return true;
                }
            }
            return count === id.length;
        }
    }

    public resetZip(): void {
        this.zip = new JSZip();
    }

    private isIdAdded(id: string): boolean {
        return this.allId.includes(id);
    }

    public isIdOkToAdd(id: string): Promise<any> {
        this.readDataset();
        if (this.isIdIllegal(id)) {
            return Promise.reject(new InsightError());
        }
        if (this.isIdAdded(id)) {
            return Promise.reject(new NotFoundError());
        }
        return Promise.resolve();
    }

    public isIdOkToDelete(id: string): Promise<any> {
        this.readDataset();
        if (this.isIdIllegal(id)) {
            return Promise.reject(new InsightError());
        }
        if (!this.isIdAdded(id)) {
            return Promise.reject(new NotFoundError());
        }
        return Promise.resolve();
    }

    public myLoadAsync(content: string) {
        try {
            this.resetZip();
            return this.zip.loadAsync(content, {base64: true});
        } catch (e) {
            return Promise.reject(new InsightError());
        }
    }

    public getAllBuildings(zipData: JSZip): Promise<any> {
        try {
            return zipData.file("rooms/index.htm").async("text");
        } catch (e) {
            return Promise.reject(new InsightError());
        }
    }

    // TODO 考虑building的path是否存在？（我觉得其实不用）
    public getAllBuildingInIndex(content: string): Promise<any> {
        let parsedIndex: any = this.parse5.parse(content);
        let allTr: any[] = [];
        this.findElement(parsedIndex, "nodeName", "tr", allTr);
        let buildingResult: any[] = [];
        for (let tr of allTr) {
            try {
                let building: any = this.makeBuilding(tr);
                if (Object.keys(building).length < 4) {
                    continue;
                }
                buildingResult.push(this.makeBuilding(tr));
            } catch (err) {
                continue;
            }
        }
        return Promise.resolve(buildingResult);
    }

    public getAllRoomsInBuilding(buildings: any[]): Promise<any> {
        for (let building of buildings) {
            let allRooms: any = building["rooms"];
            let allTr: any[] = [];
            this.findElement(allRooms, "nodeName", "tr", allTr);
            let roomResult: any[] = [];
            for (let tr of allTr) {
                try {
                    roomResult.push(this.makeRoom(tr));
                } catch (err) {
                    continue;
                }
            }
            building["rooms"] = roomResult;
        }
        return Promise.resolve(buildings);
    }

    private makeRoom(tr: any): any {
        let room: any = {};
        for (let element of tr["childNodes"]) {
            if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("room-number")) {
                room["number"] = element["childNodes"][1]["attrs"][0]["value"];
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("capacity")) {
                let seats: string = element["childNodes"][0]["value"].replace(/(\n)/gm, "").trim();
                if (seats === "") {
                    room["seats"] = 0;
                } else {
                    room["seats"] = Number(seats);
                }
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("furniture")) {
                let furniture: string = element["childNodes"][0]["value"];
                room["furniture"] = furniture.replace(/(\n)/gm, "").trim();
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("room-type")) {
                let type = element["childNodes"][0]["value"];
                room["type"] = type.replace(/(\n)/gm, "").trim();
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("field-nothing")) {
                room["href"] = element["childNodes"][1]["attrs"][0]["value"];
            }
        }
        return room;
    }

    private findElement(obj: any, type: string, target: string, result: any[]): void {
        if (typeof obj === "undefined") {
            return;
        } else if (obj[type] === target) {
            result.push(obj);
        } else {
            if (typeof obj["childNodes"] !== "undefined") {
                for (let node of obj["childNodes"]) {
                    this.findElement(node, type, target, result);
                }
            }
        }
    }

    private makeBuilding(tr: any): any {
        let building: any = {};
        for (let element of tr["childNodes"]) {
            if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("field-nothing")) {
                building["path"] = element["childNodes"][1]["attrs"][0]["value"];
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("building-code")) {
                let shortname: string = element["childNodes"][0]["value"];
                building["shortname"] = shortname.replace(/(\n)/gm, "").trim();
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("title")) {
                building["fullname"] = element["childNodes"][1]["childNodes"][0]["value"];
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("address")) {
                let address = element["childNodes"][0]["value"];
                building["address"] = address.replace(/(\n)/gm, "").trim();
            }
        }
        return building;
    }

    public getAllRooms(buildings: any[], id: string): Promise<any> {
        // for (let building of buildings) {
        //
        //     for (let room of building["rooms"])
        // }
        return Promise.reject();
    }

    public getURLForBuildings(buildings: any[]): Promise<any[]> {
        let allPromises: any[] = buildings.map((building: any) => {
            return this.getURLForOneBuilding(building);
        });
        return Promise.all(allPromises);
    }

    private getURLForOneBuilding(building: any): Promise<any> {
        let address: string = building["address"];
        let convertedAddress: string = address.replace(" ", "%20");
        let url: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team" + "092/" + convertedAddress;
        building["url"] = url;
        return Promise.resolve(building);
        // return this.http.get(url).then((response: GeoResponse) => {
        //     building["lon"] = response.lon;
        //     building["lat"] = response.lat;
        //     return Promise.resolve(building);
        // }).catch((err: any) => {
        //     return Promise.reject(new InsightError());
        // });
    }

    public getHTTPForAllBuildings(buildings: any[]): Promise<any[]> {
        let allPromises: any[] = buildings.map((building: any) => {
            return this.getHttpResponseForOneBuilding(building);
        });
        return Promise.all(allPromises);
    }

    private getHttpResponseForOneBuilding(building: any): Promise<any> {
        let url: string = building["url"];
        let data: string = "";
        this.http.get(url, (res: any) => {
            res.on("data", (bits: string) => {
                data += bits;
            });
            res.on("end", () => {
                // eslint-disable-next-line no-console
                // console.log(JSON.parse(data));
                return Promise.resolve(JSON.parse(data));
            });
        }).on("error", (err: any) => {
            return Promise.reject(new InsightError());
        });
    }

    public getRoomsContentForBuildings(buildings: any[]): Promise<any> {
        let allPromises: any[] = buildings.map((building: any) => {
            return this.getRoomsContentForOneBuilding(building);
        });
        return Promise.all(allPromises);
    }


    private getRoomsContentForOneBuilding(building: any): Promise<any> {
        let path = building["path"].replace(".", "rooms");
        return this.zip.file(path).async("text").then((content: string) => {
            building["rooms"] = this.parse5.parse(content);
            return Promise.resolve(building);
        }).catch((err: any) => {
            return Promise.reject(new InsightError());
        });
    }

    public checkFolder(zipData: JSZip, kind: InsightDatasetKind): Promise<any> {
        let folder: JSZipObject[];
        if (kind === InsightDatasetKind.Courses) {
            folder = zipData.folder(/courses/);
        } else if (kind === InsightDatasetKind.Rooms) {
            folder = zipData.folder(/rooms/);
        }
        if (folder.length === 0) {
            return Promise.reject(InsightError);
        }
        return Promise.resolve(zipData);
    }

    public loadAllFilesToAllPromises(zipData: JSZip): Promise<string[]> {
        let allFiles: string[] = [];
        zipData.folder(this.folder).forEach((relativePath, file) => {
            allFiles.push(file.name);
        });
        let allPromises: any[] = allFiles.map((fileDir: string) => {
            return zipData.file(fileDir).async("text");
        });
        return Promise.all(allPromises);
    }

    public parseCourseJSON(contents: string[]): Promise<string[]> {
        let temp: any[] = [];
        for (let course of contents) {
            try {
                temp.push(JSON.parse(course));
            } catch (e) {
                continue;
            }
        }
        return Promise.resolve(temp);
    }

    public getAllSections(allCourses: any[], id: string): Promise<any> {
        let allSections: any[] = [];
        for (let course of allCourses) {
            let sections: any[] = course.result;
            for (let section of sections) {
                if (this.isValidSection(section)) {
                    section.id = section.id.toString();
                    if (typeof section.Section !== "undefined"
                        && section.Section.toLowerCase() === "overall") {
                        section.Year = 1900;
                    }
                    section.Year = Number(section.Year);
                    if (!isNaN(section.Year)) {
                        section = this.convertSection(section, id);
                        allSections.push(section);
                    }
                }
            }
        }
        this.sectionCounter = allSections.length;
        if (allSections.length === 0) {
            return Promise.reject(new InsightError());
        } else {
            return Promise.resolve(allSections);
        }
    }

    private convertSection(section: any, id: string): any {
        let newSection: any = {};
        for (let key of Object.keys(section)) {
            switch (key) {
                case "Subject":
                    newSection[id + "_" + "dept"] = section[key];
                    continue;
                case "Course":
                    newSection[id + "_" + "id"] = section[key];
                    continue;
                case "Avg":
                    newSection[id + "_" + "avg"] = section[key];
                    continue;
                case "Professor":
                    newSection[id + "_" + "instructor"] = section[key];
                    continue;
                case "Title":
                    newSection[id + "_" + "title"] = section[key];
                    continue;
                case "Pass":
                    newSection[id + "_" + "pass"] = section[key];
                    continue;
                case "Fail":
                    newSection[id + "_" + "fail"] = section[key];
                    continue;
                case "Audit":
                    newSection[id + "_" + "audit"] = section[key];
                    continue;
                case "id":
                    newSection[id + "_" + "uuid"] = section[key];
                    continue;
                case "Year":
                    newSection[id + "_" + "year"] = section[key];
                    continue;
                default:
                    continue;
            }
        }
        return newSection;
    }

    private isValidSection(section: any): boolean {
        return (typeof section.Subject === "string"
            && typeof section.Course === "string"
            && typeof section.Avg === "number"
            && typeof section.Professor === "string"
            && typeof section.Title === "string"
            && typeof section.Pass === "number"
            && typeof section.Fail === "number"
            && typeof section.Audit === "number"
            && typeof section.id === "number"
            && typeof section.Year === "string");
    }

    private checkDir() {
        if (!fs.pathExistsSync(this.path)) {
            fs.mkdirSync(this.path);
        }
    }

    public myWriteFile(id: string, allSections: any[]): Promise<any> {
        this.checkDir();
        let data: any = this.createDataToBeAdd(id, allSections);
        try {
            fs.writeFileSync(this.path + "/" + id, JSON.stringify(data));
        } catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve(data);
    }

    private myReadFile(path: string): any {
        let result: any = null;
        try {
            result = fs.readFileSync(path);
        } catch (e) {
            result = (e as Error).message;
        }
        return result;
    }

    public readDataset() {
        this.checkDir();
        this.allId = this.myReadEntryNames(this.path);
        for (let id of this.allId) {
            let writtenFile: any = this.myReadFile(this.path + "/" + id);
            writtenFile = JSON.parse(writtenFile);
            let sections: any[] = writtenFile[id];
            this.allDataset[id] = sections;
        }
    }

    private myReadEntryNames(path: string): string[] {
        let result: string[] = [];
        fs.readdirSync(path).forEach((file: string) => {
            result.push(file);
        });
        return result;
    }

    public myDeleteDataset(id: string) {
        try {
            fs.unlinkSync(this.path + "/" + id);
            this.removeFromDataset(id);
            this.removeId(id);
        } catch (e) {
            throw new InsightError();
        }
    }

    private createDataToBeAdd(id: string, allSections: any[]): any {
        let dataToBeAdd: { [id: string]: any } = {};
        dataToBeAdd[id] = allSections;
        return dataToBeAdd;
    }

    public addId(id: string) {
        this.allId.push(id);
    }

    private removeId(id: string) {
        for (let i: number = 0; i < this.allId.length; i++) {
            if (this.allId[i] === id) {
                this.allId.splice(++i, 1);
                return;
            }
        }
    }

    private addInsightDataset(id: string, kind: InsightDatasetKind) {
        let data: InsightDataset = {id: id, kind: kind, numRows: this.sectionCounter};
        this.allInsightDataset.push(data);
    }

    private removeInsightDataset(id: string) {
        for (let i: number = 0; i < this.allInsightDataset.length; i++) {
            if (this.allInsightDataset[i].id === id) {
                this.allInsightDataset.splice(++i, 1);
                return;
            }
        }
    }

    public addToDataset(id: string, kind: InsightDatasetKind, dataToBeAdd: { [id: string]: any }) {
        this.allDataset[id] = dataToBeAdd[id];
        this.addInsightDataset(id, kind);
    }

    private removeFromDataset(id: string) {
        delete this.allDataset[id];
        this.removeInsightDataset(id);
    }

    public getAllId(): string[] {
        return this.allId;
    }

    public getAllDataset(): any {
        return this.allDataset;
    }

    public getAllInsightDataset(): InsightDataset[] {
        return this.allInsightDataset;
    }
}
