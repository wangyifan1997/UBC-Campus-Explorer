/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function (query) {
    return new Promise(function (fulfill, reject) {
        const url = "http://localhost:4321/query";
        let xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open("POST", url);
        xmlHttpRequest.send(JSON.stringify(query));

        xmlHttpRequest.onload = function () {
            if (xmlHttpRequest.status === 200) {
                resolve(xmlHttpRequest.response.result);
            } else {
                reject("response is not 200");
            }
        };

        xmlHttpRequest.onerror = function () {
            reject("On Error");
        }
    });
};
