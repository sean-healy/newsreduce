#!/usr/bin/bash
while read c; do
    echo -n "$c" |              # -n ignore trailing newline                     \
    iconv -f utf8 -t utf32be |  # UTF-32 big-endian happens to be the code point \
    xxd -p |                    # -p just give me the plain hex                  \
    sed -r 's/^0+/0x/' |        # remove leading 0's, replace with 0x            \
    xargs printf 'U+%04X\n'     # pretty print the code point
done <<<$(cat /tmp/ls | sed 's/^ *[0-9]\+ //g')
