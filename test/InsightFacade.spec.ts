import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

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
        zipWithZeroSection: "./test/data/zipWithZeroSection.zip",
        zipWithOneSection: "./test/data/zipWithOneSection.zip",
        zipWithZeroValidSection: "./test/data/zipWithZeroValidSection.zip"
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

    it("Should list a dataset", () => {
        const id: string = "courses";
        const expected: InsightDataset[] = [{
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612
        }];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
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
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
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

    it("Should not add a dataset with zero sections", function () {
        const id: string = "zipWithZeroSection";
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
        const id1: string = "test1";
        const id2: string = "test2";
        const expected1: string[] = [id1];
        const expected2: string[] = [id1, id2];
        return insightFacade.addDataset(id1, datasets["courses"], InsightDatasetKind.Courses).then(
            (result: string[]) => {
            expect(result).to.deep.equal(expected1);
        }).catch((err: any) => {
            expect.fail(err, expected1, "Should not have rejected");
        }).then(() => {
            return insightFacade.addDataset(id2, datasets["course"], InsightDatasetKind.Courses);
        }).then((result: string[]) => {
            expect(result).to.deep.equal(expected2);
        }).catch((err: any) => {
            // eslint-disable-next-line no-console
            console.log(err);
            expect.fail(err, expected2, "Should not have rejected");
        });
    });

    it("should not add dataset with duplicate ids", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        }).then(() => {
            return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        }).then((result: string[]) => {
            expect.fail();
        }, (err: any) => {
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

    it("should not add dataset with invalid id with empty", function () {
        const id: string = "        ";
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

    it("should reject when removing a dataset that is not existing", () => {
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
    const datasetsToQuery: { [id: string]: {path: string, kind: InsightDatasetKind} } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
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
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * TODO For C1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
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

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
});
