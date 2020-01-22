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

    // private checkCoursesFolder(zipData: JSZip): Promise<any> {
    //     let coursesFolder: JSZipObject[] = zipData.folder(/courses/);
    //     if (coursesFolder.length === 0) {
    //         return Promise.reject(InsightError);
    //     }
    //     return Promise.resolve(zipData);
    // }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.isIdOk(id, content).then(() => {
            // let idResult: string = result[0];
            // let contentResult: string = result[1];
            // eslint-disable-next-line no-console
            console.log("1 then block");
            let zip: JSZip = new JSZip();
            return zip.loadAsync(content, {base64: true});
            // }).catch((err: any) => {
            //     // eslint-disable-next-line no-console
            //     console.log("no!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            //     return Promise.reject(new InsightError());
        }).then((zipData: JSZip) => {
            // eslint-disable-next-line no-console
            console.log("2 then block");
            // eslint-disable-next-line no-console
            //     console.log("here!!!!!!!!!!!!!!!!!!!!");
            //     return this.checkCoursesFolder(zipData);
            // }).then((zipData: JSZip) => {
            // has courses folder, start setting up all promises
            let coursesFolder: JSZipObject[] = zipData.folder(/courses/);
            if (coursesFolder.length <= 0) {
                return Promise.reject(new InsightError());
            }
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
            return allPromises;
        }).then((allPromises) => {
            // eslint-disable-next-line no-console
            console.log("4 then block");
            let promiseInOne: any = Promise.all(allPromises);
            return promiseInOne;
        }).then((result: string[]) => {
            // eslint-disable-next-line no-console
            console.log("5 then block");
            // eslint-disable-next-line no-console
            // console.log(result);
            this.allId.push(id);
            this.allFiles = [];
            return Promise.resolve(this.allId);
        }).catch((err: any) => {
            // no courses folder, reject
            // eslint-disable-next-line no-console
            console.log("catch block");
            return Promise.reject(new InsightError());
        });
        // if (this.isIdIllegal(id) || this.isIdAdded(id)) {
        //     // eslint-disable-next-line no-console
        //     console.log("NO!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        //     return Promise.reject(InsightError);
        // }
        // let zip: JSZip = new JSZip();
        // zip.loadAsync(content, {base64: true}).then((zipData: JSZip) => {
        //     let coursesFolder: JSZipObject[] = zipData.folder(/courses/);
        //     // eslint-disable-next-line no-console
        //     console.log("HERE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        //     if (coursesFolder.length === 0) {
        //         // eslint-disable-next-line no-console
        //         console.log("NOTHING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        //         return Promise.reject(InsightError);
        //     }
        //     // eslint-disable-next-line no-console
        //     console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        //     let tempFiles: any[] = [];
        //     zipData.folder("courses").forEach(function (relativePath, file) {
        //         // eslint-disable-next-line no-console
        //         console.log("inside foreach!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        //         // eslint-disable-next-line no-console
        //         console.log("file name is:" + file.name);
        //         zip.file(file.name).async("text").then((text: string) => {
        //             // eslint-disable-next-line no-console
        //             console.log("inside foreach then!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        //             tempFiles.push(text);
        //         }).catch((reason: any) => {
        //             // eslint-disable-next-line no-console
        //             console.log("inside reason!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        //             return Promise.reject(InsightError);
        //         });
        //     });
        //     // eslint-disable-next-line no-console
        //     console.log(tempFiles.length);
        //     this.allId.push(id);
        //     // eslint-disable-next-line no-console
        //     console.log("SHOULD RESOLVE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        //     return Promise.resolve(this.allId);
        // });
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
