import { expect } from "chai";
import * as fs from "fs-extra";
import {
    InsightDataset,
    InsightDatasetKind,
    InsightError,
} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import { NotFoundError } from "restify";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any; // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string; // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses01: "./test/data/courses01.zip",
        empty: "./test/data/empty.zip",
        corrupted: "./test/data/corrupted.zip",
        notAPropZip: "./test/data/notAPropZip.zip",
        notAZip: "./test/data/notAZip.txt",
        containPDF: "./test/data/containPDF.zip",
        containTEXT: "./test/data/containTEXT.zip",
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs
                .readFileSync(datasetsToLoad[id])
                .toString("base64");
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

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    // Add corrupted zip
    it("Should add a corrupted zip dataset", function () {
        const id: string = "corrupted";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // Add empty zip
    it("Should add a empty zip dataset", function () {
        const id: string = "empty";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // Add notAPropZip zip
    it("Should add a notAPropZip zip dataset", function () {
        const id: string = "notAPropZip";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // Add containPDF zip
    it("Should add a containPDF zip dataset", function () {
        const id: string = "containPDF";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // Add containTEXT zip
    it("Should add a containTEXT zip dataset", function () {
        const id: string = "containTEXT";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // Add notAZip txt
    it("Should add a notAZip zip dataset", function () {
        const id: string = "notAZip";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // Valid add
    it("Should add a number key valid dataset", function () {
        const key: string = "10";
        const expected: string[] = [key];
        return insightFacade
            .addDataset(key, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect(result).to.deep.equal(expected);
            })
            .catch((err: any) => {
                expect.fail(err, expected, "Should not have rejected");
            });
    });

    // Multiple add
    it("Should add some valid datasets", function () {
        const id: string = "courses";
        const id01: string = "courses01";
        const expected: string[] = [id, id01];
        insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .addDataset(id01, datasets[id], InsightDatasetKind.Courses)
                    .then((result: string[]) => {
                        expect(result).to.deep.equal(expected);
                    })
                    .catch((err: any) => {
                        expect.fail(err, expected, "Should not have rejected");
                    });
            });
    });

    // False add
    it("Should add a whitespace false valid dataset", function () {
        const id: string = " ";
        return insightFacade
            .addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should add a underscore false valid dataset", function () {
        const id: string = "_";
        return insightFacade
            .addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should add a repeated false valid dataset", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                    .then((result: string[]) => {
                        expect.fail(result, "Should not have resolved");
                    })
                    .catch((err: any) => {
                        expect(err).to.equal(InsightError);
                    });
            });
    });

    // False add
    it("Should add a null key false valid dataset", function () {
        const id: string = "";
        return insightFacade
            .addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should add some keys false valid dataset", function () {
        const id: string = " _";
        return insightFacade
            .addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should add undefined key false valid dataset", function () {
        const id: string = undefined;
        return insightFacade
            .addDataset(id, datasets["courses"], InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should pass in false dataset value", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, "string", InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should pass in false dataset value", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, "", InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should pass in false dataset value", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, " ", InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should pass in false dataset value", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, undefined, InsightDatasetKind.Courses)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // False add
    it("Should pass in false kind value", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], undefined)
            .then((result: string[]) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.equal(InsightError);
            });
    });

    // Simple remove
    it("Should remove a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .removeDataset(id)
                    .then((result: string) => {
                        expect(result).to.deep.equal(expected);
                    })
                    .catch((err: any) => {
                        expect.fail(err, "Should not have rejected");
                    });
            });
    });

    // Multiple remove
    it("Should remove multiple valid datasets", function () {
        const id: string = "courses";
        const id01: string = "courses01";
        const expected: string[] = [id];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .addDataset(id01, datasets[id], InsightDatasetKind.Courses)
                    .then(() => {
                        return insightFacade.removeDataset(id01).then(() => {
                            return insightFacade
                                .removeDataset(id)
                                .then((result: string) => {
                                    expect(result).to.deep.equal(expected);
                                })
                                .catch((err: any) => {
                                    expect.fail(
                                        err,
                                        "Should not have rejected",
                                    );
                                });
                        });
                    });
            });
    });

    // Multiple remove
    it("Should remove multiple valid datasets01", function () {
        const id: string = "courses";
        const id01: string = "courses01";
        const expected: string[] = [id01];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .addDataset(id01, datasets[id], InsightDatasetKind.Courses)
                    .then(() => {
                        return insightFacade.removeDataset(id).then(() => {
                            return insightFacade
                                .removeDataset(id01)
                                .then((result: string) => {
                                    expect(result).to.deep.equal(expected);
                                })
                                .catch((err: any) => {
                                    expect.fail(
                                        err,
                                        "Should not have rejected",
                                    );
                                });
                        });
                    });
            });
    });

    // Multiple remove
    it("Should remove multiple valid datasets02", function () {
        const id: string = "courses";
        const id01: string = "courses01";
        const expected: string[] = [id01];
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade.removeDataset(id).then(() => {
                    return insightFacade.removeDataset(id).then(() => {
                        return insightFacade
                            .addDataset(
                                id01,
                                datasets[id],
                                InsightDatasetKind.Courses,
                            )
                            .then(() => {
                                return insightFacade
                                    .removeDataset(id01)
                                    .then((result: string) => {
                                        expect(result).to.deep.equal(expected);
                                    })
                                    .catch((err: any) => {
                                        expect.fail(
                                            err,
                                            "Should not have rejected",
                                        );
                                    });
                            });
                    });
                });
            });
    });

    // Empty false remove
    it("Should remove an empty dataset", function () {
        const id: string = "courses";
        return insightFacade
            .removeDataset(id)
            .then((result: string) => {
                expect.fail(result, "Should not have resolved");
            })
            .catch((err: any) => {
                expect(err).to.be.oneOf([InsightError, NotFoundError]);
            });
    });

    // False multiple remove
    it("Should add then remove invalid dataset", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade.removeDataset(id).then(() => {
                    return insightFacade
                        .removeDataset(id)
                        .then((result: string) => {
                            expect.fail(result, "Should not have resolved");
                        })
                        .catch((err: any) => {
                            expect(err).to.be.oneOf([
                                InsightError,
                                NotFoundError,
                            ]);
                        });
                });
            });
    });

    // False key remove
    it("Should remove invalid key dataset", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .removeDataset("false")
                    .then((result: string) => {
                        expect.fail(result, "Should not have resolved");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.oneOf([InsightError, NotFoundError]);
                    });
            });
    });

    // False key remove
    it("Should remove invalid key dataset", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .removeDataset("_")
                    .then((result: string) => {
                        expect.fail(result, "Should not have resolved");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.oneOf([InsightError, NotFoundError]);
                    });
            });
    });

    // False key remove
    it("Should remove invalid key dataset", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .removeDataset(" ")
                    .then((result: string) => {
                        expect.fail(result, "Should not have resolved");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.oneOf([InsightError, NotFoundError]);
                    });
            });
    });

    // False key remove
    it("Should remove invalid key dataset", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .removeDataset("")
                    .then((result: string) => {
                        expect.fail(result, "Should not have resolved");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.oneOf([InsightError, NotFoundError]);
                    });
            });
    });

    // False key remove
    it("Should remove invalid key dataset", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .removeDataset(undefined)
                    .then((result: string) => {
                        expect.fail(result, "Should not have resolved");
                    })
                    .catch((err: any) => {
                        expect(err).to.be.oneOf([InsightError, NotFoundError]);
                    });
            });
    });

    // List datasets
    it("Should list all datasets", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .listDatasets()
                    .then((result: InsightDataset[]) => {
                        expect(result).to.equal([id]);
                    })
                    .catch((err: any) => {
                        expect.fail(err, "Should not have resolved");
                    });
            });
    });

    // List some datasets
    it("Should list all datasets", function () {
        const id: string = "courses";
        const id1: string = "courses01";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .addDataset(id1, datasets[id1], InsightDatasetKind.Courses)
                    .then(() => {
                        return insightFacade
                            .listDatasets()
                            .then((result: InsightDataset[]) => {
                                expect(result).to.equal([id, id1]);
                            })
                            .catch((err: any) => {
                                expect.fail(err, "Should not have resolved");
                            });
                    });
            });
    });

    // List empty datasets
    it("Should list no datasets", function () {
        return insightFacade
            .listDatasets()
            .then((result: InsightDataset[]) => {
                expect(result).to.equal([]);
            })
            .catch((err: any) => {
                expect.fail(err, "Should not have resolved");
            });
    });

    // List some datasets
    it("Should list all datasets", function () {
        const id: string = "courses";
        const id1: string = "notAZip";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade
                    .addDataset(id1, datasets[id1], InsightDatasetKind.Courses)
                    .then(() => {
                        return insightFacade
                            .listDatasets()
                            .then((result: InsightDataset[]) => {
                                expect(result).to.equal([id]);
                            })
                            .catch((err: any) => {
                                expect.fail(err, "Should not have resolved");
                            });
                    });
            });
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: {
        [id: string]: { path: string; kind: InsightDatasetKind };
    } = {
        courses: {
            path: "./test/data/courses.zip",
            kind: InsightDatasetKind.Courses,
        },
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
            expect.fail(
                "",
                "",
                `Failed to read one or more test queries. ${err}`,
            );
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(
                insightFacade.addDataset(id, data, ds.kind),
            );
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
                    insightFacade
                        .performQuery(test.query)
                        .then((result) => {
                            TestUtil.checkQueryResult(test, result, done);
                        })
                        .catch((err) => {
                            TestUtil.checkQueryResult(test, err, done);
                        });
                });
            }
        });
    });
});
