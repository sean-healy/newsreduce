#!/usr/bin/bash
if [ -d /opt/newsreduce ]; then
    (cd /opt/newsreduce && git pull && cd ubuntu-automation && ./install-main.sh)
else
    (cd /opt && sudo git clone https://github.com/sean-healy/newsreduce && cd newsreduce/ubuntu-automation && ./install-main.sh)
fi
