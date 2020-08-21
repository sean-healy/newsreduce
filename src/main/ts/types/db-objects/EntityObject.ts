import fs from "fs";
import { DBObject } from "types/DBObject";
import { VersionType } from "./VersionType";
import { entityName, Entity } from "types/Entity";
import {
    write,
    read,
    stream,
    replace,
    findFormatTimes,
    randomBufferFile,
    exists
} from "file";
import { fancyLog } from "common/util";
import { Version } from "./Version";

export abstract class EntityObject<T extends EntityObject<T>> extends DBObject<T> {
    abstract entity(): Entity;
    abstract versionObject(time: number, type: VersionType, length: number): Version<any, T>;
    exists(time: number, type: VersionType) {
        return exists(this.entity(), this.getID(), time, type);
    }
    async writeVersion(
        time: number,
        type: VersionType,
        input: string | Buffer | NodeJS.ReadableStream,
        suffix: string = null,
    ) {
        const id = this.getID();
        let bytesWritten: number = -1;
        if (typeof input === "string" || input instanceof Buffer) {
            let i = 0;
            for (i = 0; i < 10 && bytesWritten < 0; ++i)
                bytesWritten = await write(this.entity(), id, time, type, input, suffix);
            if (i > 1 && bytesWritten >= 0) {
                fancyLog(
                    `wrote ${bytesWritten}b to ` +
                    `${entityName(this.entity())} ${id} ` +
                    `(${type.filename}, v${time}) on attempt ${i}.`
                );
            }
        } else
            bytesWritten = await write(this.entity(), id, time, type, input, suffix);

        if (bytesWritten >= 0)
            this.versionObject(time, type, bytesWritten).enqueueInsert({ recursive: true });

        return bytesWritten;
    }
    async replaceVersion(
        time: number,
        type: VersionType,
        bufferFile: string,
        length: number,
        suffix: string = null,
    ) {
        const id = this.getID();
        let bytesWritten: number = -1;
        let i = 0;
        for (i = 0; i < 10 && bytesWritten < 0; ++i)
            bytesWritten = await replace(this.entity(), id, time, type, bufferFile, length, suffix);
        if (i > 1 && bytesWritten >= 0) {
            fancyLog(
                `wrote ${bytesWritten}b to ` +
                `${entityName(this.entity())} ${id} ` +
                `(${type.filename}, v${time}) on attempt ${i}.`
            );
        }

        if (bytesWritten >= 0)
            this.versionObject(time, type, bytesWritten).enqueueInsert({ recursive: true });

        return bytesWritten;
    }
    async read(
        time: number,
        format: VersionType,
        suffix: string = null,
    ) {
        try {
            return await read(this.entity(), this.getID(), time, format, suffix);
        } catch (e) {
            return null;
        }
    }
    async latest(format: VersionType) {
        const entity = this.entity();
        const id = this.getID();
        const times = await findFormatTimes(entity, id, format);
        const latestTime = times.reduce((a, b) => Math.max(a, b));

        return latestTime;
    }
    async readLatest(
        format: VersionType,
        suffix: string = null,
    ) {
        try {
            return await this.read(await this.latest(format), format, suffix);
        } catch (e) {
            return null;
        }
    }
    async streamLatest(
        format: VersionType,
        suffix: string = null,
    ) {
        try {
            return await this.stream(await this.latest(format), format, suffix);
        } catch (e) {
            return null;
        }
    }
    async stream(
        time: number,
        format: VersionType,
        suffix: string = null,
    ) {
        try {
            return await stream(this.entity(), this.getID(), time, format, suffix);
        } catch (e) {
            return null;
        }
    }
    async tmpFileLatest(
        format: VersionType,
        suffix: string = null,
    ) {
        try {
            return await this.tmpFile(await this.latest(format), format, suffix);
        } catch (e) {
            fancyLog(JSON.stringify(e));
            return null;
        }
    }
    async tmpFile(
        time: number,
        format: VersionType,
        suffix: string = null
    ) {
        let length = 0;
        let file: string;
        try {
            const src = await this.stream(time, format, suffix);
            file = randomBufferFile();
            const dst = fs.createWriteStream(file);
            src.pipe(dst);
            await new Promise<void>(res => dst.on("finish", res));
        } catch (e) {
            fancyLog("error during BOW to file:");
            fancyLog(JSON.stringify(e));
            length = -1;
            file = null;
        }

        return { length, file };
    }
}
