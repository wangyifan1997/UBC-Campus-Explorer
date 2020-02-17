import {GeoResponse, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {JSZipObject} from "jszip";
import * as fs from "fs-extra";
import {type} from "os";
import RoomDataHandler from "./RoomDataHandler";
import CourseDataHandler from "./CourseDataHandler";


export default class DataHandler {
    private allDataset: { [index: string]: any };
    private path: string;
    private zip: JSZip;
    private roomDataHandler: RoomDataHandler;
    private courseDataHandler: CourseDataHandler;

    constructor() {
        this.allDataset = {};
        this.path = "./data";
        this.zip = new JSZip();
        this.roomDataHandler = new RoomDataHandler();
        this.courseDataHandler = new CourseDataHandler();
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
        return this.roomDataHandler.getAllBuildings(zipData);
    }

    public getAllBuildingInIndex(content: string): Promise<any> {
        return this.roomDataHandler.getAllBuildingInIndex(content, this.zip);
    }

    public getAllRoomsInBuilding(buildings: any[]): Promise<any> {
        return this.roomDataHandler.getAllRoomsInBuilding(buildings);
    }

    public getAllRooms(buildings: any[], id: string): Promise<any> {
        return this.roomDataHandler.getAllRooms(buildings, id);
    }

    public getLocationForBuildings(buildings: any[]): Promise<any[]> {
        return this.roomDataHandler.getLocationForBuildings(buildings);
    }

    public getRoomsContentForBuildings(buildings: any[]): Promise<any> {
        return this.roomDataHandler.getRoomsContentForBuildings(buildings, this.zip);
    }

    public checkFolder(zipData: JSZip, kind: InsightDatasetKind): Promise<any> {
        let folder: JSZipObject[];
        if (kind === InsightDatasetKind.Courses) {
            folder = zipData.folder(/courses/);
        } else if (kind === InsightDatasetKind.Rooms) {
            folder = zipData.folder(/rooms/);
        }
        if (folder.length === 0) {
            return Promise.reject(new InsightError());
        }
        return Promise.resolve(zipData);
    }

    public loadAllFilesToAllPromises(zipData: JSZip): Promise<string[]> {
        return this.courseDataHandler.loadAllFilesToAllPromises(zipData);
    }

    public parseCourseJSON(contents: string[]): Promise<string[]> {
        return this.courseDataHandler.parseCourseJSON(contents);
    }

    public getAllSections(allCourses: any[], id: string): Promise<any> {
        return this.courseDataHandler.getAllSections(allCourses, id);
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
