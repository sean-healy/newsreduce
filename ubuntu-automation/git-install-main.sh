#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
export env=main
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
if [ ! -f /var/newsreduce/sql_password ]; then
    sql_password="$(dd if=/dev/urandom bs=15 count=1 2>/dev/null | base64 | tr '/' '_' | tr '+' ',')"
    echo "$sql_password" > /var/newsreduce/sql_password
fi
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
echo "set session sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';" | mysql
echo "grant file on *.* to 'newsreduce'@'%';flush privileges;"                                                                    | mysql

cat > /etc/mysql/conf.d/performance-tuning.cnf << END
[mysqld]
secure-file-priv = "/tmp"
innodb_doublewrite = 0
innodb_buffer_pool_size = 20G
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 0
END

chown -R newsreduce:newsreduce /var/newsreduce
apt -y autoremove
systemctl restart mysql
nr-net-agent
nr-inserter
nr-schedule
