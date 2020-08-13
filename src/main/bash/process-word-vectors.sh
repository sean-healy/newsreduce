#!/usr/bin/bash
NORMALIZE="normalize-to-unit-circle"
if [ ! "$(command -v "$NORMALIZE" 2>/dev/null)" ]; then
    NORMALIZE="$HOME/newsreduce/dist/$NORMALIZE"
fi
BUILD=build-similarity-matrix
if [ ! "$(command -v "$BUILD" 2>/dev/null)" ]; then
    BUILD="$HOME/newsreduce/dist/$BUILD"
fi
(cd /var/newsreduce/word-vectors && for src in $(ls *.bin | egrep -v '^(normalized|similarities)'); do
    normal="normalized_$src"
    cp "$src" "$normal"
    echo $(date) normalize-to-unit-circle "$normal"
    "$NORMALIZE" "$normal"
    dst="similarities_$src"
    if [ ! -f "$dst" ]; then
        echo $(date) build-similarity-matrix "$normal" "$dst"
        "$BUILD" "$normal" "$dst"
    fi
done)
