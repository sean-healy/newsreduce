#!/usr/bin/bash
if [ -f /etc/newsreduce.ini ]; then
    source <(gawk '$0=="[general]"{block=1;next}$0~/^\[/{block=0;next}block&&$0{print}' /etc/newsreduce.ini)
fi
if [ ! "$user" ]; then
    user=newsreduce
fi
if [ -f /var/newsreduce/sql_password ]; then
    sql_password="$(cat /var/newsreduce/sql_password)"
else
    sql_password="$(dd if=/dev/urandom bs=15 count=1 2>/dev/null | base64 | tr '/' '_' | tr '+' ',')"
    echo "$sql_password" > /var/newsreduce/sql_password
fi
echo Creating user...
echo "create user if not exists 'newsreduce'@'%' identified with mysql_native_password by '$sql_password';"                       | mysql
echo Creating DB...
echo "create database if not exists newsreduce;"                                                                                  | mysql
echo Grant privileges...
echo "grant all privileges on newsreduce.* to 'newsreduce'@'%';flush privileges;"                                                 | mysql
echo "set global sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';"  | mysql
echo "set session sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';" | mysql
echo "set session sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';" | mysql
echo "grant file on *.* to newsreduce;flush privileges;"                                                                          | mysql

cat > /etc/mysql/conf.d/performance-tuning.cnf << END
[mysqld]
local-infile = 1 
secure-file-priv = "/tmp/"
innodb_doublewrite = 0
innodb_buffer_pool_size = 20G
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 0
END
cat > /etc/mysql/mysql.conf.d/performance-tuning.cnf << END
[mysql]
local-infile = 1 
END
systemctl restart mysql
chown $user:$user /var/newsreduce/sql_password
