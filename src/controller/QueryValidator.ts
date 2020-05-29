import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";

export default class QueryValidator {
    private readonly coursemfields: string[] = ["avg", "pass", "fail", "audit", "year"];
    private readonly coursesfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
    private readonly roommfields: string[] = ["lat", "lon", "seats"];
    private readonly roomsfields: string[] = ["fullname", "shortname", "number"
        , "name", "address", "type", "furniture", "href"];

    private readonly mtoken: string[] = ["MAX", "MIN", "AVG", "SUM"];
    private readonly mstoken: string[] = ["COUNT"];
    private idInQuery: string[]; // make sure the query only has one id
    private keysInQuery: string[]; // all keys appeared in columns after being validated
    private transformationKey: string[]; // keys appeared in transformation, if there is a transformation
    private allInsightDataset: InsightDataset[];
    private mfields: string[];
    private sfields: string[];

    constructor(insightDatasets: InsightDataset[]) {
        this.idInQuery = [];
        this.keysInQuery = [];
        this.transformationKey = [];
        this.allInsightDataset = insightDatasets;
    }

    public validate(q: any): void {
        if (!q || !q.WHERE || !q.OPTIONS) {
            throw new InsightError();
        }
        for (let key of Object.keys(q)) {
            if (key !== "OPTIONS" && key !== "WHERE" && key !== "TRANSFORMATIONS") {
                throw new InsightError();
            }
        }
        this.validateWhere(q.WHERE);
        if (q.TRANSFORMATIONS) {
            this.validateTransformations(q.TRANSFORMATIONS);
        }
        this.validateOptions(q.OPTIONS);
    }

    public validateTransformations(q: any): void {
        if (typeof q.GROUP === "undefined" || typeof q.APPLY === "undefined" || Object.keys(q).length !== 2) {
            throw new InsightError();
        }
        this.validateGROUP(q.GROUP);
        this.validateAPPLY(q.APPLY);
    }

    private validateGROUP(q: any): void {
        if (!Array.isArray(q) || q.length < 1) {
            throw new InsightError(); // q should be an object, and should has at least one element
        }
        for (let key of q) {
            this.validateKey(key);
            this.transformationKey.push(key); // if the key is valid, push it to transformationKey
        }
    }

    private validateKey(key: string): void {
        let splittedKey: string[] = key.split("_");
        if (splittedKey.length !== 2) {
            throw new InsightError();
        }
        if (!(this.validateIdstring(splittedKey[0])
            && (this.mfields.includes(splittedKey[1]) || this.sfields.includes(splittedKey[1])))) {
            throw new InsightError();
        }
    }

    private validateAPPLY(q: any): void {
        if (!Array.isArray(q)) {
            throw new InsightError(); // q should be an array, and should have at least one element
        }
        for (let applyrule of q) {
            if (Array.isArray(applyrule) || Object.keys(applyrule).length > 1) {
                throw new InsightError();
            }
            let applykey: string = Object.keys(applyrule)[0];
            let criteria = applyrule[applykey];
            if (applykey.length === 0 || applykey.includes("_") || this.transformationKey.includes(applykey)) {
                throw new InsightError();
            }
            this.transformationKey.push(applykey);
            if (Array.isArray(criteria) || Object.keys(criteria).length > 1) {
                throw new InsightError();
            }
            let applytoken: string = Object.keys(criteria)[0];
            if (!this.mtoken.includes(applytoken) && !this.mstoken.includes(applytoken)) {
                throw new InsightError();
            }
            let key: string[] = criteria[applytoken].split("_");
            if (key.length !== 2) {
                throw new InsightError();
            }
            if (this.mtoken.includes(applytoken)) {
                if (!(this.validateIdstring(key[0]) && this.mfields.includes(key[1]))) {
                    throw new InsightError();
                }
            } else if (this.mstoken.includes(applytoken)) {
                if (!(this.validateIdstring(key[0])
                    && (this.sfields.includes(key[1]) || this.mfields.includes(key[1])))) {
                    throw new InsightError();
                }
            }
        }
    }


