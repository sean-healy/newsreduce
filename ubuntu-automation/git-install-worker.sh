#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
mkdir -p /var/newsreduce
curl http://newsreduce.org:9999/net > /var/newsreduce/network
echo 0 > /var/newsreduce/is_main
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
chown -R newsreduce:newsreduce /var/newsreduce
ln -sf /opt/newsreduce/ubuntu-automation/install-worker.sh /usr/bin/nr-update
cat > /usr/bin/nr-net-agent << END
#!/usr/bin/bash
if [ "\$USER" != newsreduce ]; then
	sudo -u newsreduce \$0 \$@
	exit
fi
(cd /opt/newsreduce/crawler\
	&& git pull\
	&& npm i\
	&& npx node bin/nr-worker-net)
END
chmod 755 /usr/bin/nr-net-agent
