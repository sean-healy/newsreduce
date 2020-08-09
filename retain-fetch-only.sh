#!/usr/bin/bash
while read tzst; do
    echo $tzst
    pattern="^[0-9]+/([0-9]+_((raw\.html)|(headers\.txt)|(title\.txt)|(raw-links\.txt)|(wiki-cats\.bin)|(wiki-pages\.bin)|(link-hits\.bin)|(anchor-paths\.txt)|(raw\.html)))?$"
    parts=$(tar -atf "$tzst" | egrep -v "$pattern")
    if [ "$parts" ]; then
        zstd -d -c "$tzst" | tar --delete $(echo $parts) | zstd -c > /tmp/arc.tar.zstd
        mv /tmp/arc.tar.zstd "$tzst"
    fi
done <<<$(find /var/newsreduce/blobs/ -type f | sort)
