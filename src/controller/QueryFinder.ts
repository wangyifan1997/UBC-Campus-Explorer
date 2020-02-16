import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import {Decimal} from "decimal.js";

export default class QueryFinder {
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
                marker += section[key];
            }
            if (!temp[marker]) {
                temp[marker] = [section];
            } else {
                temp[marker].push(section);
            }
        }
        return this.findAPPLY(group, apply, temp);
    }

    private findAPPLY(group: any[], apply: any[], temp: any[]): any[] {
        let result: any[] = [];
        for (let cluster of Object.values(temp)) {
            let grouped: any = {};
            for (let key of group) {
                grouped[key] = cluster[0][key];
            }
            for (let applyRule of apply) {
                let applyKey: string = Object.keys(applyRule)[0];
                let applyToken: string = Object.keys(applyRule[applyKey])[0];
                let k: string = applyRule[applyKey][applyToken];
                switch (applyToken) {
                    case "MAX":
                        let numMax: number[] = [];
                        for (let section of cluster) {
                            numMax.push(section[k]);
                        }
                        grouped[applyKey] = Math.max.apply(numMax);
                        break;
                    case "MIN":
                        let numMin: number[] = [];
                        for (let section of cluster) {
                            numMin.push(section[k]);
                        }
                        grouped[applyKey] = Math.min.apply(numMin);
                        break;
                    case "AVG":
                        let total: Decimal = new Decimal(0);
                        for (let section of cluster) {
                            total = total.plus(new Decimal(section[k]));
                        }
                        grouped[applyKey] = Number((total.toNumber() / cluster.length).toFixed(2));
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
                processedSection[column] = section[column];
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
                            return a[key] < b[key] ? -1 : 1;
                        } else {
                            return a[key] < b[key] ? 1 : -1;
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
            return this.allDataset[this.idInQuery]["data"];
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
                let allSections: any[] = this.allDataset[this.idInQuery]["data"];
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
        let allSections: any[] = this.allDataset[this.idInQuery]["data"];
        switch (type) {
            case "GT":
                for (let section of allSections) {
                    if (section[mkey] > num) {
                        result.push(section);
                    }
                }
                return result;
            case "LT":
                for (let section of allSections) {
                    if (section[mkey] < num) {
                        result.push(section);
                    }
                }
                return result;
            case "EQ":
                for (let section of allSections) {
                    if (section[mkey] === num) {
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
        let allSections: any[] = this.allDataset[this.idInQuery]["data"];
        if (str.slice(0, 1) === "*" && str.slice(-1) === "*") {
            for (let section of allSections) {
                if (section[skey].includes(str.slice(1, -1))) {
                    result.push(section);
                }
            }
        } else if (str.slice(0, 1) === "*") {
            for (let section of allSections) {
                if (section[skey].endsWith(str.slice(1, ))) {
                    result.push(section);
                }
            }
        } else if (str.slice(-1) === "*") {
            for (let section of allSections) {
                if (section[skey].startsWith(str.slice(0, -1))) {
                    result.push(section);
                }
            }
        } else {
            for (let section of allSections) {
                if (section[skey] === str) {
                    result.push(section);
                }
            }
        }
        return result;
    }

    public setAllDataset(data: any) {
        this.allDataset = data;
    }

    public setidInQuery(id: string) {
        this.idInQuery = id;
    }
}
