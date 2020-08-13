#!/usr/bin/bash
# Override the newsreduce dir using --base dir
base="$(arg base $@)"
# Pass --fetchonly to skip nodejs processing.
fetchonly="$(arg onlyfetch $@)"
if [ ! "$base" ]; then
    base=/var/newsreduce/word-vectors
fi
#sources="$(echo 'select u.resource, u.url, label from WordVectorSource s inner join URLView u on u.resource = s.resource' | nr-sql 2>/dev/null)"
sources="$(cat src/main/bash/word-vector-sources.tsv)"
while read source; do
    id="${source%%	*}"
    url="$(echo "$source" | cut -d$'\t' -f2)"
    label="${source##*	}"
    dir="$base/$label"
    mkdir -p $dir
    (cd $dir && wget -nc "$url")
    (cd $dir && find -regex '.*\.zip' -exec unzip -n {} \;)
    if [ ! "$fetchonly" ]; then
        while read path; do
            node dist/nr-process-word-vectors.js --label="$label" --url="$url" "$path"
        done <<<$(find "$dir" -regex '.*\.vec')
    fi
done <<<$(echo "$sources")
