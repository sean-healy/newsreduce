#!/usr/bin/bash
base=$(arg base $@)
if [ ! "$base" ]; then
    base=/var/newsreduce/word-vectors 
fi
NORMALIZE="normalize-to-unit-circle"
if [ ! "$(command -v "$NORMALIZE" 2>/dev/null)" ]; then
    NORMALIZE="$HOME/newsreduce/dist/$NORMALIZE"
fi
BUILD=build-similarity-matrix
if [ ! "$(command -v "$BUILD" 2>/dev/null)" ]; then
    BUILD="$HOME/newsreduce/dist/$BUILD"
fi
(cd "$base" && for src in $(ls *.bin | egrep -v '^(normalized|similarities)'); do
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
