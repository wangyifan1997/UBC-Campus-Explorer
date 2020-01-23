import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {expect} from "chai";
import {JSZipObject} from "jszip";
import {promises} from "dns";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

// dev branch
// muhan branch
export default class InsightFacade implements IInsightFacade {

    public allId: string[];
    public allFiles: string[];
    public fs = require("fs");

    constructor() {
        this.allId = [];
        this.allFiles = [];
        Log.trace("InsightFacadeImpl::init()");
    }

    private isIdOk(id: string, content: string): Promise<any> {
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

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.isIdOk(id, content).then(() => {
            let zip: JSZip = new JSZip();
            return zip.loadAsync(content, {base64: true});
        }).then((zipData: JSZip) => {
            return this.checkCoursesFolder(zipData);
        }).then((zipData: JSZip) => {
            let allFiles: string[] = [];
            zipData.folder("courses").forEach((relativePath, file) => {
                this.allFiles.push(file.name);
            });
            return zipData;
        }).then((zipData) => {
            // eslint-disable-next-line no-console
            console.log("3 then block");
            let allPromises: any[] = this.allFiles.map((fileDir: string) => {
                return zipData.file(fileDir).async("text");
            });
            return Promise.all(allPromises);
        }).then((result: string[]) => {
            return this.parseCourseJSON(result);
        }).then((allCourses: string[]) => {
            return this.getAllSections(allCourses);
        }).then((allSections: any[]) => {
            this.allId.push(id);
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
