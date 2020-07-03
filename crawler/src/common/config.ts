import fs from "fs";
const PROJECT_DIR_NAME = "newsreduce";
const dirArray = __dirname.split('/');
const firstI = dirArray.indexOf(PROJECT_DIR_NAME);
const lastI = dirArray.lastIndexOf(PROJECT_DIR_NAME);

if (firstI !== lastI) {
    throw `path name error: only the root project folder may have the name '${PROJECT_DIR_NAME}'`;
}

let PROJECT_DIR = undefined;

export function projectDir() {
    if (PROJECT_DIR === undefined) {
        PROJECT_DIR = dirArray.filter((_, i) => i <= firstI).join("/");
    }

    return PROJECT_DIR;
}

export async function varDirPromise() {
    const varDir = "/var/newsreduce";
    return new Promise<string>((resolve, reject) => {
        fs.exists(varDir, exists => {
            if (exists) {
                resolve(varDir);
            } else {
                fs.mkdir(varDir, err => {
                    if (err) reject(err);
                    else resolve(varDir)
                })
            }
        })
    });
}
export async function blobDirPromise() {
    return new Promise<string>((resolve, reject) => {
        const blobDir = "/var/newsreduce/blobs"
        fs.exists(blobDir, exists => {
            if (exists) {
                resolve(blobDir);
            } else {
                fs.mkdir(blobDir, { recursive: true, mode: 0o700 }, err => {
                    if (err) reject(err);
                    else resolve(blobDir)
                })
            }
        });
    });
}
