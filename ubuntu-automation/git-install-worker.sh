#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
mkdir -p /var/newsreduce
curl http://newsreduce.org:9999/net > /var/newsreduce/network
export env=worker
bash "$(dirname $0)/install-common.sh"
access_key="$(curl http://newsreduce.org:9999/public-key)"
ssh_dir="/var/newsreduce/.ssh"
mkdir -p "$ssh_dir"
ssh_authorized_keys="$ssh_dir/authorized_keys"
if [ -f "$ssh_authorized_keys" ]; then
    (echo "$access_key" && cat "$ssh_authorized_keys")\
        | sort -u > "$ssh_authorized_keys.tmp"
    mv "$ssh_authorized_keys.tmp" "$ssh_authorized_keys"
else
    echo "$access_key" > "$ssh_authorized_keys"
fi
debs=(
    build-essential
    checkinstall
    libssl-dev
    redis
)
apt-get update
apt-get -y install ${debs[*]}
apt -y autoremove
chown newsreduce:newsreduce /var/newsreduce
chown newsreduce:newsreduce /var/newsreduce/network
chown -R newsreduce:newsreduce /var/newsreduce/.ssh
nr-net-agent
nr-fetch-zookeeper
nr-fetch-worker
