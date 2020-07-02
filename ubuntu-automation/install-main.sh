#!/usr/bin/bash
function mysql() {
    cat
}
#function iptables-restore() {
#    cat
#}
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
bash "$(dirname $0)/install-common.sh"
debs=(
    mysql-server
)
apt-get install ${debs[*]}
if [ ! -f /var/newsreduce/network ] || [ ! "$(cat /var/newsreduce/network)" ]; then
    echo 'Replace file contents with a list of hosts in the newsreduce network.'\
        > /var/newsreduce/network
fi
vi /var/newsreduce/network
sql_password="$(dd if=/dev/urandom bs=15 count=1 2>/dev/null | base64 | tr '/' '_' | tr '+' ',')"
echo "$sql_password" > /var/newsreduce/sql_password
echo "drop user if exists newsreduce;"                                                                                            | mysql
echo "drop user if exists 'newsreduce'@'localhost';"                                                                              | mysql
echo "drop user if exists 'newsreduce'@'%';"                                                                                      | mysql
echo "create user if not exists 'newsreduce'@'%' identified with mysql_native_password by '$sql_password';"                       | mysql
echo "create database if not exists newsreduce;"                                                                                  | mysql
echo "grant all privileges on newsreduce.* to 'newsreduce'@'localhost';flush privileges;"                                         | mysql
echo "set global sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';"  | mysql
echo "set session sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';" | mysql

chown -R newsreduce:newsreduce /var/newsreduce
