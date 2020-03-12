import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import DataHandler from "../src/controller/DataHandler";
import Scheduler from "../src/scheduler/Scheduler";
import {SchedRoom, SchedSection, TimeSlot} from "../src/scheduler/IScheduler";
import {fail} from "assert";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}
//
// describe("Test Scheduler", () => {
//     it("should be able to fill in timeTable", () => {
//         let scheduler: Scheduler = new Scheduler();
//         let sections: SchedSection[] = [];
//         let rooms: SchedRoom[] = [];
//         let result: Array<[SchedRoom, SchedSection, TimeSlot]> = scheduler.schedule(sections, rooms);
//         expect(result).to.deep.equal([]);
//     });
//
//     it("should be able to fill in timeTable", () => {
//         let scheduler: Scheduler = new Scheduler();
//         let sections: SchedSection[] = [{
//             courses_dept: "cpsc",
//             courses_id: "320",
//             courses_uuid: "1000",
//             courses_pass: 48,
//             courses_fail: 1,
//             courses_audit: 1
//         }, {
//             courses_dept: "cpsc",
//             courses_id: "320",
//             courses_uuid: "1001",
//             courses_pass: 47,
//             courses_fail: 1,
//             courses_audit: 1
//         }];
//         let rooms: SchedRoom[] = [{
//             rooms_shortname: "buch",
//             rooms_number: "100",
//             rooms_seats: 5,
//             rooms_lat: 10,
//             rooms_lon: 10
//         }, {
//             rooms_shortname: "dmp",
//             rooms_number: "101",
//             rooms_seats: 100,
//             rooms_lat: 10,
//             rooms_lon: 10
//         }];
//         let result: Array<[SchedRoom, SchedSection, TimeSlot]> = scheduler.schedule(sections, rooms);
//         expect(result).not.to.deep.equal([]);
//     });
//
//     it("should be able to fill in timeTable", () => {
//         let scheduler: Scheduler = new Scheduler();
//         let secTemplate: SchedSection = {
//             courses_dept: "cpsc",
//             courses_id: "320",
//             courses_uuid: "1001",
//             courses_pass: 47,
//             courses_fail: 1,
//             courses_audit: 1
//         };
//         let roomTemplate: SchedRoom = {
//             rooms_shortname: "dmp",
//             rooms_number: "101",
//             rooms_seats: 100,
//             rooms_lat: 10,
//             rooms_lon: 10
//         };
//         let sections: SchedSection[] = [];
//         let rooms: SchedRoom[] = [];
//         for (let i: number = 0; i < 20; i++) {
//             sections.push(secTemplate);
//             if (i < 2) {
//                 rooms.push(roomTemplate);
//             }
//         }
//         let result: Array<[SchedRoom, SchedSection, TimeSlot]> = scheduler.schedule(sections, rooms);
//         expect(result).not.to.deep.equal([]);
//     });
// });

