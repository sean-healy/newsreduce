import { ENV } from "common/config"
import { STATIC_CONNECTIONS } from "common/connections";

beforeAll(() => {
    ENV[0] = "test";
});

afterAll(() => {
    for (const key in STATIC_CONNECTIONS) {
        STATIC_CONNECTIONS[key].quit();
        delete STATIC_CONNECTIONS[key];
    }
});
