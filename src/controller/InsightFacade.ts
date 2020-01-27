import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {expect} from "chai";
import {JSZipObject} from "jszip";
import {promises} from "dns";
import * as fs from "fs-extra";
import DataHandler from "./DataHandler";
import QueryHandler from "./QueryHandler";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

// dev branch
// muhan branch
export default class InsightFacade implements IInsightFacade {
    private dataHandler: DataHandler;
    private queryHandler: QueryHandler;
    private mfields: string[] = ["avg", "pass", "fail", "audit", "year"];
    private sfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
    private idInQuery: string[] = [];
    private fieldsInQuery: string[] = [];

    constructor() {
        this.dataHandler = new DataHandler();
        this.dataHandler.readDataset();
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.dataHandler.isIdOkToAdd(id).then(() => {
            return this.dataHandler.myLoadAsync(content);
        }).then((zipData: JSZip) => {
            return this.dataHandler.checkCoursesFolder(zipData);
        }).then((zipData: JSZip) => {
            return this.dataHandler.loadAllFilesToAllPromises(zipData);
        }).then((result: string[]) => {
            return this.dataHandler.parseCourseJSON(result);
        }).then((allCourses: string[]) => {
            return this.dataHandler.getAllSections(allCourses);
        }).then((allSections: any[]) => {
            this.dataHandler.addId(id);
            return this.dataHandler.myWriteFile(id, allSections);
        }).then((dataToBeAdd: any[]) => {
            this.dataHandler.addToDataset(id, dataToBeAdd);
            return Promise.resolve(this.dataHandler.getAllId());
        }).catch((err: any) => {
            return Promise.reject(new InsightError());
        });
    }

    public removeDataset(id: string): Promise<string> {
        return this.dataHandler.isIdOkToDelete(id).then(() => {
            this.dataHandler.myDeleteDataset(id);
            return Promise.resolve(id);
        }).catch((err: any) => {
            return Promise.reject(err);
        });
    }

