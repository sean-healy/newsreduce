#!/usr/bin/bash
processes="$(ps -aux\
    | grep -F service-status.sh\
    | grep -F /usr/bin/bash\
    | grep -v grep\
    | awk '{print $1" "$5" "$7" "$8" "$11" "$12}'\
    | uniq\
    | wc -l)"
log="$(ps -aux\
    | grep -F service-status.sh\
    | grep -F /usr/bin/bash\
    | grep -v grep)"
echo "$log" > log
if [ "$processes" -ge 2 ]; then
    echo "Service status already running."
    exit
fi
ip="$(curl -s http://newsreduce.org:9999/ip)"
now="$(date +%s)"
while [ true ]; do
    redis-cli -h newsreduce.org -n 7
    toRemove="$(echo " "$(redis-cli -n 7 -h newsreduce.org hkeys "$ip"))"
    while read service; do
	if [ "$service" ]; then
	    redis-cli -h newsreduce.org -n 7 hsetnx "$ip" "$service" "$now"
	    toRemove="$(echo "$toRemove" | sed "s/ $service//g")"
	fi
    done <<<$(ps -aux | grep -o "nr[-][a-z-]\+" | sort -u)
    for service in $(echo $toRemove); do
        redis-cli -h newsreduce.org -n 7 hdel "$ip" "$service"
    done
    sleep 0.3
done
