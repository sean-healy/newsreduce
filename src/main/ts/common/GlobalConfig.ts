import { readFileSync } from "fs";
import { parse } from "ini";
import path from "path";

export const PRODUCTION_INI = "/etc/newsreduce.ini";
export const TEST_INI = path.join(__dirname, "../../../test/config/config.ini")
export const INI = process.env.TEST ? TEST_INI : PRODUCTION_INI;

export class GlobalConfig {
    general: GeneralConfig = new GeneralConfig();
    database: DatabaseConfig = new DatabaseConfig();
    mainRedis: MainRedisConfig = new MainRedisConfig();
    mainNetAgent: MainNetAgentConfig = new MainNetAgentConfig();
    localRedis: LocalRedisConfig = new LocalRedisConfig();
    network: NetworkConfig = new NetworkConfig();

    constructor(arg?: any) {
        if (arg) {
            if (arg.general) this.general = new GeneralConfig(arg.general);
            if (arg.database) this.database = new DatabaseConfig(arg.database);
            if (arg.mainRedis) this.mainRedis = new MainRedisConfig(arg.mainRedis);
            if (arg.localRedis) this.localRedis = new LocalRedisConfig(arg.localRedis);
            if (arg.network) this.network = new NetworkConfig(arg.network);
            if (arg.mainNetAgent) this.mainNetAgent = new MainNetAgentConfig(arg.mainNetAgent);
        }
    }

    private static CURRENT_CONFIG: GlobalConfig = null;
    static softFetch() {
        let config: GlobalConfig;
        if (GlobalConfig.CURRENT_CONFIG) config = GlobalConfig.CURRENT_CONFIG;
        else config = this.hardFetch();

        return config;
    }
    static hardFetch() {
        GlobalConfig.CURRENT_CONFIG = new GlobalConfig(parse(readFileSync(INI).toString()));

        return GlobalConfig.CURRENT_CONFIG;
    }
}

export class GeneralConfig {
    environment: string = "production";
    user: string = "newsreduce";
    role: string = "main";

    constructor(arg?: any) {
        if (arg) {
            if (arg.environment) this.environment = arg.environment;
            if (arg.user) this.user = arg.user;
            if (arg.role) this.user = arg.role;
        }
    }
}

export class DatabaseConfig {
    database: string = "newsreduce";
    host: string = "newsreduce.org";
    password: string;
    port: number = 3306;
    user: string = "newsreduce";

    constructor(arg?: any) {
        if (arg) {
            if (arg.database) this.database = arg.database;
            if (arg.host) this.host = arg.host;
            if (arg.password) this.password = arg.password;
            if (arg.port) this.port = parseInt(arg.port);
            if (arg.user) this.user = arg.user;
        }
    }
}

export class MainRedisConfig {
    host: string = "newsreduce.org";
    port: number = 6379;

    constructor(arg?: any) {
        if (arg) {
            if (arg.host) this.host = arg.host;
            if (arg.port) this.port = parseInt(arg.port);
        }
    }
}

export class MainNetAgentConfig {
    host: string = "newsreduce.org";
    port: number = 9999;

    constructor(arg?: any) {
        if (arg) {
            if (arg.host) this.host = arg.host;
            if (arg.port) this.port = parseInt(arg.port);
        }
    }
}

export class LocalRedisConfig {
    host: string = "::ffff:127.0.0.1";
    port: number = 6379;

    constructor(arg?: any) {
        if (arg) {
            if (arg.port) this.port = parseInt(arg.port);
            if (arg.host) this.host = arg.host;
        }
    }
}

export class NetworkConfig {
    hosts: string[] = [
        "::ffff:127.0.0.1"
    ];

    constructor(arg?: any) {
        if (arg) {
            if (arg.hosts) this.hosts = arg.hosts;
        }
    }
}