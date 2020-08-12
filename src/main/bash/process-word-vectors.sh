#!/usr/bin/bash
(cd /var/newsreduce/word-vectors && for src in $(ls *.bin | egrep -v '^(normalized|similarities)'); do
    normal="normalized_$src"
    cp "$src" "$normal"
    echo $(date) normalize-to-unit-circle "$normal"
    normalize-to-unit-circle "$normal"
    dst="similarities_$src"
    if [ ! -f "$dst" ]; then
        echo $(date) build-similarity-matrix "$normal" "$dst"
        build-similarity-matrix "$normal" "$dst"
    fi
done)
