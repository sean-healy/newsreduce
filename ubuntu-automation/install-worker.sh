#!/usr/bin/bash
if [ $USER != root ]; then
    sudo $0 $@
    exit
fi
access_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDDSt1FcTlxRgABMz/qyTbe56PEF8K+voO+t+zLO286XjmNscsydjWCRD4R9CDllZVOuDEiBdQtFK+If9TBFfHi3s2uS/CgpeoluoRd2MGwT96d6GWxOnxL04fWKeEJWrrePBhPqqheB1vmjr6x20bmJCBSyxxjMVYCOmCgytUoiT8zCd6SuIuuZdUUjfg2jspGUw/yFXXr2qyUVtwklaf5Ly+KhfRoHMe83SXFUp88jjM3nxK6i8VMQ9HYn5UGAMnJC2IzL7imIdxBs6u21eJerJmKoK1hTleL+Izt7ptrwc+pmesxBM7JqxXvMgZ6tUWDE9sG23SLbCwZYYY6ip33O6r3qjDIl/xK2tNWeMrBDEPeIFqkkGguaEiQWFUvQYxJ+DzJOk95TViVQNVpWLPfQf1b+taFq9Fgp1B6+u8oodWRwkEyYqW7Irnjmp/pbVaxmborXxTg+cOpQ6d0DXzFPp67uofsWniGF8OxjS3taELCeuklhOKtCS2eANf3prM= sean@allen"
ssh_dir="$HOME/.ssh"
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
    npm
)
apt-get update
apt-get -y install ${debs[*]}
npm i -g npm
