import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import * as JSZip from "jszip";
import DataHandler from "./DataHandler";
import QueryValidator from "./QueryValidator";
import QueryFinder from "./QueryFinder";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

// dev branch
// muhan branch change
export default class InsightFacade implements IInsightFacade {
    private dataHandler: DataHandler;
    private queryValidator: QueryValidator;
    private queryfinder: QueryFinder;

    constructor() {
        this.dataHandler = new DataHandler();
        this.dataHandler.readDataset();
        this.queryValidator = new QueryValidator();
        this.queryfinder = new QueryFinder();
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (kind === InsightDatasetKind.Courses) {
            return this.addCourses(id, content, kind);
        } else {
            return this.addRooms(id, content, kind);
        }
    }

    private addRooms(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.dataHandler.isIdOkToAdd(id).then(() => {
            return this.dataHandler.myLoadAsync(content);
        }).then((zipData: JSZip) => {
            return this.dataHandler.checkFolder(zipData, kind);
        }).then((zipData: JSZip) => {
            return this.dataHandler.getAllBuildings(zipData);
        }).then((result: any[]) => {
            return this.dataHandler.getLocationForBuildings(result);
        }).then((result: any[]) => {
            return this.dataHandler.getRoomsContentForBuildings(result);
        }).then((result: any[]) => {
            // return this.dataHandler.getAllRoomsInBuilding(result);
            return Promise.resolve(result);
        }).catch((err: any) => {
            return Promise.reject(err);
        });
    }

    private addCourses(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.dataHandler.isIdOkToAdd(id).then(() => {
            return this.dataHandler.myLoadAsync(content);
        }).then((zipData: JSZip) => {
            return this.dataHandler.checkFolder(zipData, kind);
        }).then((zipData: JSZip) => {
            return this.dataHandler.loadAllFilesToAllPromises(zipData);
        }).then((res: string[]) => {
            return this.dataHandler.parseCourseJSON(res);
        }).then((allCourses: string[]) => {
            return this.dataHandler.getAllSections(allCourses, id);
        }).then((allSections: any[]) => {
            this.dataHandler.addId(id);
            return this.dataHandler.myWriteFile(id, allSections);
        }).then((dataToBeAdd: any[]) => {
            this.dataHandler.addToDataset(id, kind, dataToBeAdd);
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
            if (!(err instanceof InsightError) && !(err instanceof NotFoundError)) {
                return Promise.reject(new InsightError());
            } else {
                return Promise.reject(err);
            }
        });
    }

    public performQuery(query: any): Promise<any[]> {
        try {
            if (query === null || typeof query.WHERE === "undefined"
                || typeof query.OPTIONS === "undefined") {
                return Promise.reject(new InsightError());
            }
            for (let key of Object.keys(query)) {
                if (key !== "OPTIONS" && key !== "WHERE" && key !== "TRANSFORMATIONS") {
                    return Promise.reject(new InsightError());
                }
            }
            this.queryValidator.setKeysInQuery([]);
            this.queryValidator.setIdInQuery([]);
            this.queryValidator.setTransformationKey([]);
            this.queryValidator.setAllInsightDataset(this.dataHandler.getAllInsightDataset());
            if (typeof query.TRANSFORMATIONS !== "undefined") {
                if (!(this.queryValidator.validateWhere(query.WHERE)
                    && this.queryValidator.validateTransformations(query.TRANSFORMATIONS)
                    && this.queryValidator.validateOptions(query.OPTIONS))) {
                    return Promise.reject(new InsightError());
                }
            } else {
                if (!(this.queryValidator.validateWhere(query.WHERE)
                    && this.queryValidator.validateOptions(query.OPTIONS))) {
                    return Promise.reject(new InsightError());
                }
            }
            this.queryfinder.setAllDataset(this.dataHandler.getAllDataset());
            this.queryfinder.setidInQuery(this.queryValidator.getIdInQuery()[0]);
            return this.queryfinder.findMatchingSections(query);
        } catch (err) {
            if (!(err instanceof InsightError) && !(err instanceof ResultTooLargeError)) {
                return Promise.reject(new InsightError());
            } else {
                return Promise.reject(err);
            }
        }
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.dataHandler.getAllInsightDataset());
    }
}
