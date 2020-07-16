#!/usr/bin/bash
fileList=/tmp/$(openssl rand -hex 30)
checksums=/tmp/$(openssl rand -hex 30)
cat /var/newsreduce/network | while read host; do
    echo $host
    (rsync -alrpgoDuzhtv newsreduce@$host:/var/newsreduce/tmp/ /var/newsreduce/tmp/\
        | awk -F/ '$1=="resource"&&$2~/^[0-9]+$/&&!$3{print $1"/"$2}'\
        > $fileList)
    (cd /var/newsreduce/tmp && cat $fileList | while read file; do
        md5="$(find $file -type f -exec md5sum {} \; | md5sum)"
        echo -e "${md5%% *}\t$file"
    done > $checksums)
    msg="$(sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\\\n/g' $checksums)"
    if [ "$msg" ]; then
        echo -e 'publish delete-files "'"$msg"'"' | redis-cli -h $host
    fi
    rm $fileList
    rm $checksums
done
