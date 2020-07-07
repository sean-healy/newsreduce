class A {
    foo: string;
    bar: string;

    baz() {

    }
}

test("iterating class propeties should return functions", () => {
    const allKeys = [];
    for (const k in new A()) {
        allKeys.push(k);
    }
    expect(allKeys).toBe(["foo", "bar", "baz"]);
});

test("class name accessible", () => {
    expect(A.name).toBe("A");
});
