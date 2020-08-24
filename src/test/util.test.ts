import "./setup.ts";
import { writeBigUInt96BE, bytesToBigInt, CMP_BIG_INT, tabulate } from "utils/alpha"

test("12 bytes big int can be converted to buffer", () => {
    let buff = Buffer.alloc(12);
    writeBigUInt96BE(BigInt("0xFFEEDDCCBBAA998877665544"), buff, 0)
    expect(buff.toString("hex")).toBe("ffeeddccbbaa998877665544");

    buff = Buffer.alloc(13);
    writeBigUInt96BE(BigInt("0xFFEEDDCCBBAA998877665544"), buff, 1)
    expect(buff.toString("hex")).toBe("00ffeeddccbbaa998877665544");
});

test("bytes to bigint works", () => {
    const buff = Buffer.of(0xFF, 0xEE, 0xDD, 0xCC, 0xBB, 0xAA, 0x99, 0x88, 0x77, 0x66, 0x55, 0x44);
    const i = bytesToBigInt(buff)

    expect(i.toString(16)).toBe("ffeeddccbbaa998877665544");
});


test("bigint comparison works", () => {
    expect(CMP_BIG_INT(1n, 2n) < 0).toBe(true);
    expect(CMP_BIG_INT(2n, 1n) > 0).toBe(true);
    expect(CMP_BIG_INT(2n, 2n) === 0).toBe(true);
});

test("tabulate should work", () => {
    tabulate([
        {
            foo: 1,
            bar: 2,
        },
        {
            foo: 242493249,
            bar: 9232424,
        },
    ]);
    tabulate([
        {
            first: "sean",
            last: "healy",
        },
        {
            first: "ongo",
            last: "gablogian",
        },
    ]);
});
