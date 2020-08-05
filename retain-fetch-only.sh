#!/usr/bin/bash
while read tzst; do
    echo $tzst
    parts=$(tar -atf "$tzst" | egrep -v "^[0-9]+/([0-9]+_(raw.html|headers.txt))?$")
    if [ "$parts" ]; then
        zstd -d -c "$tzst" | tar --delete $parts | zstd -c > /tmp/arc.tar.zstd
        mv /tmp/arc.tar.zstd "$tzst"
    fi
done <<<$(find /var/newsreduce/blobs/ -type f | sort)
