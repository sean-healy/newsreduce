class A {
    foo: string;
    bar: string;

    baz() {

    }
}

test("iterating class propeties should return functions", () => {
    const allKeys = [];
    const c = new A();
    c.foo = "1"
    c.bar = "1"
    for (const k in c) {
        allKeys.push(k);
    }
    expect(allKeys).toStrictEqual(["foo", "bar", "baz"]);
});

test("iterating class propeties should not return uninitialised elements", () => {
    const allKeys = [];
    const c = new A();
    for (const k in c) {
        allKeys.push(k);
    }
    expect(allKeys).toStrictEqual(["baz"]);
});

test("iterating class propeties should return elements set to undefined", () => {
    const allKeys = [];
    const c = new A();
    c.foo = undefined;
    for (const k in c) {
        allKeys.push(k);
    }
    expect(allKeys).toStrictEqual(["foo", "baz"]);
});

test("retrieving unitialised fields returns undefined", () => {
    const c = new A();
    expect(c.foo).toBe(undefined);
});

test("class name accessible", () => {
    expect(A.name).toBe("A");
});