describe("Test helper methods", () => {
    let dataHandler: DataHandler;
    dataHandler = new DataHandler();

    it("should be able to filter invalid section", () => {
        const course1: string[] = ["{\"result\":[{\"tier_eighty_five\":11,\"tier_ninety\":28,\"Title\":" +
        "\"comp eng design\"" +
        ",\"Section\":\"921\",\"Detail\":\"\",\"tier_seventy_two\":6,\"Other\":0,\"Low\":28" +
        ",\"tier_sixty_four\":2,\"id\":1418,\"tier_sixty_eight\":5,\"tier_zero\":0,\"tier_seventy_six" +
        "\":8,\"tier_thirty\":0,\"tier_fifty\":2,\"Professor\":\"agharebparast, farshid\",\"Audit\":0," +
        "\"tier_g_fifty" +
        "\":2,\"tier_forty\":1,\"Withdrew\":1,\"Year\":\"2013\",\"tier_twenty\":1," +
        "\"Stddev\":13.38,\"Enrolled\":90,\"tier_fifty_five\":1,\"tier_eighty\":17,\"tier_sixty\":7," +
        "\"tier_ten\":0," +
        "\"High\":99,\"Course\":\"160\",\"Session\":\"s\",\"Pass\":87,\"Fail\":2,\"Avg\":80.42,\"Campus\":\"ubc" +
        "\"," +
        "\"Subject" +
        "\":\"apsc\"},{\"tier_eighty_five\":11,\"tier_ninety\":28,\"Title\":\"comp eng design\"," +
        "\"Section\":\"overall\",\"Detail\":\"\",\"tier_seventy_two\":6,\"Other\":0,\"Low\":28,\"tier_sixty_four" +
        "\":2," +
        "\"id\":1419,\"tier_sixty_eight\":5,\"tier_zero\":0," +
        "\"tier_seventy_six\":8,\"tier_thirty\":0,\"tier_fifty\":2,\"Professor\":\"\",\"Audit\":0,\"tier_g_fifty" +
        "\":2,\"tier_forty\":1,\"Withdrew\":2," +
        // "\"Year\":\"2013\",\"tier_twenty\":1,\"Stddev\":13.38,\"Enrolled" +
        // "\":91," +
        "\"tier_fifty_five\":1,\"tier_eighty\":17,\"tier_sixty\":7,\"tier_ten\":0,\"High\":99,\"Course\":\"160\"," +
        "\"Session\":\"s\",\"Pass\":87,\"Fail\":2,\"Avg\":80.42,\"Campus\":\"ubc\",\"Subject\":\"apsc\"}]}"];
        return dataHandler.parseCourseJSON(course1).then((result: string[]) => {
            return dataHandler.getAllSections(result, "courses");
        }).catch((err: any) => {
            expect.fail("should not have rejected");
        }).then((allSections: any[]) => {
            expect(allSections.length).equal(1);
        }).catch((err: any) => {
            expect.fail("should not have rejected");
        });
    });
});

// describe("multiple InsightFacade add/remove test", function () {
//     const datasetsToLoad: { [id: string]: string } = {
//         courses: "./test/data/courses.zip",
//     };
//     let datasets: { [id: string]: string } = {};
//     let insightFacade1: InsightFacade;
//     let insightFacade2: InsightFacade;
//     const cacheDir = __dirname + "/../data";
//
//     before(function () {
//         // This section runs once and loads all datasets specified in the datasetsToLoad object
//         // into the datasets object
//         Log.test(`Before all`);
//         for (const id of Object.keys(datasetsToLoad)) {
//             datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
//         }
//     });
//
//     beforeEach(function () {
//         // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
//         // This runs before each test, which should make each test independent from the previous one
//         Log.test(`BeforeTest: ${this.currentTest.title}`);
//         try {
//             fs.removeSync(cacheDir);
//             fs.mkdirSync(cacheDir);
//             insightFacade1 = new InsightFacade();
//             insightFacade2 = new InsightFacade();
//         } catch (err) {
//             Log.error(err);
//         }
//     });
//
//     it("2 should reject when 1 has added a dataset with same id", function () {
//         const expected: string[] = ["courses"];
//         const dataset: string = datasets["courses"];
//         return insightFacade1.addDataset("courses", dataset, InsightDatasetKind.Courses).then((result: string[]) => {
//             expect(result).to.deep.equal(expected);
//         }).catch((err: any) => {
//             expect.fail();
//         }).then(() => {
//             return insightFacade2.addDataset("courses", dataset, InsightDatasetKind.Courses);
//         }).then(() => {
//             expect.fail();
//         }).catch((err: any) => {
//             expect(err).to.be.instanceOf(InsightError);
//         });
//     });
// });


describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        coursesRAR: "./test/data/anRAR.rar",
        emptyZipWithCoursesFolder: "./test/data/emptyZipWithCoursesFolder.zip",
        emptyZipWithNoFolder: "./test/data/emptyZipWithNoFolder.zip",
        actuallyAWord: "./test/data/actuallyAWord.zip",
        emptyZipWithNotCoursesFolder: "./test/data/emptyZipWithNotCoursesFolder.zip",
        zipWithCoursesFolderButInvalidFiles: "./test/data/zipWithCoursesFolderButInvalidFiles.zip",
        zipWithOneSection: "./test/data/zipWithOneSection.zip",
        zipWithZeroValidSection: "./test/data/zipWithZeroValidSection.zip",
        zipWithMixedFiles: "./test/data/zipWithMixedFiles.zip",
        rooms: "./test/data/rooms.zip",
        emptyRooms: "./test/data/emptyRooms.zip",
        roomsWithoutWOOD: "./test/data/roomsWithoutWOOD.zip",
        roomsWithoutWOODShortName: "./test/data/roomsWithoutWOODShortName.zip",
        roomsWithoutWOODAddress: "./test/data/roomsWithoutWOODAddress.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";
    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("Should list zero dataset when no dataset is added", () => {
        const expected: InsightDataset[] = [];
        return insightFacade.listDatasets().then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail();
        });
    });

    it("should not add empty content", () => {
        const id: string = "courses";
        return insightFacade.addDataset(id, "", InsightDatasetKind.Courses).then(() => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("should not add null content", () => {
        const id: string = "courses";
        return insightFacade.addDataset(id, null, InsightDatasetKind.Courses).then(() => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("should not add undefined content", () => {
        const id: string = "courses";
        return insightFacade.addDataset(id, undefined, InsightDatasetKind.Courses).then(() => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should list a dataset", () => {
        const id: string = "courses";
        const expected: InsightDataset[] = [{
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612
        }];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(["courses"]);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        }).then(() => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail();
        });
    });

    it("Should list a room dataset", () => {
        const id: string = "rooms";
        const expected: InsightDataset[] = [{
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            numRows: 364
        }];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(["rooms"]);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        }).then(() => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail();
        });
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "test1";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect(result).to.deep.equal(expected);
            }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should add a valid room dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["rooms"], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should add a valid room dataset without WOOD", function () {
        const id: string = "roomsWithoutWOOD";
        const expected: InsightDataset[] = [{
            id: "roomsWithoutWOOD",
            kind: InsightDatasetKind.Rooms,
            numRows: 348
        }];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should add a valid room dataset without WOOD shortname", function () {
        const id: string = "roomsWithoutWOODShortName";
        const expected: InsightDataset[] = [{
            id: "roomsWithoutWOODShortName",
            kind: InsightDatasetKind.Rooms,
            numRows: 348
        }];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should add a valid room dataset with WOOD address being undefined", function () {
        const id: string = "roomsWithoutWOODAddress";
        const expected: InsightDataset[] = [{
            id: "roomsWithoutWOODAddress",
            kind: InsightDatasetKind.Rooms,
            numRows: 348
        }];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should add a mixed dataset", function () {
        const id: string = "zipWithMixedFiles";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect(result).to.deep.equal(expected);
            }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should not add a word document ended with .zip", function () {
        const id: string = "actuallyAWord";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add an RAR", function () {
        const id: string = "anRAR";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add an empty zip with no folders", function () {
        const id: string = "emptyZipWithNoFolder";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add an empty room zip", function () {
        const id: string = "emptyRooms";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add an empty zip with courses folder", function () {
        const id: string = "emptyZipWithCoursesFolder";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add an empty zip with not courses folder", function () {
        const id: string = "emptyZipWithNotCoursesFolder";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add a dataset with wrong file formats (.py)", function () {
        const id: string = "zipWithCoursesFolderButInvalidFiles";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should not add a dataset with zero valid section", function () {
        const id: string = "zipWithZeroValidSection";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should add a dataset with one section", function () {
        const id: string = "zipWithOneSection";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should add two valid dataset with different ids", function () {
        const id1: string = "courses";
        const id2: string = "zipWithOneSection";
        const expected1: string[] = [id1];
        const expected2: string[] = [id1, id2];
        return insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect(result).to.deep.equal(expected1);
            }).catch((err: any) => {
            expect.fail(err, expected1, "Should not have rejected");
        }).then(() => {
            return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
        }).then((result: string[]) => {
            expect(result).to.deep.equal(expected2);
        }).catch((err: any) => {
            expect.fail(err, expected2, "Should not have rejected");
        });
    });

    it("Should add two valid dataset with different ids, one course one room", function () {
        const id1: string = "courses";
        const id2: string = "rooms";
        const expected1: string[] = [id1];
        const expected2: string[] = [id1, id2];
        const expected3: InsightDataset[] = [{
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612
        }];
        const expected4: InsightDataset[] = [{
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612
        }, {
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            numRows: 364
        }];
        return insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect(result).to.deep.equal(expected1);
            }).catch((err: any) => {
            expect.fail(err, expected1, "Should not have rejected");
        }).then(() => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected3);
            return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Rooms);
        }).then((result: string[]) => {
            expect(result).to.deep.equal(expected2);
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected4);
        }).catch((err: any) => {
            expect.fail(err, expected2, "Should not have rejected");
        });
    });

    it("Should add two valid dataset with different ids, one room one course", function () {
        const id1: string = "rooms";
        const id2: string = "courses";
        const expected1: string[] = [id1];
        const expected2: string[] = [id1, id2];
        const expected3: InsightDataset[] = [{
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            numRows: 364
        }];
        const expected4: InsightDataset[] = [{
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            numRows: 364
        }, {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612
        }];
        return insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(expected1);
        }).catch((err: any) => {
            expect.fail(err, expected1, "Should not have rejected");
        }).then(() => {
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected3);
            return insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
        }).then((result: string[]) => {
            expect(result).to.deep.equal(expected2);
            return insightFacade.listDatasets();
        }).then((result: InsightDataset[]) => {
            expect(result).to.deep.equal(expected4);
        }).catch((err: any) => {
            expect.fail(err, expected2, "Should not have rejected");
        });
    });

    it("should not add dataset with duplicate ids", function () {
        const id: string = "test4";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect(result).to.deep.equal(expected);
            }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        }).then(() => {
            return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses);
        }).then((result: string[]) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("should not add dataset with invalid id with _", function () {
        const id: string = "test_invalid";
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect.fail();
            }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("should not add null id", function () {
        const id: string = null;
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect.fail();
            }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("should not add dataset with invalid id with empty", function () {
        const id: string = "        ";
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect.fail();
            }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("should not add dataset with invalid id with empty string", function () {
        const id: string = "";
        return insightFacade.addDataset(id, datasets["courses"], InsightDatasetKind.Courses).then(
            (result: string[]) => {
                expect.fail();
            }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("should remove a dataset", () => {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        }).then(() => {
            return insightFacade.removeDataset(id);
        }).then((result: string) => {
            expect(result).to.deep.equal(id);
        }).catch((err: any) => {
            expect.fail(err, id, "Should not have rejected");
        });
    });

    it("should reject when removing a dataset that is not existed", () => {
        const id: string = "courses";
        const expected: string[] = [id];
        const nonExistedId: string = "noSuchId";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        }).then(() => {
            return insightFacade.removeDataset(nonExistedId);
        }).then((result: string) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);
        });
    });

    it("remove empty", () => {
        const nonExistedId: string = "noSuchId";
        return insightFacade.removeDataset(nonExistedId).then((result: string) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);
        });
    });

    it("remove null", () => {
        const nonExistedId: string = null;
        return insightFacade.removeDataset(nonExistedId).then((result: string) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // TODO: Should not need it
    it("should reject when removing using an id with _", () => {
        const id: string = "courses";
        const invalidId: string = "nice_courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        }).then(() => {
            return insightFacade.removeDataset(invalidId);
        }).then((result: string) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // TODO: Should not need it
    it("should reject when removing using an empty id", () => {
        const id: string = "courses";
        const invalidId: string = "     ";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        }).then(() => {
            return insightFacade.removeDataset(invalidId);
        }).then((result: string) => {
            expect.fail();
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: { path: string, kind: InsightDatasetKind } } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        rooms: {path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises);
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });


    // it("should be able to fill in timeTable", () => {
    //     let scheduler: Scheduler = new Scheduler();
    //     let rooms: SchedRoom[] = [];
    //     let sections: SchedSection[] = [];
    //     let result: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
    //     insightFacade.performQuery(testQueries[0].query).then((sec: any[]) => {
    //         sections = sec;
    //         // Log.test(sections);
    //         return insightFacade.performQuery(testQueries[1].query);
    //     }).then((r: any[]) => {
    //         rooms = r;
    //         // Log.test(rooms);
    //     }).then(() => {
    //         result = scheduler.schedule(sections, rooms);
    //         Log.test(result);
    //     });
    // });


    // Dynamically create and run a test for each query in testQueries.
    // Creates an extra "test" called "Should run test queries" as a byproduct.
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    const resultChecker = TestUtil.getQueryChecker(test, done);
                    insightFacade.performQuery(test.query)
                        .then(resultChecker)
                        .catch(resultChecker);
                });
            }
        });
    });
});
