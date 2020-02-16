import {GeoResponse, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {JSZipObject} from "jszip";
import * as fs from "fs-extra";

export default class DataHandler {
    private allDataset: {[index: string]: any};
    private path: string;
    private folder: string;
    private sectionCounter: number;
    private http: any;
    private parse5: any;
    private zip: JSZip;

    constructor() {
        this.http = require("http");
        this.parse5 = require("parse5");
        this.allDataset = {};
        this.path = "./data";
        this.folder = "courses";
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
        return Object.keys(this.allDataset).includes(id);
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
        let allRooms: any[] = [];
        for (let building of buildings) {
            if (!this.isValidBuilding(building)) {
                continue;
            }
            for (let room of building["rooms"]) {
                if (!this.isValidRoom(room)) {
                    continue;
                }
                allRooms.push(this.makeNewCompleteRoom(building, room, id));
            }
        }
        if (allRooms.length === 0) {
            return Promise.reject(new InsightError());
        } else {
            return Promise.resolve(allRooms);
        }
    }

    private isValidBuilding(building: any): boolean {
        return (typeof building["fullname"] === "string"
            && typeof building["shortname"] === "string"
            && typeof building["address"] === "string"
            && typeof building["lat"] === "number"
            && typeof building["lon"] === "number"
            && typeof building["rooms"] !== "undefined");
    }

    private isValidRoom(room: any): boolean {
        return (typeof room["number"] === "string"
            && typeof room["seats"] === "number"
            && typeof room["type"] === "string"
            && typeof room["href"] === "string"
            && typeof room["furniture"] === "string");
    }

    private makeNewCompleteRoom(building: any, room: any, id: string): any {
        let newRoom: any = {};
        newRoom[id + "_" + "fullname"] = building["fullname"];
        newRoom[id + "_" + "shortname"] = building["shortname"];
        newRoom[id + "_" + "number"] = room["number"];
        newRoom[id + "_" + "name"] = building["shortname"] + "_" + room["number"];
        newRoom[id + "_" + "address"] = building["address"];
        newRoom[id + "_" + "lat"] = building["lat"];
        newRoom[id + "_" + "lon"] = building["lon"];
        newRoom[id + "_" + "seats"] = room["seats"];
        newRoom[id + "_" + "type"] = room["type"];
        newRoom[id + "_" + "furniture"] = room["furniture"];
        newRoom[id + "_" + "href"] = room["href"];
        return newRoom;
    }

    public getLocationForBuildings(buildings: any[]): Promise<any[]> {
        let allPromises: any[] = buildings.map((building: any) => {
            return this.getLocationForOneBuilding(building);
        });
        return Promise.all(allPromises);
    }

    private getLocationForOneBuilding(building: any): Promise<any> {
        let address: string = building["address"];
        let convertedAddress: string = address.replace(" ", "%20");
        let url: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team" + "092/" + convertedAddress;
        return new Promise((resolve, reject) => {
            this.http.get(url, (res: any) => {
                let data: string = "";
                res.on("data", (bits: string) => {
                    data += bits;
                });
                res.on("end", () => {
                    let parsedData: GeoResponse = JSON.parse(data);
                    building["lat"] = parsedData.lat;
                    building["lon"] = parsedData.lon;
                    resolve(building);
                });
            }).on("error", (err: any) => {
                building["lat"] = undefined;
                building["lon"] = undefined;
                resolve(building);
            });
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

    public myWriteFile(id: string, allSections: any[], kind: InsightDatasetKind): Promise<any> {
        this.checkDir();
        let data: any = this.createDataToBeAdd(id, allSections, kind);
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
        for (let id of this.myReadEntryNames(this.path)) {
            let writtenFile: any = this.myReadFile(this.path + "/" + id);
            writtenFile = JSON.parse(writtenFile);
            this.allDataset[id] = writtenFile;
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
        } catch (e) {
            throw new InsightError();
        }
    }

    private createDataToBeAdd(id: string, allSections: any[], kind: InsightDatasetKind): any {
        let dataToBeAdd: any = {};
        dataToBeAdd["data"] = allSections;
        dataToBeAdd["id"] = id;
        dataToBeAdd["kind"] = kind;
        return dataToBeAdd;
    }

    public addToDataset(id: string, kind: InsightDatasetKind, dataToBeAdd: { [id: string]: any }) {
        this.allDataset[id] = dataToBeAdd;
    }

    private removeFromDataset(id: string) {
        delete this.allDataset[id];

    }

    public getAllDataset(): any {
        return this.allDataset;
    }

    public getAllInsightDataset(): any {
        let allInsightDataset: InsightDataset[] = [];
        for (let dataset of Object.values(this.allDataset)) {
            let id: string = dataset["id"];
            let kind: InsightDatasetKind = dataset["kind"];
            let numRows: number = dataset["data"].length;
            let insightDataset: InsightDataset
                = {id: id, kind: kind, numRows: numRows};
            allInsightDataset.push(insightDataset);
        }
        return allInsightDataset;
    }
}
