#!/usr/bin/bash
#function mysql() {
#    cat
#}
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
apt-get -y install ${debs[*]}
if [ ! -f /var/newsreduce/network ] || [ ! "$(cat /var/newsreduce/network)" ]; then
    echo 'Replace file contents with a list of hosts in the newsreduce network.'\
        > /var/newsreduce/network
fi
vi /var/newsreduce/network
echo 1 > /var/newsreduce/is_main
sql_password="$(dd if=/dev/urandom bs=15 count=1 2>/dev/null | base64 | tr '/' '_' | tr '+' ',')"
echo "$sql_password" > /var/newsreduce/sql_password
    echo Safely creating user...
echo "drop user if exists newsreduce;"                                                                                            | mysql
echo "drop user if exists 'newsreduce'@'localhost';"                                                                              | mysql
echo "drop user if exists 'newsreduce'@'%';"                                                                                      | mysql
    echo Creating user...
echo "create user if not exists 'newsreduce'@'%' identified with mysql_native_password by '$sql_password';"                       | mysql
    echo Creating DB...
echo "create database if not exists newsreduce;"                                                                                  | mysql
    echo Grant privileges...
echo "grant all privileges on newsreduce.* to 'newsreduce'@'%';flush privileges;"                                                 | mysql
echo "set global sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';"  | mysql
echo "set session sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';" | mysql

chown -R newsreduce:newsreduce /var/newsreduce
apt -y autoremove
ln -sf /opt/newsreduce/ubuntu-automation/install-main.sh /usr/bin/nr-update
cat > /usr/bin/nr-net-agent << END
#!/usr/bin/bash
if [ "\$USER" != newsreduce ]; then
	sudo -u newsreduce \$0 \$@
	exit
fi
(cd /opt/newsreduce/crawler\
	&& git pull\
	&& npm i\
	&& npx node bin/nr-main-net)
END
chmod 755 /usr/bin/nr-net-agent
