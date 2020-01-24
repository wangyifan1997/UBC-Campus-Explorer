import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {expect} from "chai";
import {JSZipObject} from "jszip";
import {promises} from "dns";
import * as fs from "fs-extra";
import DataHandler from "./DataHandler";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

// dev branch
// muhan branch
export default class InsightFacade implements IInsightFacade {
    // public allId: string[];
    // public allDataset: any;
    private handler: DataHandler;

    constructor() {
        // this.allId = [];
        // this.allDataset = {};
        this.handler = new DataHandler();
        this.handler.readDataset();
        Log.trace("InsightFacadeImpl::init()");
    }
    //
    // public readDataset(path: string) {
    //     if (!fs.pathExistsSync(path)) {
    //         fs.mkdirSync(path);
    //     }
    //     this.allId = this.myReadEntryNames(path);
    //     for (let id of this.allId) {
    //         let writtenFile: any = this.myReadFile(path + "/" + id);
    //         let sections: any[] = writtenFile[id];
    //         this.allDataset[id] = sections;
    //     }
    // }
    //
    // private isIdOk(id: string): Promise<any> {
    //     return new Promise((resolve, reject) => {
    //         if (this.isIdAdded(id) || this.isIdIllegal(id)) {
    //             reject(InsightError);
    //         }
    //         resolve();
    //     });
    // }
    //
    // private checkCoursesFolder(zipData: JSZip): Promise<any> {
    //     let coursesFolder: JSZipObject[] = zipData.folder(/courses/);
    //     if (coursesFolder.length === 0) {
    //         return Promise.reject(InsightError);
    //     }
    //     return Promise.resolve(zipData);
    // }
    //
    // public parseCourseJSON(contents: string[]): Promise<string[]> {
    //     let temp: any[] = [];
    //     try {
    //         for (let course of contents) {
    //             temp.push(JSON.parse(course));
    //         }
    //     } catch (e) {
    //         return Promise.reject(e);
    //     }
    //     return Promise.resolve(temp);
    // }
    //
    // public getAllSections(allCourses: any[]): Promise<any> {
    //     let allSections: any[] = [];
    //     for (let course of allCourses) {
    //         let sections: any[] = course.result;
    //         for (let section of sections) {
    //             if (this.isValidSection(section)) {
    //                 section.id = section.id.toString();
    //                 if (section.Year.toLowerCase() === "overall") {
    //                     section.Year = 1900;
    //                     allSections.push(section);
    //                 } else {
    //                     section.Year = Number(section.Year);
    //                     if (!isNaN(section.Year)) {
    //                         allSections.push(section);
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     if (allSections.length === 0) {
    //         return Promise.reject(new InsightError());
    //     } else {
    //         return Promise.resolve(allSections);
    //     }
    // }
    //
    // public isValidSection(section: any): boolean {
    //     return (typeof section.Subject === "string"
    //         && typeof section.Course === "string"
    //         && typeof section.Avg === "number"
    //         && typeof section.Professor === "string"
    //         && typeof section.Title === "string"
    //         && typeof section.Pass === "number"
    //         && typeof section.Fail === "number"
    //         && typeof section.Audit === "number"
    //         && typeof section.id === "number"
    //         && typeof section.Year === "string");
    // }
    //
    // public myWriteFile(path: string, data: any): Promise<any> {
    //     try {
    //         fs.writeFileSync(path, JSON.stringify(data));
    //     } catch (e) {
    //         return Promise.reject(e);
    //     }
    //     return Promise.resolve(data);
    // }
    //
    // public myReadFile(path: string): any {
    //     let result: any = null;
    //     try {
    //         result = fs.readFileSync(path);
    //     } catch (e) {
    //         result = (e as Error).message;
    //     }
    //     return result;
    // }
    //
    // public myReadEntryNames(path: string): string[] {
    //     let result: string[] = [];
    //     fs.readdirSync(path).forEach((file: string) => {
    //         result.push(file);
    //     });
    //     return result;
    // }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.handler.isIdOkToAdd(id).then(() => {
            return this.handler.myLoadAsync(content);
        }).then((zipData: JSZip) => {
            return this.handler.checkCoursesFolder(zipData);
        }).then((zipData: JSZip) => {
            // chaining all promises
            // let allFiles: string[] = [];
            // zipData.folder("courses").forEach((relativePath, file) => {
            //     allFiles.push(file.name);
            // });
            // let allPromises: any[] = allFiles.map((fileDir: string) => {
            //     return zipData.file(fileDir).async("text");
            // });
            // return Promise.all(allPromises);
            return this.handler.loadAllFilesToAllPromises(zipData);
        }).then((result: string[]) => {
            return this.handler.parseCourseJSON(result);
        }).then((allCourses: string[]) => {
            return this.handler.getAllSections(allCourses);
        }).then((allSections: any[]) => {
            // this.allId.push(id);
            this.handler.addId(id);
            // let dataToBeAdd: any = {};
            // dataToBeAdd[id] = allSections;
            // if (!fs.pathExistsSync("./data")) {
            //     fs.mkdirSync("./data");
            // }
            return this.handler.myWriteFile(id, allSections);
        }).then((dataToBeAdd: any[]) => {
            // this.allDataset[id] = dataToBeAdd;
            this.handler.addToDataset(id, dataToBeAdd);
            return Promise.resolve(this.handler.getAllId());
        }).catch((err: any) => {
            return Promise.reject(new InsightError());
        });
    }

    public removeDataset(id: string): Promise<string> {
        return this.handler.isIdOkToDelete(id).then(() => {
            this.handler.myDeleteDataset(id);
            return Promise.resolve(id);
        }).catch((err: any) => {
            return Promise.reject(err as Error);
        });
    }

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.handler.getAllInsightDataset());
    }

    // private isIdIllegal(id: string): boolean {
    //     let count: number = 0;
    //     for (let letter of id) {
    //         if (letter === " ") {
    //             count++;
    //         }
    //         if (letter === "_") {
    //             return true;
    //         }
    //     }
    //     return count === id.length;
    // }
    //
    // private isIdAdded(id: string): boolean {
    //     return this.allId.includes(id);
    // }
}
