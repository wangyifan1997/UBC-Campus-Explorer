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

export default class InsightFacade implements IInsightFacade {
    private dataHandler: DataHandler;

    constructor() {
        this.dataHandler = new DataHandler();
        this.dataHandler.readDataset();
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (kind === InsightDatasetKind.Rooms) {
            return this.addRooms(id, content, InsightDatasetKind.Rooms);
        } else {
            return this.addCourses(id, content, InsightDatasetKind.Courses);
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
            return this.dataHandler.getAllBuildingInIndex(result);
        }).then((result: any[]) => {
            return this.dataHandler.getRoomsContentForBuildings(result);
        }).then((result: any[]) => {
            return this.dataHandler.getLocationForBuildings(result);
        }).then((result: any[]) => {
            return this.dataHandler.getAllRoomsInBuilding(result);
        }).then((result: any[]) => {
            return this.dataHandler.getAllRooms(result, id);
        }).then((allSections: any[]) => {
            return this.dataHandler.myWriteFile(id, allSections, kind);
        }).then((dataToBeAdd: any[]) => {
            this.dataHandler.addToDataset(id, kind, dataToBeAdd);
            return Promise.resolve(Object.keys(this.dataHandler.getAllDataset()));
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
            return this.dataHandler.myWriteFile(id, allSections, kind);
        }).then((dataToBeAdd: any[]) => {
            this.dataHandler.addToDataset(id, kind, dataToBeAdd);
            return Promise.resolve(Object.keys(this.dataHandler.getAllDataset()));
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
            const validator: QueryValidator = new QueryValidator(this.dataHandler.getAllInsightDataset());
            validator.validate(query);
            const finder: QueryFinder = new QueryFinder(validator.getIdInQuery()[0], this.dataHandler.getAllDataset());
            const result: any[] = finder.find(query);
            return Promise.resolve(result);
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
