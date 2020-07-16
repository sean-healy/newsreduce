#!/usr/bin/bash
if [ -f /tmp/pull-remote-files ]; then
    echo Script already running elsewhere.
    exit
fi
touch /tmp/pull-remote-files
echo "setex compressor-lock 3600 1" | redis-cli
fileList=/tmp/$(openssl rand -hex 30)
checksums=/tmp/$(openssl rand -hex 30)
cat /var/newsreduce/network | while read host; do
    if [ $host = newsreduce.org ]; then continue; fi
    if [[ ! "$host" =~ newsreduce ]]; then continue; fi
    echo $host
    (rsync -alrpgoDuzhtv newsreduce@$host:/var/newsreduce/tmp/ /var/newsreduce/tmp/\
        | awk -F/ '$1=="resource"&&$2~/^[0-9]+$/&&$0~/[^\/]$/{print}'\
        > $fileList)
    echo $(wc -l $fileList | cut -d' ' -f1) files transferred.
    (cd /var/newsreduce/tmp && cat $fileList | while read file; do
	md5sum "$file"
    done > $checksums)
    echo $(wc -l $checksums | cut -d' ' -f1) checksums created.
    msg="$(sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\\\n/g' $checksums)"
    if [ "$msg" ]; then
        echo -e 'publish delete-files "'"$msg"'"' | redis-cli -h $host
    fi
    rm $fileList
    rm $checksums
done
echo "del compressor-lock" | redis-cli
rm /tmp/pull-remote-files
