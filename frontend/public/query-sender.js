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
        xmlHttpRequest.setRequestHeader("Content-Type", "application/json");
        xmlHttpRequest.send(JSON.stringify(query));

        xmlHttpRequest.onload = function () {
            if (xmlHttpRequest.status === 200) {
                fulfill(JSON.parse(xmlHttpRequest.response));
            } else {
                reject(JSON.parse(xmlHttpRequest.response));
            }
        };

        xmlHttpRequest.onerror = function () {
            reject("On Error");
        }
    });
};
