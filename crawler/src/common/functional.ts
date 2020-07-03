export const thenLog = (msg: string) => () => console.log(msg);
export const thenDebug = (err: any) => {
    if (err) console.debug(err);
};
