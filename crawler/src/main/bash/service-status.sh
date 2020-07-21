#!/usr/bin/bash
ip="$(curl -s http://newsreduce.org:9999/ip)"
now="$(date +%s)"
if [ "$ip" ]; then
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
fi