    public validateOptions(q: any): void {
        let keys: any[] = Object.keys(q);
        for (let key of keys) {
            if (key !== "COLUMNS" && key !== "ORDER") {
                throw new InsightError();
            }
        }
        this.validateColumns(q.COLUMNS);
        if (q.ORDER) {
            this.validateOrder(q.ORDER);
        }
    }

    private validateColumns(q: any): void {
        if (!q || q.length < 1) {
            throw new InsightError();
        }
        for (let mskey of q) {
            if (this.transformationKey.length > 0) {
                if (!this.transformationKey.includes(mskey)) {
                    throw new InsightError();
                }
            } else {
                this.validateKey(mskey);
            }
            this.keysInQuery.push(mskey);
        }
    }

    private validateOrder(q: any): void {
        if (Array.isArray(q)) {
            throw new InsightError();
        } else if (typeof q === "string") {
            if (!this.keysInQuery.includes(q)) {
                throw new InsightError();
            }
        } else {
            if (!q.dir || !q.keys || Object.keys(q).length !== 2) {
                throw new InsightError();
            }
            if (q.dir !== "UP" && q.dir !== "DOWN") {
                throw new InsightError();
            }
            let keys: any = q.keys;
            if (!Array.isArray(keys) || keys.length < 1) {
                throw new InsightError();
            }
            for (let anykey of keys) {
                if (!this.keysInQuery.includes(anykey)) {
                    throw new InsightError();
                }
            }
        }
    }

    public validateWhere(q: any): void {
        if (Array.isArray(q)) {
            throw new InsightError();
        } else {
            if (Object.keys(q).length !== 0) {
                this.validateFilter(q);
            }
        }
    }

    private validateFilter(q: any): void {
        if (Object.keys(q).length !== 1) {
            throw new InsightError();
        } else {
            let key: string = Object.keys(q)[0];
            let value: any = Object.values(q)[0];
            switch (key) {
                case "AND":
                case "OR":
                    this.validateANDOR(value);
                    break;
                case "NOT":
                    this.validateNOT(value);
                    break;
                case "GT":
                case "LT":
                case "EQ":
                    this.validateGTLTEQ(value);
                    break;
                case "IS":
                    this.validateIS(value);
                    break;
                default:
                    throw new InsightError();
            }
        }
    }

    private validateNOT(value: any): void {
        if (typeof value !== "object") {
            throw new InsightError();
        }
        this.validateFilter(value);
    }

    private validateIS(value: any): void {
        if (typeof value !== "object") {
            throw new InsightError();
        }
        if (Object.keys(value).length !== 1) {
            throw new InsightError();
        }
        let skey: string[] = Object.keys(value)[0].split("_");
        if (skey.length !== 2) {
            throw new InsightError();
        } else {
            let idstring: string = skey[0];
            let sfield: string = skey[1];
            let str: any = Object.values(value)[0];
            if (typeof str !== "string") {
                throw new InsightError();
            } else {
                if ((str.slice(1, -1).includes("*"))
                    || !this.validateIdstring(idstring)
                    || !this.sfields.includes(sfield)) {
                    throw new InsightError();
                }
            }
        }
    }

    private validateGTLTEQ(value: any): void {
        if (typeof value !== "object" || Object.keys(value).length !== 1) {
            throw new InsightError();
        }
        let mkey: string[] = Object.keys(value)[0].split("_");
        if (mkey.length !== 2) {
            throw new InsightError();
        } else {
            let idstring: string = mkey[0];
            let mfield: string = mkey[1];
            let num: any = Object.values(value)[0];
            if ((typeof num !== "number")
                || !this.validateIdstring(idstring)
                || !this.mfields.includes(mfield)) {
                throw new InsightError();
            }
        }
    }

    private validateANDOR(value: any): void {
        if (!Array.isArray(value) || value.length < 1) {
            throw new InsightError();
        }
        for (let innerObject of value) {
            this.validateFilter(innerObject);
        }
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
}
