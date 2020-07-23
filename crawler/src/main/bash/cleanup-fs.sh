#!/usr/bin/bash
# Find all directories last modified more than 30 minutes ago, and remove them.
find /var/newsreduce/tmp -type d -empty ! -name tmp -mmin +30 -exec rmdir {} \;
# Permanently delete recycled files over 5 minutes old.
find /var/newsreduce/null -maxdepth 1 -mmin +5 -exec rm -rf {} \;
# Permanently delete tmp buffer files over an hour old.
find /tmp -maxdepth 1 -type f -regextype egrep -regex '/tmp/[0-9a-f]{60}' -group newsreduce -mmin +60 -delete
