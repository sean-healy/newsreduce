import { DBObject } from "types/DBObject";
import { VersionType } from "./VersionType";
import { entityName, Entity } from "types/Entity";
import { write, read, stream, replace } from "file";
import { fancyLog } from "common/util";
import { Version } from "./Version";

export abstract class EntityObject<T extends EntityObject<T>> extends DBObject<T> {
    abstract entity(): Entity;
    abstract versionObject(time: number, type: VersionType, length: number): Version<any, T>;
    async writeVersion(
        time: number,
        type: VersionType,
        input: string | Buffer | NodeJS.ReadableStream
    ) {
        const id = this.getID();
        let bytesWritten: number = -1;
        if (typeof input === "string" || input instanceof Buffer) {
            let i = 0;
            for (i = 0; i < 10 && bytesWritten < 0; ++i)
                bytesWritten = await write(this.entity(), id, time, type, input);
            if (i > 1 && bytesWritten >= 0) {
                fancyLog(
                    `wrote ${bytesWritten}b to ` +
                    `${entityName(this.entity())} ${id} ` +
                    `(${type.filename}, v${time}) on attempt ${i}.`
                );
            }
        } else
            bytesWritten = await write(this.entity(), id, time, type, input);

        if (bytesWritten >= 0)
            this.versionObject(time, type, bytesWritten).enqueueInsert({ recursive: true });

        return bytesWritten;
    }
    async replaceVersion(
        time: number,
        type: VersionType,
        bufferFile: string,
        length: number,
    ) {
        const id = this.getID();
        let bytesWritten: number = -1;
        let i = 0;
        for (i = 0; i < 10 && bytesWritten < 0; ++i)
            bytesWritten = await replace(this.entity(), id, time, type, bufferFile, length);
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
    async read(time: number, format: VersionType) {
        try {
            return await read(this.entity(), this.getID(), time, format);
        } catch (e) {
            return null;
        }
    }
    async stream(time: number, format: VersionType) {
        try {
            return await stream(this.entity(), this.getID(), time, format);
        } catch (e) {
            return null;
        }
    }

}