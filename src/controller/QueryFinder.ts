import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import {Decimal} from "decimal.js";

export default class QueryValidator {
    private idInQuery: string;
    private allDataset: any;

    constructor() {
        this.idInQuery = "";
        this.allDataset = null;
    }

    public findMatchingSections(q: any): Promise<any[]> {
        let los: any[] = this.findMatchingWhere(q.WHERE);
        if (typeof q.TRANSFORMATIONS !== "undefined") {
            los = this.findTransformations(q.TRANSFORMATIONS, los);
        }
        if (los.length > 5000) {
            return Promise.reject(new ResultTooLargeError());
        } else {
            return Promise.resolve(this.findMatchingOPTIONS(q.OPTIONS, los));
        }
    }

    private findTransformations(q: any, los: any[]): any[] {
        let temp: any = {};
        let group: any[] = q.GROUP;
        let apply: any[] = q.APPLY;
        for (let section of los) {
            let marker: string = ""; // marker is the combined string of all the corresponding values in group keys
            for (let key of group) {
                marker += section[this.fieldConverter(key.split("_")[1])];
            }
            if (!temp[marker]) {
                temp[marker] = [section];
            } else {
                temp[marker].push(section);
            }
        }
        return this.findAPPLY(group, apply, temp);
    }

    // TODO 拆分，改AVG的实现方式
    private findAPPLY(group: any[], apply: any[], temp: any[]): any[] {
        let result: any[] = [];
        for (let cluster of Object.values(temp)) {
            let grouped: any = {};
            for (let key of group) {
                let field: string = this.fieldConverter(key.split("_")[1]);
                grouped[field] = cluster[0][field];
            }
            for (let applyRule of apply) {
                let applyKey: string = Object.keys(applyRule)[0];
                let applyToken: string = Object.keys(applyRule[applyKey])[0];
                let k: string = this.fieldConverter(applyRule[applyKey][applyToken].split("_")[1]);
                switch (applyToken) {
                    case "MAX":
                        let max: number = Number.NEGATIVE_INFINITY;
                        for (let section of cluster) {
                            if (section[k] > max) {
                                max = section[k];
                            }
                        }
                        grouped[applyKey] = max;
                        break;
                    case "MIN":
                        let min: number = Number.POSITIVE_INFINITY;
                        for (let section of cluster) {
                            if (section[k] < max) {
                                max = section[k];
                            }
                        }
                        grouped[applyKey] = min;
                        break;
                    case "AVG":
                        let total: number = 0;
                        for (let section of cluster) {
                            total += section[k];
                        }
                        let avg: number = total / cluster.length;
                        grouped[applyKey] = Number(avg.toFixed(2));
                        break;
                    case "COUNT":
                        grouped[applyKey] = cluster.length;
                        break;
                    case "SUM":
                        let sum: number = 0;
                        for (let section of cluster) {
                            result += section[k];
                        }
                        grouped[applyKey] = Number(sum.toFixed(2));
                        break;
                }
            }
            result.push(grouped);
        }
        return result;
    }

    private findMatchingOPTIONS(q: any, los: any[]): any[] {
        let columns: string[] = q.COLUMNS;
        let final: any[] = [];
        let processedSection: { [key: string]: any };
        for (let section of los) {
            processedSection = {};
            for (let column of columns) {
                let data: any;
                if (!column.includes("_")) {
                    data = section[column];
                } else {
                    data = section[this.fieldConverter(column.split("_")[1])];
                }
                processedSection[column] = data;
            }
            final.push(processedSection);
        }
        let orderKey: any = q.ORDER;
        if (typeof orderKey === "string") {
            final.sort((a, b) => a[orderKey] < b[orderKey] ? -1 : a[orderKey] > b[orderKey] ? 1 : 0);
        } else if (typeof orderKey === "object") {
            let keys: string[] = orderKey["keys"];
            final.sort((a, b) => {
                for (let key of keys) {
                    if (a[key] === b[key]) {
                        continue;
                    } else {
                        if (orderKey["dir"] === "UP") {
                            return a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
                        } else {
                            return a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0;
                        }
                    }
                }
                return 0;
            });
        }
        return final;
    }

    private findMatchingWhere(q: any): any[] {
        if (Object.keys(q).length === 0) {
            return this.allDataset[this.idInQuery];
        } else {
            return this.findMatchingFilter(q);
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

    private fieldConverter(field: string): string {     // TODO 加rooms的convert
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
