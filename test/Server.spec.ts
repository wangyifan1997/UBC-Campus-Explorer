import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import Log from "../src/Util";
import * as fs from "fs-extra";

describe("Facade D3", function () {
    const cacheDir = __dirname + "/../data";
    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        server.start().then(function (val: boolean) {
            Log.info("App::initServer() - started: " + val);
        }).catch(function (err: Error) {
            Log.error("App::initServer() - ERROR: " + err.message);
        });
    });

    after(function () {
        server.stop().then((result: boolean) => {
            Log.info("Server::stop() - stopped");
        });
    });

    beforeEach(function () {
        server.stop();
        server.start().then(function (val: boolean) {
            Log.info("App::initServer() - started: " + val);
        }).catch(function (err: Error) {
            Log.error("App::initServer() - ERROR: " + err.message);
        });
    });

    afterEach(function () {
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
    });

    // Sample on how to format PUT requests

    it("PUT test for courses dataset", function () {
        try {
            let file = fs.readFileSync("./test/data/courses.zip");
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .send(file)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            expect.fail();
        }
    });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
