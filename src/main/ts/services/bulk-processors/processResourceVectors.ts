import { WordVectors } from "types/WordVectors";

export async function main() {
    const vectors = 
        await WordVectors.fromBinaryPath("/var/newsreduce/word-vectors/fasttext_crawl-300d-2M.bin");
    console.log(vectors);
}

main();