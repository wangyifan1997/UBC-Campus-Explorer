/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    const roomFields = ["fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type", "furniture", "href"];
    const coursesFields = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
    const fields = [];
    let query = {};
    let dataset = document.getElementsByClassName("nav-item tab active")[0].getAttribute("data-type");
    let where = this.buildWhere(dataset);
    return query;
};

CampusExplorer.buildWhere = function (dataset) {
    let conds = document.getElementsByClassName("control-group condition");
    let result = [];
    for (let cond of conds) {
        this.buildSingleCond(dataset, cond, result);
    }
    if (result.length === 0) {
        return {};
    } else if (result.length === 1) {
        return result[0];
    } else {
        let all = document.getElementsByClassName("control conditions-all-radio")[0].getElementsByTagName("input")[0].getAttribute("checked");
        let any = document.getElementsByClassName("control conditions-any-radio")[0].getElementsByTagName("input")[0].getAttribute("checked");
        let none = document.getElementsByClassName("control conditions-none-radio")[0].getElementsByTagName("input")[0].getAttribute("checked");
        if (all) {
            return {AND: result};
        } else if (any) {
            return {OR: result};
        } else {
            return {NOT: {AND: result}};
        }
    }
};

CampusExplorer.buildSingleCond = function (dataset, cond, result) {
    let not = cond.getElementsByClassName("control not")[0].getElementsByTagName("input")[0].getAttribute("checked");
    let val = cond.getElementsByClassName("control term")[0].getElementsByTagName("input")[0].getAttribute("value");
    let opts = cond.getElementsByClassName("control fields")[0].getElementsByTagName("select")[0].getElementsByTagName("option");
    let field;
    for (let opt of opts) {
        if (opt.getAttribute("selected")) {
            field = dataset + "_" + opt.getAttribute("value");
        }
    }
    let opers = cond.getElementsByClassName("control operators")[0].getElementsByTagName("select")[0].getElementsByTagName("option");
    let operator;
    for (let oper of opers) {
        if (oper.getAttribute("selected")) {
            operator = oper.getAttribute("value");
        }
    }
    if (operator === "EQ" || operator === "GT" || operator === "LT") {
        if (!(val === null || val.trim(" ").length === 0 || Number.isNaN(Number(val)))) {
            val = Number(val);
        }
    }
    let res0 = {};
    res0[field] = val;
    let res1 = {};
    res1[operator] = res0;
    if (not) {
        result.push({NOT: res1});
    } else {
        result.push(res1);
    }
};

CampusExplorer.buildColumns = function (dataset) {
    let columns = [];
    let allColumns = document.getElementsByClassName("form-group columns")[0].getElementsByClassName("control field");
    for (let column of allColumns) {
        if (column.getElementsByTagName("input")[0].getAttribute("checked")) {
            columns.push(dataset + "_" + column.getElementsByTagName("input")[0].getAttribute("value"));
        }
    }
    return columns;
};

CampusExplorer.buildGroups = function (dataset, std) {
    let groups = [];
    let allGroups = document.getElementsByClassName("form-group groups")[0].getElementsByClassName("control field");
    for (let group of allGroups) {
        if (group.getElementsByTagName("input")[0].getAttribute("checked")) {
            const val = group.getElementsByTagName("input")[0].getAttribute("value");
            if (std.includes(val)) {
                group.push(dataset + "_" + val)
            } else {
                groups.push(val);
            }
        }
    }
    return groups;
};

CampusExplorer.buildOrder = function (dataset, std) {
    let fields = [];
    let options = document.getElementsByClassName("form-group order")[0]
        .getElementsByClassName("control order fields")[0].getElementsByTagName("option");
    for (let option of options) {
        if (option.getAttribute("selected")) {
            const val = option.getAttribute("value");
            if (std.includes(val)) {
                fields.push(dataset + "_" + val);
            } else {
                fields.push(val);
            }
        }
    }
    if (fields.length === 0) {
        return {};
    } else {
        // TODO
    }
}
