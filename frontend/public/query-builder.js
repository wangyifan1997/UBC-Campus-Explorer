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
    let fields;
    let dataset = document.getElementsByClassName("nav-item tab active")[0].getAttribute("data-type");
    if (dataset === "courses") {
        fields = coursesFields;
    } else {
        fields = roomFields;
    }
    let query = {};
    let where = this.buildWhere(dataset);
    let options = this.buildOptions(dataset, fields);
    let transformations = this.buildTransformations(dataset, fields);
    query["WHERE"] = where;
    query["OPTIONS"] = options;
    if (Object.keys(transformations) !== 0) {
        query["TRANSFORMATIONS"] = transformations;
    }
    return query;
};

CampusExplorer.buildTransformations = function (dataset, fields) {
    let group = this.buildGroup(dataset, fields);
    let apply = this.buildApply(dataset);
    let result = {}
    if (group.length !== 0) {
        result["GROUP"] = group;
    }
    if (apply.length !== 0) {
        result["APPLY"] = apply;
    }
    return result;
}

CampusExplorer.buildOptions = function (dataset, fields) {
    let columns = this.buildColumns(dataset);
    let order = this.buildOrder(dataset, fields);
    let result = {};
    result["COLUMNS"] = columns;
    if (Object.keys(order) !== 0) {
        result["ORDER"] = order;
    }
    return result;
}

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

CampusExplorer.buildGroup = function (dataset, std) {
    let groups = [];
    let allGroups = document.getElementsByClassName("form-group groups")[0].getElementsByClassName("control field");
    for (let group of allGroups) {
        if (group.getElementsByTagName("input")[0].getAttribute("checked")) {
            const val = group.getElementsByTagName("input")[0].getAttribute("value");
            if (std.includes(val)) {
                group.push(dataset + "_" + val);
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
        let isDescending = document.getElementsByClassName("control descending")[0].getElementsByTagName("input")[0].getAttribute("checked");
        if (isDescending) {
            return {dir: "DOWN", keys: fields};
        } else {
            return {dir: "UP", keys: fields};
        }
    }
};

CampusExplorer.buildApply = function (dataset) {
    let result = [];
    let rules = document.getElementsByClassName("control-group transformation");
    for (let rule of rules) {
        this.buildSingleRule(dataset, rule, result);
    }
    return result;
};

CampusExplorer.buildSingleRule = function (dataset, rule, result) {
    let term = rule.getElementsByClassName("control term")[0].getElementsByTagName("input")[0].getAttribute("value");
    if (term === null) {
        term = "";
    }
    let opers = rule.getElementsByClassName("control operators")[0].getElementsByTagName("option");
    let operator;
    for (let oper of opers) {
        if (oper.getAttribute("selected")) {
            operator = oper.getAttribute("value");
        }
    }
    let flds = rule.getElementsByClassName("control fields")[0].getElementsByTagName("option");
    let field;
    for (let fld of flds) {
        if (fld.getAttribute("selected")) {
            field = dataset + "_" + fld.getAttribute("value");
        }
    }
    let res0 = {};
    res0[operator] = field;
    let res1 = {};
    res1[term] = res0;
    result.push(res1);
};
