#!/usr/bin/bash
if [ "$TEST" ]; then
    lockFile=/tmp/test-pull-remote-files
    localRawDir=/var/newsreduce/test/raw 
    preBlobDir=/var/newsreduce/test/pre-blobs
    incomingDir=/var/newsreduce/test/incoming
else
    lockFile=/tmp/pull-remote-files
    localRawDir=/var/newsreduce/raw 
    preBlobDir=/var/newsreduce/pre-blobs
    incomingDir=/var/newsreduce/incoming
fi
# Ensure this script never has multiple concurrent instances.
if [ -f $lockFile ]; then
    echo Script already running elsewhere.
    exit
fi
# Ensure this script never has multiple concurrent instances.
touch $lockFile
# Create an incoming dir.
mkdir -p $incomingDir
# If a compressor job is running, wait for it to finish.
lock="1"
while [[ "$lock" =~ "1" ]]; do
    lock=$(redis-cli get sync-lock)
done
# Copy locally fetched files.
mkdir -p $localRawDir
while read localSuffix; do
	if [ ! $localSuffix ]; then continue; fi
	echo $localSuffix
	dst=$incomingDir$localSuffix
	mkdir -p $(dirname $dst)
	echo mv $localRawDir$localSuffix $dst
	mv $localRawDir$localSuffix $dst
done <<<$(cd $localRawDir && find -maxdepth 2 -regex '\./[^/]+/[0-9]+$' | cut -d. -f2)
# Place a lock, so that the compressor doesn't run concurrently with this script.
echo "setex compressor-lock 3600 1" | redis-cli > /dev/null
# Move files to the tmp dir.
rsync -alrpgoDuzhtv $incomingDir/ $preBlobDir > /dev/null
# Remove the incoming dir.
rm -rf $incomingDir
# Let compressor do its job (safely) again.
echo "del compressor-lock" | redis-cli > /dev/null
# Unlock this script.
rm -f $lockFile
