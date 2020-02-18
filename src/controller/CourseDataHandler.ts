import * as JSZip from "jszip";
import {InsightError} from "./IInsightFacade";

export default class CourseDataHandler {
    public loadAllFilesToAllPromises(zipData: JSZip): Promise<string[]> {
        let allFiles: string[] = [];
        zipData.folder("courses").forEach((relativePath, file) => {
            allFiles.push(file.name);
        });
        let allPromises: any[] = allFiles.map((fileDir: string) => {
            return zipData.file(fileDir).async("text");
        });
        return Promise.all(allPromises);
    }

    public parseCourseJSON(contents: string[]): Promise<string[]> {
        let temp: any[] = [];
        for (let course of contents) {
            try {
                temp.push(JSON.parse(course));
            } catch (e) {
                continue;
            }
        }
        return Promise.resolve(temp);
    }

    public getAllSections(allCourses: any[], id: string): Promise<any> {
        let allSections: any[] = [];
        for (let course of allCourses) {
            let sections: any[] = course.result;
            for (let section of sections) {
                if (this.isValidSection(section)) {
                    section.id = section.id.toString();
                    if (typeof section.Section !== "undefined"
                        && section.Section.toLowerCase() === "overall") {
                        section.Year = 1900;
                    }
                    section.Year = Number(section.Year);
                    if (!isNaN(section.Year)) {
                        section = this.convertSection(section, id);
                        allSections.push(section);
                    }
                }
            }
        }
        if (allSections.length === 0) {
            return Promise.reject(new InsightError());
        } else {
            return Promise.resolve(allSections);
        }
    }

    private convertSection(section: any, id: string): any {
        let newSection: any = {};
        for (let key of Object.keys(section)) {
            switch (key) {
                case "Subject":
                    newSection[id + "_" + "dept"] = section[key];
                    continue;
                case "Course":
                    newSection[id + "_" + "id"] = section[key];
                    continue;
                case "Avg":
                    newSection[id + "_" + "avg"] = section[key];
                    continue;
                case "Professor":
                    newSection[id + "_" + "instructor"] = section[key];
                    continue;
                case "Title":
                    newSection[id + "_" + "title"] = section[key];
                    continue;
                case "Pass":
                    newSection[id + "_" + "pass"] = section[key];
                    continue;
                case "Fail":
                    newSection[id + "_" + "fail"] = section[key];
                    continue;
                case "Audit":
                    newSection[id + "_" + "audit"] = section[key];
                    continue;
                case "id":
                    newSection[id + "_" + "uuid"] = section[key];
                    continue;
                case "Year":
                    newSection[id + "_" + "year"] = section[key];
                    continue;
                default:
                    continue;
            }
        }
        return newSection;
    }

    private isValidSection(section: any): boolean {
        return (typeof section.Subject === "string"
            && typeof section.Course === "string"
            && typeof section.Avg === "number"
            && typeof section.Professor === "string"
            && typeof section.Title === "string"
            && typeof section.Pass === "number"
            && typeof section.Fail === "number"
            && typeof section.Audit === "number"
            && typeof section.id === "number"
            && typeof section.Year === "string");
    }
}
