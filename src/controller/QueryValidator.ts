import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import DataHandler from "./DataHandler";

export default class QueryValidator {
    private mfields: string[] = ["avg", "pass", "fail", "audit", "year"];
    private sfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
    private idInQuery: string[];
    private fieldsInQuery: string[];
    private allId: string[];

    constructor() {
        this.idInQuery = [];
        this.fieldsInQuery = [];
        this.allId = [];
    }

    public validateOptions(q: any): boolean {
        try {
            let keys: any[] = Object.keys(q);
            for (let key of keys) {
                if (key !== "COLUMNS" && key !== "ORDER") {
                    return false;
                }
            }
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
            return true;
        } catch (e) {
            throw new InsightError();
        }
    }

    public validateWhere(q: any): boolean {
        try {
            if (Array.isArray(q)) {
                return false;
            } else {
                if (Object.keys(q).length === 0) {
                    return true;
                } else {
                    return this.validateFilter(q);
                }
            }
        } catch (e) {
            throw new InsightError();
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
        if (!Array.isArray(value)) {
            return false;
        } else {
            if (value.length < 1) {
                return false;
            }
            for (let innerObject of value) {
                if (!this.validateFilter(innerObject)) {
                    return false;
                }
            }
            return true;
        }
    }

    private validateIdstring(idstring: string): boolean {
        if (this.idInQuery.length === 0) {
            if (this.allId.includes(idstring)) {
                this.idInQuery.push(idstring);
                return true;
            } else {
                return false;
            }
        } else {
            return this.idInQuery.includes(idstring);
        }
    }

    public getIdInQuery(): string[] {
        return this.idInQuery;
    }

    public getFieldsInQuery(): string[] {
        return this.fieldsInQuery;
    }

    public getAllId(): string[] {
        return this.allId;
    }

    public setAllId(id: string[]) {
        this.allId = id;
    }

    public setIdInQuery(id: string[]) {
        this.idInQuery = id;
    }

    public setFieldsInQuery(field: string[]) {
        this.fieldsInQuery = field;
    }
}
