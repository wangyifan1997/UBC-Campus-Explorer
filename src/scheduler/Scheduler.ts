import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";

export default class Scheduler implements IScheduler {
    // muhanc3
    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {

        if (sections.length === 0 || rooms.length === 0) {
            return [];
        }

        let unschedRooms: SchedRoom[] = rooms;
        let unschedSections: SchedSection[] = sections;
        let schedBuildings: string[] = []; // can be local in function
        let groupedRoom: any = {};
        let timeTable: any = this.initTimeTable();
        let maxRegisters: number[] = [];
        let result: Array<[SchedRoom, SchedSection, TimeSlot]> = [];

        this.sortRoomsAndSections(unschedSections, unschedRooms);
        this.groupRooms(groupedRoom, rooms);
        this.fillTimeTable(timeTable, unschedSections, maxRegisters);
        this.allocateRooms(timeTable, unschedRooms, maxRegisters);
        this.createTuples(result, timeTable);
        return result;
    }

    private createTuples(result: Array<[SchedRoom, SchedSection, TimeSlot]>, timeTable: any): void {
        let size: number = timeTable["roomOfColumn"].length;
        for (let i: number = 0; i < size; i++) {
            for (let key of Object.keys(timeTable)) {
                if (key !== "roomOfColumn" && timeTable[key][i] !== undefined
                    && timeTable["roomOfColumn"][i] !== undefined) {
                    result.push([timeTable["roomOfColumn"][i] as SchedRoom,
                        timeTable[key][i] as SchedSection, key as TimeSlot]);
                }
            }
        }
    }

    private allocateRooms(timeTable: any, unschedRooms: SchedRoom[], maxRegisters: number[]): void {
        timeTable["roomOfColumn"] = [];
        while (maxRegisters.length > 0 && unschedRooms.length > 0) {
            for (let aRoom of unschedRooms) {
                if (maxRegisters[0] <= this.getRoomCapacity(aRoom)) {
                    timeTable["roomOfColumn"].push(aRoom);
                    maxRegisters.shift();
                    unschedRooms.splice(unschedRooms.indexOf(aRoom), 1);
                    break;
                }

            }
        }
    }

    private getRoomCapacity(room: SchedRoom): number {
        return room["rooms_seats"];
    }

    private fillTimeTable(timeTable: any, unschedSections: SchedSection[], maxRegisters: number[]): void {
        let skippedTimeSlots: Array<[number, string]> = [];
        let currColumn = 0;
        while (unschedSections.length > 0) {
            maxRegisters.push(this.getEnrollment(unschedSections[0]));
            this.pushOneColumn(unschedSections, timeTable, skippedTimeSlots, currColumn);
            currColumn++;
        }
    }

    private pushOneColumn(unschedSections: SchedSection[], timeTable: any,
                          skippedTimeSlots: Array<[number, string]>, currColumn: number): void {
        for (let key of Object.keys(timeTable)) {
            this.fillSkippedTimeSlots(unschedSections, timeTable, skippedTimeSlots);
            if (!this.isCourseConflict(unschedSections[0], timeTable[key])) {
                timeTable[key].push(unschedSections[0]);
                unschedSections.shift();
                if (unschedSections.length === 0) {
                    break;
                }
                this.deleteExtraSections(unschedSections, timeTable);
            } else {
                skippedTimeSlots.push([currColumn, key]);
            }
        }
    }

    private fillSkippedTimeSlots(unschedSections: SchedSection[], timeTable: any,
                                 skippedTimeSlots: Array<[number, string]>): void {
        while (skippedTimeSlots.length > 0 && unschedSections.length > 0) {
            let filledTimeSlot: boolean = false;
            for (let timeSlot of skippedTimeSlots) {
                if (!this.isCourseConflict(unschedSections[0], timeTable[timeSlot[1]])) {
                    timeTable[timeSlot[1]].splice(timeSlot[0], 0, unschedSections[0]);
                    unschedSections.shift();
                    if (unschedSections.length === 0) {
                        break;
                    }
                    this.deleteExtraSections(unschedSections, timeTable);
                    skippedTimeSlots.splice(skippedTimeSlots.indexOf(timeSlot), 1);
                    filledTimeSlot = true;
                    break;
                }
            }
            if (!filledTimeSlot) {
                break;
            }
        }
    }

    private deleteExtraSections(unschedSections: SchedSection[], timeTable: any): void {
        while (this.isTooManySections(unschedSections[0], timeTable)) {
            unschedSections.shift();
        }
    }

    private isTooManySections(section: SchedSection, timeTable: any): boolean {
        for (let key of Object.keys(timeTable)) {
            if (!this.isCourseConflict(section, timeTable[key])) {
                return false;
            }
        }
        return true;
    }

    private isCourseConflict(section: SchedSection, previousSections: SchedSection[]): boolean {
        for (let aSection of previousSections) {
            if (this.isSameCourse(aSection, section)) {
                return true;
            }
        }
        return false;
    }

    private initTimeTable(): any {
        return {
            "MWF 0800-0900": [],
            "MWF 0900-1000": [],
            "MWF 1000-1100": [],
            "MWF 1100-1200": [],
            "MWF 1200-1300": [],
            "MWF 1300-1400": [],
            "MWF 1400-1500": [],
            "MWF 1500-1600": [],
            "MWF 1600-1700": [],
            "TR  0800-0930": [],
            "TR  0930-1100": [],
            "TR  1100-1230": [],
            "TR  1230-1400": [],
            "TR  1400-1530": [],
            "TR  1530-1700": []
        };
    }

    private groupRooms(groupedRoom: any, allRooms: SchedRoom[]): void {
        for (let room of allRooms) {
            if (!Object.keys(groupedRoom).includes(room["rooms_shortname"])) {
                groupedRoom[room["rooms_shortname"]] = [];
            }
            groupedRoom[room["rooms_shortname"]].push(room);
        }
    }

    private sortRoomsAndSections(sections: SchedSection[], rooms: SchedRoom[]): void {
        sections.sort((a, b) =>
            (this.getEnrollment(a) < this.getEnrollment(b)) ? 1 : -1);
        rooms.sort((a, b) => (a["rooms_seats"] > b["rooms_seats"]) ? 1 : -1);
    }

    private isSameCourse(sectionA: SchedSection, sectionB: SchedSection): boolean {
        return (sectionA["courses_dept"] === sectionA["courses_dept"] &&
            sectionB["courses_id"] === sectionB["courses_id"]);
    }

    private getEnrollment(section: SchedSection): number {
        return section["courses_pass"] + section["courses_fail"] + section["courses_audit"];
    }
}
