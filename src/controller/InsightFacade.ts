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

    constructor() {
        this.allId = [];
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
        return Promise.resolve(temp[0].result[0]);
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.isIdOk(id, content).then(() => {
            let zip: JSZip = new JSZip();
            return zip.loadAsync(content, {base64: true});
        }).catch((err: any) => {
            throw new InsightError();
        }).then((zipData: JSZip) => {
            return this.checkCoursesFolder(zipData);
        }).catch((err: any) => {
            throw new InsightError();
        }).then((zipData: JSZip) => {
            let allFiles: string[] = [];
            zipData.folder("courses").forEach((relativePath, file) => {
                allFiles.push(file.name);
            });
            let allPromises: any[] = allFiles.map((fileDir: string) => {
                return zipData.file(fileDir).async("text");
            });
            return Promise.all(allPromises);
        }).catch((err: any) => {
            return Promise.reject(new InsightError());
        }).then((result: string[]) => {
            return this.parseCourseJSON(result);
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
