import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import DataHandler from "./DataHandler";

export default class QueryValidator {
    private idInQuery: string;
    private allDataset: any;

    constructor() {
        this.idInQuery = "";
        this.allDataset = null;
    }

    public findMatchingSections(q: any): Promise<any[]> {
        try {
            let los: any[] = this.findMatchingWhere(q.WHERE);
            if (typeof q.TRANSFORMATIONS !== "undefined") {
                los = this.findTransformations(q.TRANSFORMATIONS, los);
            }
            if (los.length > 5000) {
                return Promise.reject(new ResultTooLargeError());
            } else {
                return Promise.resolve(this.findMatchingOPTIONS(q.OPTIONS, los));
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }

    private findTransformations(q: any, los: any[]): any[] {
        return [];
    }

    private findMatchingOPTIONS(q: any, los: any[]): any[] {
        try {
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
        } catch (e) {
            throw new InsightError("error in options");
        }
    }

    private findMatchingWhere(q: any): any[] {
        try {
            if (Object.keys(q).length === 0) {
                return this.allDataset[this.idInQuery];
            } else {
                return this.findMatchingFilter(q);
            }
        } catch (e) {
            throw new InsightError("error in where");
        }
    }

    private findMatchingFilter(q: any): any[] {
        let key: string = Object.keys(q)[0];
        let value: any = Object.values(q)[0];
        switch (key) {
            case "AND":
                let allANDReturns: Array<Set<any>> = [];
                for (let innerObject of value) {
                    allANDReturns.push(new Set(this.findMatchingFilter(innerObject)));
                }
                let totalIntersection = allANDReturns[0];
                for (let aSet of allANDReturns) {
                    totalIntersection = new Set([...aSet].filter((x) => totalIntersection.has(x)));
                }
                return Array.from(totalIntersection.values());
            case "OR":
                let allORReturns = new Set();
                for (let innerObject of value) {
                    for (let section of this.findMatchingFilter(innerObject)) {
                        allORReturns.add(section);
                    }
                    // allORReturns.add(new Set(this.findMatchingFilter(innerObject)));
                }
                return Array.from(allORReturns.values());
            case "NOT":
                let allSections: any[] = this.allDataset[this.idInQuery];
                let currSections = this.findMatchingFilter(value);
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

    private findGTLTEQ(value: any, type: string): any[] {
        let result: any[] = [];
        let mkey: string = Object.keys(value)[0];
        let num: any = Object.values(value)[0];
        let mfield: string = mkey.split("_")[1];
        let allSections: any[] = this.allDataset[this.idInQuery];
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

    private findIS(value: any): any[] {
        let result: any[] = [];
        let skey: string = Object.keys(value)[0];
        let str: any = Object.values(value)[0];
        let sfield: string = skey.split("_")[1];
        let allSections: any[] = this.allDataset[this.idInQuery];
        sfield = this.fieldConverter(sfield);
        if (str.slice(0, 1) === "*" && str.slice(-1) === "*") {
            for (let section of allSections) {
                if (section[sfield].includes(str.slice(1, -1))) {
                    result.push(section);
                }
            }
        } else if (str.slice(0, 1) === "*") {
            for (let section of allSections) {
                if (section[sfield].endsWith(str.slice(1,))) {
                    result.push(section);
                }
            }
        } else if (str.slice(-1) === "*") {
            for (let section of allSections) {
                if (section[sfield].startsWith(str.slice(0, -1))) {
                    result.push(section);
                }
            }
        } else {
            for (let section of allSections) {
                if (section[sfield] === str) {
                    result.push(section);
                }
            }
        }
        return result;
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

    public setAllDataset(data: any) {
        this.allDataset = data;
    }

    public setidInQuery(id: string) {
        this.idInQuery = id;
    }
}
