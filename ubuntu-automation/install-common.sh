#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
debs=(
    bind9-dnsutils
    build-essential
    checkinstall
    libssl-dev
    redis
    tmux
    nodejs
    nmap
    mysql-client-8.0
    tar
    zstd
)
cacheDir=/var/newsreduce/cache
mkdir -p $cacheDir
checksum=$(echo "${debs[*]}" | md5sum | cut -d' ' -f1)
check="$cacheDir/$checksum"
if [ ! -f $check ]; then
    apt-get install -y ${debs[*]}
    touch $check
fi
if [ ! -d /opt/newsreduce ]; then
    git clone https://github.com/sean-healy/newsreduce /opt/newsreduce
fi
if [ -f /etc/newsreduce.ini ]; then
    source <(gawk '$0=="[general]"{block=1;next}$0~/^\[/{block=0;next}block&&$0{print}' /etc/newsreduce.ini)
fi
if [ ! "$user" ]; then
    user=newsreduce
fi
if [ ! "$(id -u $user 2>/dev/null)" ]; then
    useradd $user
fi
chsh $user -s /usr/bin/zsh
mkdir -p /var/newsreduce
if [ $user = newsreduce ]; then
    usermod -d /var/newsreduce $user
fi
mkdir -p /var/newsreduce/blobs/host
mkdir -p /var/newsreduce/blobs/word
mkdir -p /var/newsreduce/blobs/resource
mkdir -p /var/newsreduce/null
mkdir -p /var/newsreduce/.ssh
echo 0 > /var/newsreduce/safety
nodeSrc="https://deb.nodesource.com/setup_14.x"
checksum=$(echo "$(date -Idate)$nodeSrc" | md5sum | cut -d' ' -f1)
check="$cacheDir/$checksum"
if [ ! -f $check ]; then
    curl -sL "$nodeSrc" | sudo -E bash -
    touch $check
fi
if [ ! -f /var/newsreduce/.ssh/id_rsa ]; then
    sudo -u $user ssh-keygen -q -t rsa -N '' -f /var/newsreduce/.ssh/id_rsa <<<y 2>&1 >/dev/null
fi

bash "$(dirname $0)/firewall.sh"

if [ ! -f /etc/redis/redis.conf ]; then
    cp redis.conf /etc/redis
    chown redis:redis /etc/redis/redis.conf
    chmod 640 /etc/redis/redis.conf
fi
awk -f /opt/newsreduce/ubuntu-automation/redis.conf.awk /etc/redis/redis.conf > /etc/redis/redis.conf.tmp
awk -f /opt/newsreduce/ubuntu-automation/sudoers.awk /etc/sudoers > /etc/sudoers.tmp
if [ "$(diff /etc/sudoers.tmp /etc/sudoers)" ]; then
    cat /etc/sudoers.tmp > /etc/sudoers
fi
rm /etc/sudoers.tmp
if [ "$(diff /etc/redis/redis.conf.tmp /etc/redis/redis.conf)" ]; then
    cat /etc/redis/redis.conf.tmp > /etc/redis/redis.conf
    systemctl restart redis
fi
rm /etc/redis/redis.conf.tmp
if [ ! "$env" ]; then
    env=$role
fi
cat crontab-$env.cron | sudo -u $user crontab -
function mk-daemon-script() {
node_script=$1
daemon_script=$1
[[ "$2" ]] && daemon_script=$2
cat > /usr/bin/nr-$daemon_script << END
#!/usr/bin/bash
if [ "\$USER" != newsreduce ]; then
    sudo -u $user \$0 \$@
    exit
fi
if [ "\$TMUX" ]; then
    (cd /opt/newsreduce/crawler && git pull && npm i && npx node bin/nr-$node_script)
else
    [[ "\$(tmux list-sessions | cut -d: -f1 | grep -Fo $daemon_script)" ]] || tmux new -d -s $daemon_script "\$0 \$@; read"
fi
END
chmod 755 /usr/bin/nr-$daemon_script
}
mk-daemon-script $env-net net-agent
mk-daemon-script inserter
mk-daemon-script compressor
mk-daemon-script fetch-zookeeper
mk-daemon-script fetch-worker
mk-daemon-script schedule
mk-daemon-script html-process-worker
mk-daemon-script html-process-zookeeper
mk-daemon-script compressor
mk-daemon-script cold-start
ln -sf /opt/newsreduce/ubuntu-automation/install-$env.sh /usr/bin/nr-update
chown $user:$user /var/newsreduce
chown -R $user:$user /opt/newsreduce
chown $user:$user /var/newsreduce/blobs
chown $user:$user /var/newsreduce/blobs/host
chown $user:$user /var/newsreduce/blobs/word
chown $user:$user /var/newsreduce/blobs/resource
chown $user:$user /var/newsreduce/null
chown $user:$user /var/newsreduce/safety
