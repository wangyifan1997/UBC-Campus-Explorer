import * as JSZip from "jszip";
import {GeoResponse, InsightError} from "./IInsightFacade";

export default class RoomDataHandler {
    private http: any;
    private parse5: any;

    constructor() {
        this.http = require("http");
        this.parse5 = require("parse5");
    }

    public getAllBuildings(zipData: JSZip): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            return zipData.file("rooms/index.htm").async("text").then((result: string) => {
                resolve([result, zipData]);
            }).catch((err: any) => {
                reject(new InsightError());
            });
        });
    }

    public getAllBuildingInIndex(result: any[]): Promise<any> {
        let content: string = result[0];
        let parsedIndex: any = this.parse5.parse(content);
        let allTr: any[] = [];
        this.findElement(parsedIndex, "nodeName", "tr", allTr);
        let buildingResult: any[] = [];
        for (let tr of allTr) {
            try {
                let building: any = this.makeBuilding(tr);
                if (typeof building["path"] !== "undefined"
                    && result[1].file(building["path"].replace(".", "rooms")) !== null) {
                    buildingResult.push(building);
                }
            } catch (err) {
                continue;
            }
        }
        return Promise.resolve([buildingResult, result[1]]);
    }

    public getAllRoomsInBuilding(buildings: any[]): Promise<any> {
        for (let building of buildings) {
            let allRooms: any = building["rooms"];
            let allTr: any[] = [];
            this.findElement(allRooms, "nodeName", "tr", allTr);
            let roomResult: any[] = [];
            for (let tr of allTr) {
                try {
                    roomResult.push(this.makeRoom(tr));
                } catch (err) {
                    continue;
                }
            }
            building["rooms"] = roomResult;
        }
        return Promise.resolve(buildings);
    }

    private makeRoom(tr: any): any {
        let room: any = {};
        for (let element of tr["childNodes"]) {
            if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("room-number")) {
                room["number"] = element["childNodes"][1]["childNodes"][0]["value"];
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("capacity")) {
                let seats: string = element["childNodes"][0]["value"].replace(/(\n)/gm, "").trim();
                if (seats === "") {
                    room["seats"] = 0;
                } else {
                    room["seats"] = Number(seats);
                }
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("furniture")) {
                let furniture: string = element["childNodes"][0]["value"];
                room["furniture"] = furniture.replace(/(\n)/gm, "").trim();
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("room-type")) {
                let typeOf = element["childNodes"][0]["value"];
                room["type"] = typeOf.replace(/(\n)/gm, "").trim();
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("field-nothing")) {
                room["href"] = element["childNodes"][1]["attrs"][0]["value"];
            }
        }
        return room;
    }

    private findElement(obj: any, typeOf: string, target: string, result: any[]): void {
        if (typeof obj === "undefined") {
            return;
        } else if (obj[typeOf] === target) {
            result.push(obj);
        } else {
            if (typeof obj["childNodes"] !== "undefined") {
                for (let node of obj["childNodes"]) {
                    this.findElement(node, typeOf, target, result);
                }
            }
        }
    }

    private makeBuilding(tr: any): any {
        let building: any = {};
        for (let element of tr["childNodes"]) {
            if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("field-nothing")) {
                building["path"] = element["childNodes"][1]["attrs"][0]["value"];
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("building-code")) {
                let shortname: string = element["childNodes"][0]["value"];
                building["shortname"] = shortname.replace(/(\n)/gm, "").trim();
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("title")) {
                building["fullname"] = element["childNodes"][1]["childNodes"][0]["value"];
            } else if (element["nodeName"] === "td" && element["attrs"][0]["value"].includes("address")) {
                let address = element["childNodes"][0]["value"];
                building["address"] = address.replace(/(\n)/gm, "").trim();
            }
        }
        return building;
    }

    public getAllRooms(buildings: any[], id: string): Promise<any> {
        let allRooms: any[] = [];
        for (let building of buildings) {
            if (!this.isValidBuilding(building)) {
                continue;
            }
            for (let room of building["rooms"]) {
                if (!this.isValidRoom(room)) {
                    continue;
                }
                allRooms.push(this.makeNewCompleteRoom(building, room, id));
            }
        }
        if (allRooms.length === 0) {
            return Promise.reject(new InsightError());
        } else {
            return Promise.resolve(allRooms);
        }
    }

    private isValidBuilding(building: any): boolean {
        return (typeof building["fullname"] === "string"
            && typeof building["shortname"] === "string"
            && typeof building["address"] === "string"
            && typeof building["lat"] === "number"
            && typeof building["lon"] === "number"
            && typeof building["rooms"] !== "undefined");
    }

    private isValidRoom(room: any): boolean {
        return (typeof room["number"] === "string"
            && typeof room["seats"] === "number"
            && typeof room["type"] === "string"
            && typeof room["href"] === "string"
            && typeof room["furniture"] === "string");
    }

    private makeNewCompleteRoom(building: any, room: any, id: string): any {
        let newRoom: any = {};
        newRoom[id + "_" + "fullname"] = building["fullname"];
        newRoom[id + "_" + "shortname"] = building["shortname"];
        newRoom[id + "_" + "number"] = room["number"];
        newRoom[id + "_" + "name"] = building["shortname"] + "_" + room["number"];
        newRoom[id + "_" + "address"] = building["address"];
        newRoom[id + "_" + "lat"] = building["lat"];
        newRoom[id + "_" + "lon"] = building["lon"];
        newRoom[id + "_" + "seats"] = room["seats"];
        newRoom[id + "_" + "type"] = room["type"];
        newRoom[id + "_" + "furniture"] = room["furniture"];
        newRoom[id + "_" + "href"] = room["href"];
        return newRoom;
    }

    // Changed
    public getLocationForBuildings(buildings: any[]): Promise<any[]> {
        let allPromises: any[] = buildings.map((building: any) => {
            return this.getLocationForOneBuilding(building);
        });
        return Promise.all(allPromises);
    }

    private getLocationForOneBuilding(building: any): Promise<any> {
        let address: string = building["address"];
        if (typeof address === "undefined") {
            building["lat"] = undefined;
            building["lon"] = undefined;
            return Promise.resolve(building);
        }
        let url: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team" + "092/" + address;
        url = encodeURI(url);
        return new Promise((resolve, reject) => {
            this.http.get(url, (res: any) => {
                let data: string = "";
                res.on("data", (bits: string) => {
                    data += bits;
                });
                res.on("end", () => {
                    let parsedData: GeoResponse = JSON.parse(data);
                    building["lat"] = parsedData.lat;
                    building["lon"] = parsedData.lon;
                    resolve(building);
                });
            }).on("error", (err: any) => {
                reject(new InsightError(err));
            });
        });
    }

    public getRoomsContentForBuildings(buildings: any[]): Promise<any> {
        let allPromises: any[] = buildings[0].map((building: any) => {
            return this.getRoomsContentForOneBuilding(building, buildings[1]);
        });
        return Promise.all(allPromises);
    }


    private getRoomsContentForOneBuilding(building: any, zip: JSZip): Promise<any> {
        let path = building["path"].replace(".", "rooms");
        return new Promise<any>((resolve, reject) => {
            return zip.file(path).async("text").then((content: string) => {
                building["rooms"] = this.parse5.parse(content);
                resolve(building);
            }).catch((err: any) => {
                reject(new InsightError(err));
            });
        });
    }
}
