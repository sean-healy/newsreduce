#!/usr/bin/bash
sources="$(echo 'select u.resource, u.url, label from WordVectorSource s inner join URLView u on u.resource = s.resource' | nr-sql 2>/dev/null)"
while read source; do
    id="${source%%	*}"
    url="$(echo "$source" | cut -d$'\t' -f2)"
    label="${source##*	}"
    dir="/var/newsreduce/word-vectors/$label"
    mkdir -p $dir
    (cd $dir && wget -nc "$url")
    (cd $dir && find -regex '.*\.zip' -exec unzip -n {} \;)
    while read path; do
        # For debugging.
        #if [ "$(du -sb $path | cut -f1)" -gt 100000000 ]; then
        #    head -10000 $path > /tmp/a
        #    mv /tmp/a $path
        #fi
        node dist/nr-process-word-vectors.js --label="$label" --url="$url" "$path"
    done <<<$(find "$dir" -regex '.*\.vec')
done <<<$(echo "$sources")
