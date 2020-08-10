#!/usr/bin/bash
while read line; do
    id=${line%%$'\t'*}
    tar -axf /var/newsreduce/blobs/resource/$id.tzst -O $id/${line##*$'\t'}_tokens.txt
done <<<$(echo 'select resource, time from ResourceVersion where type = 41777897888609499955790039580 order by rand() limit 2000' | nr-sql --noerr)\
    | egrep -o "\w+"\
    | sort\
    | uniq -c\
    | sort -n
