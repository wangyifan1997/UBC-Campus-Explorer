import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {expect} from "chai";
import {JSZipObject} from "jszip";
import {promises} from "dns";
import * as fs from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

// dev branch
// muhan branch
export default class InsightFacade implements IInsightFacade {
    public allId: string[];
    public allDataset: any;

    constructor() {
        this.allId = [];
        this.allDataset = {};
        this.readDataset("./data");
        Log.trace("InsightFacadeImpl::init()");
    }

    public readDataset(path: string) {
        this.allId = this.myReadEntryNames(path);
        if (!fs.pathExistsSync(path)) {
            fs.mkdirSync(path);
        }
        for (let id of this.allId) {
            let writtenFile: any = this.myReadFile(path + "/" + id);
            let sections: any[] = writtenFile[id];
            this.allDataset[id] = sections;
        }
    }

    private isIdOk(id: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.isIdAdded(id) || this.isIdIllegal(id)) {
                reject(InsightError);
            }
            resolve();
        });
    }

    private checkCoursesFolder(zipData: JSZip): Promise<any> {
        let coursesFolder: JSZipObject[] = zipData.folder(/courses/);
        if (coursesFolder.length === 0) {
            return Promise.reject(InsightError);
        }
        return Promise.resolve(zipData);
    }

    public parseCourseJSON(contents: string[]): Promise<string[]> {
        let temp: any[] = [];
        try {
            for (let course of contents) {
                temp.push(JSON.parse(course));
            }
        } catch (e) {
            return Promise.reject(e);
        }
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

    public myWriteFile(path: string, data: any): Promise<any> {
        try {
            fs.writeFileSync(path, JSON.stringify(data));
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

    public myReadEntryNames(path: string): string[] {
        let result: string[] = [];
        fs.readdirSync(path).forEach((file: string) => {
            result.push(file);
        });
        return result;
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.isIdOk(id).then(() => {
            let zip: JSZip = new JSZip();
            return zip.loadAsync(content, {base64: true});
        }).then((zipData: JSZip) => {
            return this.checkCoursesFolder(zipData);
        }).then((zipData: JSZip) => {
            // chaining all promises
            let allFiles: string[] = [];
            zipData.folder("courses").forEach((relativePath, file) => {
                allFiles.push(file.name);
            });
            let allPromises: any[] = allFiles.map((fileDir: string) => {
                return zipData.file(fileDir).async("text");
            });
            return Promise.all(allPromises);
        }).then((result: string[]) => {
            return this.parseCourseJSON(result);
        }).then((allCourses: string[]) => {
            return this.getAllSections(allCourses);
        }).then((allSections: any[]) => {
            this.allId.push(id);
            let dataToBeAdd: any = {};
            dataToBeAdd[id] = allSections;
            if (!fs.pathExistsSync("./data")) {
                fs.mkdirSync("./data");
            }
            return this.myWriteFile("./data/" + id, dataToBeAdd);
        }).then((dataToBeAdd: any[]) => {
            this.allDataset[id] = dataToBeAdd;
            return Promise.resolve(this.allId);
        }).catch((err: any) => {
            return Promise.reject(new InsightError());
        });
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }

    private isIdIllegal(id: string): boolean {
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

    private isIdAdded(id: string): boolean {
        return this.allId.includes(id);
    }
}
