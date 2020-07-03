#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
if [ ! -d /opt/newsreduce ]; then
    git clone https://github.com/sean-healy/newsreduce /opt/newsreduce
fi
useradd newsreduce
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
)
mkdir -p /var/newsreduce/blobs/host
mkdir -p /var/newsreduce/blobs/word
mkdir -p /var/newsreduce/blobs/resource
mkdir -p /var/newsreduce/null
mkdir -p /var/newsreduce/.ssh
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
if [ ! -f /var/newsreduce/.ssh/id_rsa ]; then
    sudo -u newsreduce ssh-keygen -q -t rsa -N '' -f /var/newsreduce/.ssh/id_rsa <<<y 2>&1 >/dev/null
fi
apt-get install -y ${debs[*]}

chown -R newsreduce:newsreduce /var/newsreduce
chown -R newsreduce:newsreduce /opt/newsreduce

(cat << END
*filter
:INPUT DROP [51:2204]
:FORWARD ACCEPT [0:0]
:OUTPUT DROP [12:735]
-A INPUT  -i lo -j ACCEPT
-A OUTPUT -o lo -j ACCEPT
-A INPUT  -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A OUTPUT -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A INPUT  -p tcp -m tcp --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp -m tcp --sport 22 -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A INPUT  -p tcp -m tcp --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp -m tcp --sport 80 -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A INPUT  -p tcp -m tcp --dport 443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp -m tcp --sport 443 -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A INPUT  -p tcp --sport 22 -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A OUTPUT -p udp --dport 53 -m state --state NEW,ESTABLISHED -j ACCEPT
-A INPUT  -p udp --sport 53 -m state --state ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp --dport 53 -m state --state NEW,ESTABLISHED -j ACCEPT
-A INPUT  -p tcp --sport 53 -m state --state ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A INPUT  -p tcp --sport 80 -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp --dport 443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A INPUT  -p tcp --sport 443 -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp --dport 6379 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A INPUT  -p tcp --sport 6379 -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp --dport 3306 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A INPUT  -p tcp --sport 3306 -m conntrack --ctstate ESTABLISHED -j ACCEPT
-A OUTPUT -p tcp --dport 9999 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
-A INPUT  -p tcp --sport 9999 -m conntrack --ctstate ESTABLISHED -j ACCEPT
END
for host in $(cat /var/newsreduce/network); do
    echo "# $host"
    ip=$(nslookup "$host" | awk '/^Address:\s*[0-9]+(\.[0-9]+){3}$/{print $2}')
    [[ ! "$ip" ]] && ip="$host"
    # MySQL
    echo "-A INPUT  -p tcp -m tcp --dport 3306 --src $ip -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"
    echo "-A OUTPUT -p tcp -m tcp --sport 3306 --dst $ip -m conntrack --ctstate ESTABLISHED -j ACCEPT"
    # Local use, and direct communication.
    echo "-A INPUT  -p tcp -m tcp --dport 6379 --src $ip -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"
    echo "-A OUTPUT -p tcp -m tcp --sport 6379 --dst $ip -m conntrack --ctstate ESTABLISHED -j ACCEPT"
    # Events
    echo "-A INPUT  -p tcp -m tcp --dport 1110 --src $ip -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"
    echo "-A OUTPUT -p tcp -m tcp --sport 1110 --dst $ip -m conntrack --ctstate ESTABLISHED -j ACCEPT"
    # Fetcher
    echo "-A INPUT  -p tcp -m tcp --dport 1111 --src $ip -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"
    echo "-A OUTPUT -p tcp -m tcp --sport 1111 --dst $ip -m conntrack --ctstate ESTABLISHED -j ACCEPT"
    # HTML processor
    echo "-A INPUT  -p tcp -m tcp --dport 1112 --src $ip -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"
    echo "-A OUTPUT -p tcp -m tcp --sport 1112 --dst $ip -m conntrack --ctstate ESTABLISHED -j ACCEPT"
    # Hit processor
    echo "-A INPUT  -p tcp -m tcp --dport 1113 --src $ip -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"
    echo "-A OUTPUT -p tcp -m tcp --sport 1113 --dst $ip -m conntrack --ctstate ESTABLISHED -j ACCEPT"
    # Net agent
    echo "-A INPUT  -p tcp -m tcp --dport 9999 --src $ip -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"
    echo "-A OUTPUT -p tcp -m tcp --sport 9999 --dst $ip -m conntrack --ctstate ESTABLISHED -j ACCEPT"
done
echo COMMIT) | iptables-restore
