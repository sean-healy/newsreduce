import React, { useState } from "react";

interface Props {
    path: string;
}

const COLUMN_ORDER = [
    "id", "functor"
];

type Result = { [key: string]: string };
interface State {
    path: string,
    breadcrumbs: [string, number, string],
    columns: {
        [key: string]: string;
    }
    order: string;
    offset: bigint;
    limit: bigint;
    results: Result[];
    times: number[];
    formats: string[];
    version: string;
}

const api = "http://newsreduce.org:9999"

const predicatePath = (path: string) => !!path.match(/^[0-9A-F]{24}$/);
const timePath = (path: string) => !!path.match(/^[0-9A-F]{24}\/[0-9]+$/);
const formatPath = (path: string) => !!path.match(/^[0-9A-F]{24}\/[0-9]+\/.+$/);

const formatDate = (ms: number) => new Date(ms).toISOString().replace(/T/, " ");

const titleCase = (value: string) =>
    value.length <= 3 ? value.toUpperCase() : `${value[0].toUpperCase()}${value.slice(1)}`

const toPredicate = (next: string, state: State, setState: React.Dispatch<React.SetStateAction<State>>) => {
    const breadcrumbs: State["breadcrumbs"] = [...state.breadcrumbs];
    const prev = breadcrumbs[0];
    breadcrumbs[0] = next;
    const path = breadcrumbs.slice(0, 1).map(crumb => `${crumb}`).join("/");
    const nextState: State = { ...state, path, breadcrumbs, times: prev !== next ? null : state.times };
    if (prev !== next || !state.times) {
        const url = `${api}/predicate-times?id=${BigInt(`0x${breadcrumbs[0]}`)}`;
        fetch(url)
            .then(response => response.json())
            .then(versions => setState({ ...nextState, times: versions }));
    } else setState(nextState)
}

const toTime = (next: number, state: State, setState: React.Dispatch<React.SetStateAction<State>>) => {
    console.log("toTime");
    const breadcrumbs: State["breadcrumbs"] = [...state.breadcrumbs];
    const prev = breadcrumbs[1];
    breadcrumbs[1] = next;
    const path = breadcrumbs.slice(0, 2).map(crumb => `${crumb}`).join("/");
    const nextState: State = { ...state, path, breadcrumbs, formats: prev !== next ? null : state.formats };
    if (prev !== next || !state.formats) {
        const url = `${api}/predicate-formats?id=${BigInt(`0x${breadcrumbs[0]}`)}&time=${breadcrumbs[1]}`
        fetch(url)
            .then(response => response.json())
            .then(formats => setState({ ...nextState, formats }));
    } else setState(nextState)
}

const toFormat = (next: string, state: State, setState: React.Dispatch<React.SetStateAction<State>>) => {
    console.log("toFormat");
    const breadcrumbs: State["breadcrumbs"] = [...state.breadcrumbs];
    const prev = breadcrumbs[2];
    breadcrumbs[2] = next;
    const path = breadcrumbs.slice(0, 3).map(crumb => `${crumb}`).join("/");
    const nextState: State = { ...state, path, breadcrumbs, version: prev !== next ? null : state.version };
    if (prev !== next || !state.version ) {
        const version = `${api}/predicate-version?id=${BigInt(`0x${breadcrumbs[0]}`)}&time=${breadcrumbs[1]}&format=${breadcrumbs[2]}`;
        setState({ ...nextState, version });
    } else setState(nextState)
}

const toHome = (state: State, setState: React.Dispatch<React.SetStateAction<State>>) => {
    setState({ ...state, path: "" });
}

const breadcrumbNode = (index: number, state: State, setState: React.Dispatch<React.SetStateAction<State>>) => {
    const value: any = state.breadcrumbs[index];
    const url = `#${state.breadcrumbs.slice(0, index).concat([value]).join("/")}`;
    switch (index) {
        case 0:
            return <span className="breadcrumb" key={index}>
                <a href={url} onClick={() => toPredicate(value, state, setState)}>{value}</a>
            </span>;
        case 1:
            return <span className="breadcrumb" key={index}>
                <a href={url} onClick={() => toTime(value, state, setState)}>{formatDate(value)}</a>
            </span>;
        case 2:
            return <span className="breadcrumb" key={index}>
                <a href={url} onClick={() => toFormat(value, state, setState)}>{value.toUpperCase()}</a>
            </span>;
    }
}
const cell = (result: Result, key: string, state: State, setState: React.Dispatch<React.SetStateAction<State>>) => {
    switch (key) {
        case "id":
            const id = BigInt(result[key]).toString(16).toUpperCase().padStart(24, "0");
            return <a href={`#${id}`} onClick={() => toPredicate(id, state, setState)}>{id}</a>
        default: return `${result[key]}`
    }
}

