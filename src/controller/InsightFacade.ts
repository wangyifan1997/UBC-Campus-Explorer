import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {expect} from "chai";
import {JSZipObject} from "jszip";

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

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return new Promise((resolve, reject) => {
        if (this.isIdIllegal(id) || this.isIdAdded(id)) {
            // eslint-disable-next-line no-console
            console.log("NO!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            reject(InsightError);
        }
        let zip: JSZip = new JSZip();
        zip.loadAsync(content, {base64: true}).then((zipData: JSZip) => {
            let coursesFolder: JSZipObject[] = zipData.folder(/courses/);
            // eslint-disable-next-line no-console
            console.log("HERE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            if (coursesFolder.length === 0) {
                // eslint-disable-next-line no-console
                console.log("NOTHING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                reject(new InsightError("sorry"));
            }
            // eslint-disable-next-line no-console
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            let tempFiles: any[] = [];
            zipData.folder("courses").forEach(function (relativePath, file) {
                // eslint-disable-next-line no-console
                console.log("inside foreach!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                // eslint-disable-next-line no-console
                console.log("file name is:" + file.name);
                zip.file(file.name).async("text").then((text: string) => {
                    // eslint-disable-next-line no-console
                    console.log("inside foreach then!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                    tempFiles.push(text);
                }).catch((reason: any) => {
                    // eslint-disable-next-line no-console
                    console.log("inside reason!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                    reject(new InsightError("haha"));
                });
            });
            // eslint-disable-next-line no-console
            console.log(tempFiles.length);
            this.allId.push(id);
            // eslint-disable-next-line no-console
            console.log("SHOULD RESOLVE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            resolve(this.allId);
        });
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