    public performQuery(query: any): Promise<any[]> {
        try {
            this.idInQuery = [];
            this.fieldsInQuery = [];
            if (typeof query.WHERE === "undefined"
                || typeof query.OPTIONS === "undefined") {
                return Promise.reject(new InsightError());
            }
            // todo 检查是否有excessive keys in query and options
            // todo 都改完以后要把条件改成and
            if (this.validateWhere(query.WHERE) && this.validateOptions(query.OPTIONS)) {
                // return Promise.resolve([this.validateWhere(query.WHERE), this.validateOptions(query.OPTIONS)]);
                return this.findMatchingSections(query);
            } else {
                return Promise.reject(new InsightError());
            }
        } catch (err) {
            return Promise.reject(err);
        }

    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.dataHandler.getAllInsightDataset());
    }

    private findMatchingSections(q: any): Promise<any[]> {
        try {
            let los: any[] = this.findMatchingWHERE(q.WHERE);
            if (los.length > 5000) {
                return Promise.reject(new ResultTooLargeError());
            } else {
                return Promise.resolve(this.findMatchingOPTIONS(q.OPTIONS, los));
            }
        } catch (e) {
            throw e;
        }
    }

    private findMatchingWHERE(q: any): any[] {
        let key: string = Object.keys(q)[0];
        let value: any = Object.values(q)[0];
        switch (key) {
            case "AND":
                let allANDReturns: Array<Set<any>> = [];
                for (let innerObject of Object.values(q)) {
                    allANDReturns.push(new Set(this.findMatchingWHERE(innerObject)));
                }
                let totalIntersection = allANDReturns[0];
                for (let aSet of allANDReturns) {
                    totalIntersection = new Set([...aSet].filter((x) => totalIntersection.has(x)));
                }
                return Array.from(totalIntersection.values());
            case "OR":
                let allORReturns = new Set();
                for (let innerObject of Object.values(q)) {
                    allORReturns.add(new Set(this.findMatchingWHERE(innerObject)));
                }
                return Array.from(allORReturns.values());
            case "NOT":
                let allSections: any[] = this.dataHandler.getAllDataset()[this.idInQuery[0]];
                let currSections = this.findMatchingWHERE(value);
                let result: any[] = [];
                for (let sections of allSections) {
                    if (!currSections.includes(sections)) {
                        result.push(sections);
                    }
                }
                return result;
            case "GT":
                return this.findGTLTEQ(value, "GT");
            case "LT":
                return this.findGTLTEQ(value, "LT");
            case "EQ":
                return this.findGTLTEQ(value, "EQ");
            case "IS":
                return this.findIS(value);
            default:
                return [];
        }
    }

    private findMatchingOPTIONS(q: any, los: any[]): any[] {
        let columns: string[] = q.COLUMNS;
        let final: any[] = [];
        let processedSection: { [key: string]: any };
        for (let section of los) {
            processedSection = {};
            for (let column of columns) {
                let data: any = section[this.fieldConverter(column.split("_")[1])];
                processedSection[column] = data;
            }
            final.push(processedSection);
        }
        let orderKey: string = q.ORDER;
        final.sort((a, b) => a[orderKey] < b[orderKey] ? -1 : a[orderKey] > b[orderKey] ? 1 : 0);
        return final;
    }

    private findIS(value: any): any[] {
        let result: any[] = [];
        let skey: string = Object.keys(value)[0];
        let str: any = Object.values(value)[0];
        let sfield: string = skey.split("_")[1];
        // todo this need to be changed if we change the data structure
        let allSections: any[] = this.dataHandler.getAllDataset()[this.idInQuery[0]];
        sfield = this.fieldConverter(sfield);
        let regex: RegExp;
        // todo regex part is problematic
        if (str.slice(0, 1) === "*" && str.slice(-1) === "*") {
            regex = new RegExp("\\D\*" + str + "\\D\*");
        } else if (str.slice(0, 1) === "*") {
            regex = new RegExp("\\D\*" + str);
        } else if (str.slice(-1) === "*") {
            regex = new RegExp(str + "\\D\*");
        } else if (str.length === 0) {
            regex = new RegExp("\\D\*");
        } else {
            regex = new RegExp(str);
        }
        for (let section of allSections) {
            if (regex.test(section[sfield])) {
                result.push(section);
            }
        }
        return result;
    }

    private findGTLTEQ(value: any, type: string): any[] {
        let result: any[] = [];
        let mkey: string = Object.keys(value)[0];
        let num: any = Object.values(value)[0];
        let mfield: string = mkey.split("_")[1];
        let allSections: any[] = this.dataHandler.getAllDataset()[this.idInQuery[0]];
        mfield = this.fieldConverter(mfield);
        switch (type) {
            case "GT":
                for (let section of allSections) {
                    if (section[mfield] > num) {
                        result.push(section);
                    }
                }
                return result;
            case "LT":
                for (let section of allSections) {
                    if (section[mfield] < num) {
                        result.push(section);
                    }
                }
                return result;
            case "EQ":
                for (let section of allSections) {
                    if (section[mfield] === num) {
                        result.push(section);
                    }
                }
                return result;
            default:
                return [];
        }

    }

    // todo where cannot take more than one different key
    private validateWhere(q: any): boolean {
        let key: string = Object.keys(q)[0];
        let value: any = Object.values(q)[0];
        switch (key) {
            case "AND":
            case "OR":
                return this.validateANDOR(value);
            case "NOT":
                return this.validateNOT(value);
            case "GT":
            case "LT":
            case "EQ":
                return this.validateGTLTEQ(value);
            case "IS":
                return this.validateIS(value);
            default:
                return false;
        }
    }

    // todo 检查多余key
    private validateOptions(q: any): boolean {
        let mskeys: any = q.COLUMNS;
        if (typeof mskeys === "undefined") {
            return false;
        }
        if (mskeys.length < 1) {
            return false;
        }
        for (let mskey of mskeys) {
            if (typeof mskey !== "string") {
                return false;
            }
            let splittedmskeys: string[] = mskey.split("_");
            if (splittedmskeys.length !== 2) {
                return false;
            }
            let idstring: string = splittedmskeys[0];
            let msfield: string = splittedmskeys[1];
            if (!(this.validateIdstring(idstring)
                && (this.mfields.includes(msfield) || this.sfields.includes(msfield)))) {
                return false;
            }
            this.fieldsInQuery.push(msfield);
        }
        if (typeof q.ORDER !== "undefined") {
            let order: any = q.ORDER;
            if (typeof order !== "string") {
                return false;
            }
            let splittedOrder: string[] = order.split("_");
            if (splittedOrder.length !== 2) {
                return false;
            }
            let idstring: string = splittedOrder[0];
            let msfield: string = splittedOrder[1];
            return (this.validateIdstring(idstring) && this.fieldsInQuery.includes(msfield));
        }
    }


    private validateIdstring(idstring: string): boolean {
        if (this.idInQuery.length === 0) {
            if (this.dataHandler.getAllId().includes(idstring)) {
                this.idInQuery.push(idstring);
            } else {
                return false;
            }
        } else {
            return this.idInQuery.includes(idstring);
        }
    }

    private validateNOT(value: any): boolean {
        if (typeof value !== "object") {
            return false;
        }
        return this.validateWhere(value);
    }

    private validateIS(value: any): boolean {
        if (typeof value !== "object") {
            return false;
        }
        if (Object.keys(value).length !== 1) {
            return false;
        }
        let skey: string[] = Object.keys(value)[0].split("_");
        if (skey.length !== 2) {
            return false;
        } else {
            let idstring: string = skey[0];
            let sfield: string = skey[1];
            let str: any = Object.values(value)[0];
            if (typeof str !== "string") {
                return false;
            } else {
                return str.substring(1, str.length - 1).indexOf("*") === -1
                    && this.validateIdstring(idstring)
                    && this.sfields.includes(sfield);
            }
        }
    }

    private validateGTLTEQ(value: any): boolean {
        if (typeof value !== "object") {
            return false;
        }
        if (Object.keys(value).length !== 1) {
            return false;
        }
        let mkey: string[] = Object.keys(value)[0].split("_");
        if (mkey.length !== 2) {
            return false;
        } else {
            let idstring: string = mkey[0];
            let mfield: string = mkey[1];
            let num: any = Object.values(value)[0];
            return (typeof num === "number")
                && this.validateIdstring(idstring)
                && this.mfields.includes(mfield);
        }
    }

    private validateANDOR(value: any): boolean {
        if (value.length < 1) {
            return false;
        }
        for (let innerObject of value) {
            if (!this.validateWhere(innerObject)) {
                return false;
            }
        }
        return true;
    }

    private fieldConverter(field: string): string {
        switch (field) {
            case "dept":
                return "Subject";
            case "id":
                return "Course";
            case "avg":
                return "Avg";
            case "instructor":
                return "Professor";
            case "title":
                return "Title";
            case "pass":
                return "Pass";
            case "fail":
                return "Fail";
            case "audit":
                return "Audit";
            case "uuid":
                return "id";
            case "year":
                return "Year";
            default:
                return undefined;
        }
    }
}
