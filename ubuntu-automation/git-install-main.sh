#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
if [ -f /etc/newsreduce.ini ]; then
    source <(gawk '$0=="[general]"{block=1;next}$0~/^\[/{block=0;next}block&&$0{print}' /etc/newsreduce.ini)
fi
if [ ! "$user" ]; then
    user=newsreduce
fi
export env=main
bash "$(dirname $0)/install-common.sh"
debs=(mysql-server)
apt-get -y install ${debs[*]}
if [ ! -f /var/newsreduce/network ] || [ ! "$(cat /var/newsreduce/network)" ]; then
    echo 'Replace file contents with a list of hosts in the newsreduce network.'\
        > /var/newsreduce/network
fi
vi /var/newsreduce/network
bash "$(dirname $0)/install-sql.sh"

apt -y autoremove
chown $user:$user /var/newsreduce/network
chown $user:$user /var/newsreduce
