import path from "path";
import fs from "fs";
import { WordVectors } from "types/WordVectors";
import { ResourceURL } from "types/objects/ResourceURL";

test("word vector stuff works", async () => {
    const file = path.join(__dirname, "vectors/crawl-300d-2M-subword.vec");
    const wordVectors = await WordVectors.fromPath(file, new ResourceURL("http://example123.org"));
    const tmpFile = await wordVectors.toBuffer();
    console.log(tmpFile);
    const content = fs.readFileSync(tmpFile);
    console.log(content);
    fs.unlinkSync(tmpFile);

    expect(wordVectors.toString().split("\n")[2]).toBe("03839199717126269981439587396  fjF9cYdpfs6Afn1Uh/p+Cntugy6DeH+NgHKAQYF/fvmAsIA2fPqDZYEneHGAFoFXguR+xIOUf4l9noDsgid+GIHSf6uA64H/gDZ/Y4CBgnN/gX9agEiBP4G3goZ/OIAkf91/c4Cef3V+DIKGdaaBiHurgZyCJn9kgEN9tIKrf2p914AXgLt+uH6mfzB+F31igS19MoHmgpiBMH+ng8KAr4AXgGx92oCngHSA+YE1gRd/Z38Gf1OAHX29gNKAm43BgLiAiYDShBJ+KoFzf1l/kX8XfwOBy4CLhLiBd4ACf0aBB38UfpN+r32If4p/0nK4f7h/44GmflaAgoGkgBKAwH5ogKCAW4AKfaWDBH/MgVd+r4ACfqiBl4Chf8WA3n9/fJ+CHoA1fdl+f35NftR/3IBUfjqAtn9lfol+gIE0gauBSoKAfwmA6n/Sgv2A0X6ofb6B9X/IgIl+uYAGf5p+zYFYf59/YYAzfrh/toFbe215oYE4gH59Zn/6gPeBP374enmAGH68f9SBFn/Xf0d/DnnMfyCAdX77gI2AM4BdgOF+Sn7teGOAd4WtfzOBBYF6gHt/Q4C/gPuBfH54fjF/9IQIfqyChoPXfox/tYLteZ6Cb4Ntf+t/Cn4zf1l+oIAzepiASn7FgLN9fYHpgbWDXn7+gDmDGoE3fwV+T4DnfVeBhYJkgHt9xH9ygHh7RIC4fLt+43+MgGSBSH4UfsCANnvWgB5/mX67gCp/xX+gfYeCs4C/gQGAeIDYgRR+HHtdf7x+uYDigNOEeoH1fYV+ZYZ3f1+AbH/Y");
});
