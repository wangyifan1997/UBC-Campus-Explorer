import {InsightDataset, InsightDatasetKind} from "./IInsightFacade";

export default class QueryValidator {
    private coursemfields: string[] = ["avg", "pass", "fail", "audit", "year"];
    private coursesfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
    private roommfields: string[] = ["lat", "lon", "seats"];
    private roomsfields: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    private mtoken: string[] = ["MAX", "MIN", "AVG", "SUM"];
    private mstoken: string[] = ["COUNT"];
    private idInQuery: string[]; // make sure the query only has one id
    private keysInQuery: string[]; // all keys appeared in columns after being validated
    private transformationKey: string[]; // keys appeared in transformation, if there is a transformation
    private allInsightDataset: InsightDataset[];
    private mfields: string[];
    private sfields: string[];

    constructor() {
        this.idInQuery = [];
        this.keysInQuery = [];
        this.transformationKey = [];
        this.allInsightDataset = [];
    }

    public validateTransformations(q: any): boolean {
        if (typeof q.GROUP === "undefined" || typeof q.APPLY === "undefined" || Object.keys(q).length !== 2) {
            return false;
        }
        return this.validateGROUP(q.GROUP) && this.validateAPPLY(q.APPLY);
    }

    private validateGROUP(q: any): boolean {
        if (!Array.isArray(q) || q.length < 1) {
            return false; // q should be an object, and should has at least one element
        }
        for (let key of q) {
            let splittedKey: string[] = key.split("_");
            if (splittedKey.length !== 2) {
                return false;
            }
            if (!(this.validateIdstring(splittedKey[0])
                && (this.mfields.includes(splittedKey[1]) || this.sfields.includes(splittedKey[1])))) {
                return false;
            }
            this.transformationKey.push(key); // if the key is valid, push it to transformationKey
        }
        return true;
    }

    private validateAPPLY(q: any): boolean {
        if (!Array.isArray(q)) {
            return false; // q should be an array, and should have at least one element
        }
        for (let applyrule of q) {
            if (Array.isArray(applyrule) || Object.keys(applyrule).length > 1) {
                return false;
            }
            let applykey: string = Object.keys(applyrule)[0];
            let criteria: any = applyrule[applykey];
            if (applykey.length === 0 || applykey.includes("_") || this.transformationKey.includes(applykey)) {
                return false;
            }
            this.transformationKey.push(applykey);
            if (Array.isArray(criteria) || Object.keys(criteria).length > 1) {
                return false;
            }
            let applytoken: string = Object.keys(criteria)[0];
            if (!this.mtoken.includes(applytoken) && !this.mstoken.includes(applytoken)) {
                return false;
            }
            let key: string[] = criteria[applytoken].split("_");
            if (key.length !== 2) {
                return false;
            }
            if (this.mtoken.includes(applytoken)) {
                if (!(this.validateIdstring(key[0]) && this.mfields.includes(key[1]))) {
                    return false;
                }
            } else if (this.mstoken.includes(applytoken)) {
                if (!(this.validateIdstring(key[0])
                    && (this.sfields.includes(key[1]) || this.mfields.includes(key[1])))) {
                    return false;
                }
            }
        }
        return true;
    }


    public validateOptions(q: any): boolean {
        let keys: any[] = Object.keys(q);
        for (let key of keys) {
            if (key !== "COLUMNS" && key !== "ORDER") {
                return false;
            }
        }
        if (typeof q.ORDER !== "undefined") {
            return this.validateColumns(q.COLUMNS) && this.validateOrder(q.ORDER);
        } else {
            return this.validateColumns(q.COLUMNS);
        }
    }

    private validateColumns(q: any): boolean {
        if (typeof q === "undefined" || q.length < 1) {
            return false;
        }
        for (let mskey of q) {
            if (this.transformationKey.length > 0) {
                if (!this.transformationKey.includes(mskey)) {
                    return false;
                }
            } else {
                let splittedmskeys: string[] = mskey.split("_");
                if (splittedmskeys.length !== 2) {
                    return false;
                }
                if (!(this.validateIdstring(splittedmskeys[0])
                    && (this.mfields.includes(splittedmskeys[1]) || this.sfields.includes(splittedmskeys[1])))) {
                    return false;
                }
            }
            this.keysInQuery.push(mskey);
        }
        return true;
    }

    private validateOrder(q: any): boolean {
        if (typeof q === "string") {
            return this.keysInQuery.includes(q);
        } else if (Array.isArray(q)) {
            return false;
        } else {
            if (typeof q.dir === "undefined" || typeof q.keys === "undefined" || Object.keys(q).length !== 2) {
                return false;
            }
            if (q.dir !== "UP" && q.dir !== "DOWN") {
                return false;
            }
            let keys: any = q.keys;
            if (!Array.isArray(keys) || keys.length < 1) {
                return false;
            }
            for (let anykey of keys) {
                if (!this.keysInQuery.includes(anykey)) {
                    return false;
                }
            }
            return true;
        }
    }

    public validateWhere(q: any): boolean {
        if (Array.isArray(q)) {
            return false;
        } else {
            if (Object.keys(q).length === 0) {
                return true;
            } else {
                return this.validateFilter(q);
            }
        }
    }

    private validateFilter(q: any): boolean {
        if (Object.keys(q).length !== 1) {
            return false;
        } else {
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
    }

    private validateNOT(value: any): boolean {
        if (typeof value !== "object") {
            return false;
        }
        return this.validateFilter(value);
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
                return (!str.slice(1, -1).includes("*"))
                    && this.validateIdstring(idstring)
                    && this.sfields.includes(sfield);
            }
        }
    }

    private validateGTLTEQ(value: any): boolean {
        if (typeof value !== "object" || Object.keys(value).length !== 1) {
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
        if (!Array.isArray(value) || value.length < 1) {
            return false;
        }
        for (let innerObject of value) {
            if (!this.validateFilter(innerObject)) {
                return false;
            }
        }
        return true;
    }

    private validateIdstring(idstring: string): boolean {
        if (this.idInQuery.length === 0) {
            for (let insightDataset of this.allInsightDataset) {
                if (insightDataset.id === idstring) {
                    this.idInQuery.push(idstring);
                    if (insightDataset.kind === InsightDatasetKind.Courses) {
                        this.mfields = this.coursemfields;
                        this.sfields = this.coursesfields;
                    } else {
                        this.mfields = this.roommfields;
                        this.sfields = this.roomsfields;
                    }
                    return true;
                }
            }
            return false;
        } else {
            return this.idInQuery.includes(idstring);
        }
    }

    public getIdInQuery(): string[] {
        return this.idInQuery;
    }

    public setIdInQuery(id: string[]) {
        this.idInQuery = id;
    }

    public setKeysInQuery(field: string[]) {
        this.keysInQuery = field;
    }

    public setTransformationKey(key: string[]) {
        this.transformationKey = key;
    }

    public setAllInsightDataset(allInsightDataset: InsightDataset[]) {
        this.allInsightDataset = allInsightDataset;
    }
}
