#!/usr/bin/bash
if [ -d /opt/newsreduce ]; then
    (cd /opt/newsreduce && sudo git pull && cd ubuntu-automation && ./install-worker.sh)
else
    (cd /opt && sudo git clone https://github.com/sean-healy/newsreduce && cd newsreduce/ubuntu-automation && ./install-worker.sh)
fi
