#!/usr/bin/bash
# Find all directories last modified more than 30 minutes ago, and remove them.
find /var/newsreduce/tmp -type d -empty -mmin +30 -exec rmdir {} \;
