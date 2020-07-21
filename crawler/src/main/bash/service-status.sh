#!/usr/bin/bash
processes="$(ps -aux | grep -F service-status.sh | grep -v grep | awk '{print $1" "$5" "$7" "$8" "$11" "$12}' | uniq | wc -l)"
echo "$processes" > /tmp/foobar
if [ "$processes" -ge 2 ]; then
    echo "Service status already running."
    exit
fi
ip="$(curl -s http://newsreduce.org:9999/ip)"
now="$(date +%s)"
while [ true ]; do
    while read service; do
        [[ "$service" ]] && redis-cli -h newsreduce.org -n 7 hsetnx "$ip" "$service" "$now"
    done <<<$(ps -aux | grep -o "nr[-][a-z-]\+" | sort -u)
    sleep 0.3
done
