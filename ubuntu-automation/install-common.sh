#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
if [ ! -d /opt/newsreduce ]; then
    git clone https://github.com/sean-healy/newsreduce /opt/newsreduce
fi
useradd newsreduce
chsh newsreduce -s /usr/bin/bash
mkdir -p /var/newsreduce
usermod -d /var/newsreduce newsreduce
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
mkdir -p /var/newsreduce/blobs/host
mkdir -p /var/newsreduce/blobs/word
mkdir -p /var/newsreduce/blobs/resource
mkdir -p /var/newsreduce/null
mkdir -p /var/newsreduce/.ssh
echo 0 > /var/newsreduce/safety
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
if [ ! -f /var/newsreduce/.ssh/id_rsa ]; then
    sudo -u newsreduce ssh-keygen -q -t rsa -N '' -f /var/newsreduce/.ssh/id_rsa <<<y 2>&1 >/dev/null
fi
apt-get install -y ${debs[*]}

bash "$(dirname $0)/firewall.sh"

if [ ! -f /etc/redis/redis.conf ]; then
    cp redis.conf /etc/redis
    chown redis:redis /etc/redis/redis.conf
    chmod 640 /etc/redis/redis.conf
fi
awk -f redis.conf.awk /etc/redis/redis.conf > /etc/redis/redis.conf.tmp
awk -f sudoers.awk /etc/sudoers > /etc/sudoers.tmp
cat /etc/sudoers.tmp > /etc/sudoers
cat /etc/redis/redis.conf.tmp > /etc/redis/redis.conf
rm /etc/redis/redis.conf.tmp
rm /etc/sudoers.tmp
systemctl restart redis
cat crontab-$env.cron | sudo -u newsreduce crontab -
function mk-daemon-script() {
node_script=$1
daemon_script=$1
[[ "$2" ]] && daemon_script=$2
cat > /usr/bin/nr-$daemon_script << END
#!/usr/bin/bash
if [ "\$USER" != newsreduce ]; then
    sudo -u newsreduce \$0 \$@
    exit
fi
if [ "\$TMUX" ]; then
    (cd /opt/newsreduce/crawler && git pull && npm i && npx node bin/nr-$node_script)
else
    [[ "\$(tmux list-sessions | cut -d: -f1 | grep -Fo $daemon_script)" ]] || tmux new -d -s $daemon_script \$0 \$@
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
mk-daemon-script html-process
mk-daemon-script compressor
ln -sf /opt/newsreduce/ubuntu-automation/install-$env.sh /usr/bin/nr-update
chown newsreduce:newsreduce /var/newsreduce
chown -R newsreduce:newsreduce /opt/newsreduce
chown newsreduce:newsreduce /var/newsreduce/blobs
chown newsreduce:newsreduce /var/newsreduce/blobs/host
chown newsreduce:newsreduce /var/newsreduce/blobs/word
chown newsreduce:newsreduce /var/newsreduce/blobs/resource
chown newsreduce:newsreduce /var/newsreduce/null
chown newsreduce:newsreduce /var/newsreduce/safety
