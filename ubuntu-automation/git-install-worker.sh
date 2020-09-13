#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
mkdir -p /var/newsreduce
if [ -f /etc/newsreduce.ini ]; then
    source <(gawk '$0=="[mainNetAgent]"{block=1;next}$0~/^\[/{block=0;next}block&&$0{print}' /etc/newsreduce.ini)
fi
if [ ! "$host" ]; then host=newsreduce.org; fi
if [ ! "$port" ]; then port=9999; fi
curl http://$host:$port/net > /var/newsreduce/network
export env=worker
bash "$(dirname $0)/install-common.sh"
access_key="$(curl http://$host:$port/public-key)"
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
    zsh
)
apt-get update
apt-get -y install ${debs[*]}
apt -y autoremove
if [ -f /etc/newsreduce.ini ]; then
    source <(gawk '$0=="[general]"{block=1;next}$0~/^\[/{block=0;next}block&&$0{print}' /etc/newsreduce.ini)
fi
if [ ! "$user" ]; then
    user=newsreduce
fi
chown $user:$user /var/newsreduce
chown $user:$user /var/newsreduce/network
chown -R $user:$user /var/newsreduce/.ssh
