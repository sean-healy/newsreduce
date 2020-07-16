#!/usr/bin/bash
# Create a buffer file.
toRemove=/tmp/$(openssl rand -hex 30)
# Find all directories last modified more than 30 minutes ago.
(cd /var/newsreduce/tmp && find -type d -empty -mmin +30 -print) > $toRemove
cat $toRemove | while read dir; do
    # Remove those directories that were found.
    rmdir $dir
done
# And remove the file used by this script.
rm $toRemove
