import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {JSZipObject} from "jszip";
import * as fs from "fs-extra";

export default class DataHandler {
    private allId: string[];
    private allDataset: any;
    private zip: JSZip;
    private path: string;
    private folder: string;
    private allInsightDataset: InsightDataset[];
    private sectionCounter: number;
    // todo 所有读写要扫硬盘
    constructor() {
        this.allId = [];
        this.allDataset = {};
        this.zip = new JSZip();
        this.path = "./data";
        this.folder = "courses";
        this.allInsightDataset = [];
        this.sectionCounter = 0;
    }

    public isIdIllegal(id: string): boolean {
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

    public isIdAdded(id: string): boolean {
        return this.allId.includes(id);
    }

    public isIdOkToAdd(id: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.isIdAdded(id) || this.isIdIllegal(id)) {
                reject(InsightError);
            }
            resolve();
        });
    }

    public isIdOkToDelete(id: string): Promise<any> {
        if (this.isIdIllegal(id)) {
            return Promise.reject(new InsightError());
        }
        if (!this.isIdAdded(id)) {
            return Promise.reject(new NotFoundError());
        }
        return Promise.resolve();
    }

    public myLoadAsync(content: string) {
        return this.zip.loadAsync(content, {base64: true});
    }

    public checkCoursesFolder(zipData: JSZip): Promise<any> {
        let coursesFolder: JSZipObject[] = zipData.folder(/courses/);
        if (coursesFolder.length === 0) {
            return Promise.reject(InsightError);
        }
        return Promise.resolve(zipData);
    }

    public loadAllFilesToAllPromises(zipData: JSZip): Promise<string[]> {
        let allFiles: string[] = [];
        zipData.folder("courses").forEach((relativePath, file) => {
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
        // try {
        //     for (let course of contents) {
        //         temp.push(JSON.parse(course));
        //     }
        // } catch (e) {
        //     return Promise.reject(e);
        // }
        return Promise.resolve(temp);
    }

    public getAllSections(allCourses: any[]): Promise<any> {
        let allSections: any[] = [];
        for (let course of allCourses) {
            let sections: any[] = course.result;
            for (let section of sections) {
                if (this.isValidSection(section)) {
                    section.id = section.id.toString();
                    if (section.Year.toLowerCase() === "overall") {
                        section.Year = 1900;
                        allSections.push(section);
                    } else {
                        section.Year = Number(section.Year);
                        if (!isNaN(section.Year)) {
                            allSections.push(section);
                        }
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

    public isValidSection(section: any): boolean {
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

    public myReadFile(path: string): any {
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
        fs.unlinkSync(this.path + "/" + id);
        this.removeFromDataset(id);
        this.removeId(id);
    }

    private createDataToBeAdd(id: string, allSections: any[]): any {
        let dataToBeAdd: { [id: string]: any } = {};
        dataToBeAdd[id] = allSections;
        return dataToBeAdd;
    }

    public addId(id: string) {
        this.allId.push(id);
    }

    public removeId(id: string) {
        for (let i: number = 0; i < this.allId.length; i++) {
            if (this.allId[i] === id) {
                this.allId.splice(++i, 1);
                return;
            }
        }
    }

    private addInsightDataset(id: string) {
        let data: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: this.sectionCounter};
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

    public addToDataset(id: string, dataToBeAdd: { [id: string]: any }) {
        this.allDataset[id] = dataToBeAdd[id];
        // eslint-disable-next-line no-console
        console.log(this.allDataset);
        this.addInsightDataset(id);
    }

    public removeFromDataset(id: string) {
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