export function App(props: Props) {
    const [state, setState ]= useState({
        ...props,
        breadcrumbs: ((crumbs: string[]) => [crumbs[0] || null, Number(crumbs[1]) || null, crumbs[2] || null])(props.path.split("/")),
        columns: {},
        order: null,
        limit: 50n,
        offset: 0n,
        results: [],
        times: null,
        formats: null,
        version: null,
    } as State);
    if (state.breadcrumbs[2] && !state.version && formatPath(state.path)) toFormat(state.breadcrumbs[2], state, setState);
    else if (state.breadcrumbs[1] && !state.formats && timePath(state.path)) toTime(state.breadcrumbs[1], state, setState);
    else if (state.breadcrumbs[0] && !state.times && predicatePath(state.path)) toPredicate(state.breadcrumbs[0], state, setState);
    return <>
        <header>
        <form onChange={e => {
            const name: string = (e.target as any).name;
            let value: any;
            const type: string = (e.target as any).type;
            switch (type) {
                case "checkbox":
                    value = (e.target as any).checked;
                    break;
                case "number":
                    value = BigInt((e.target as any).value);
                    break;
                default:
                    value = (e.target as any).value;
            }
            let nextState: State;
            if (name === "order")
                nextState = { ...state, order: value === "natural" ? null : value };
            else if (name === "limit")
                nextState = { ...state, limit: value };
            else if (name === "page")
                nextState = { ...state, offset: (value - 1n) * state.limit };
            else {
                const columns = { ...state.columns };
                nextState = { ...state, columns };
                if (value || value === false) columns[name] = value;
                else delete columns[name];
            }
            setState(nextState);
            const whereClauses: string[] = [];
            for (const key in nextState.columns) {
                const value = nextState.columns[key];
                switch (typeof value) {
                    case "boolean":
                        whereClauses.push(`${value ? "" : "not "}\`${key}\``);
                        break;
                    case "bigint":
                    case "number":
                        whereClauses.push(`\`${key}\` = ${value}`);
                        break;
                    case "string":
                        whereClauses.push(`\`${key}\` like "%${value}%"`);
                        break;
                }
            }
            const { order, limit, offset } = nextState;
            const whereClause = whereClauses.join(" and ");
            const sql =
                `select id, functor from Predicate` +
                `${whereClause ? ` where ${whereClause}` : ""}` +
                `${order ? ` order by \`${order}\`` : ""}` +
                ` limit ${limit} offset ${offset};`;
            console.log(sql);
            const encodedSQL = Buffer.from(sql).toString("hex");
            fetch(`${api}/query?sql=${encodedSQL}`)
                .then(response => response.json())
                .then(results => setState({ ...nextState, results }));
        }}>
            <input name="id" placeholder="ID" type="number"></input>
            <input name="functor" placeholder="Functor"></input>
            <label>Order by:</label>
            <select name="order" defaultValue="natural">
                <option value="natural">Natural</option>
                <option value="id">ID</option>
                <option value="functor">Functor</option>
            </select>
            <input name="limit" placeholder="Rows per pg." type="number"></input>
            <input name="page" placeholder="Page" type="number"></input>
        </form>
        <nav>
            <a href="#" onClick={() => toHome(state, setState)}>All</a>
            &rarr;{state.breadcrumbs.filter(notNull => notNull).map((_, i) => breadcrumbNode(i, state, setState))}</nav>
        </header>
        {predicatePath(state.path) ? (state.times ?
            <ol>{state.times.map((ms, i) => <li key={i}>
                <a href={`#${state.path}/${ms}`} onClick={() => toTime(ms, state, setState)}>{formatDate(ms)}</a>
            </li>)}</ol> : "Loading...") :
            timePath(state.path) ? (state.formats ?
                <ol>{state.formats.map((format, i) => <li key={i}>
                    <a href={`#${state.path}/${format}`} onClick={() => toFormat(format, state, setState)}>{format.toUpperCase()}</a>
                </li>)}</ol> : "Loading...") :
                formatPath(state.path) ? (state.version ?
                    <iframe src={state.version} sandbox=""/> : "Loading...") :
                    <table>
                        <thead>
                            <tr>{COLUMN_ORDER.map((key, i) => <th key={i}>{titleCase(key)}</th>)}</tr>
                        </thead>
                        <tbody>
                            {state.results.map((result, i) => <tr key={i}>
                                {COLUMN_ORDER.map((key, i) => <td key={i}>{cell(result, key, state, setState)}</td>)}
                            </tr>)}
                        </tbody>
                    </table>
        }
    </>;
}
