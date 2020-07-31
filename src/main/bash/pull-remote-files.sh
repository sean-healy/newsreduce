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
function sync-host() {
    host=$1
    if [ $host != newsreduce.org ] && [[ "$host" =~ newsreduce ]]; then
	# Create two buffers to hold file and checksum lists.
	fileList=/tmp/$(openssl rand -hex 30)
	checksums=/tmp/$(openssl rand -hex 30)
	# Log which host is being synced.
	echo $host
	# Rsync files from remote servers, and output the list of fetched files to a buffer.
	(rsync -alrpgoDuzhtv newsreduce@$host:/var/newsreduce/raw/ $incomingDir/\
	    | awk -F/ '$1=="resource"&&$2~/^[0-9]+$/&&$0~/[^\/]$/{print}'\
	    2>/dev/null > $fileList)
	# Log how many files were transferred.
	echo $(wc -l $fileList | cut -d' ' -f1) files transferred.
	(cd $incomingDir && cat $fileList | while read file; do
	    md5sum "$file"
	done > $checksums)
	# Log how many checksums were created.
	echo $(wc -l $checksums | cut -d' ' -f1) checksums created.
	# Send a msg to the remote server, instructing it to delete the files that were fetched.
	msg="$(sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\\\n/g' $checksums)"
	if [ "$msg" ]; then
	    echo -e 'publish delete-files "'"$msg"'"' | redis-cli -h $host
	fi
	# Remove the buffer files.
	rm -f $fileList $checksums
    fi
}
# A list to store PIDs, in order to allow safe concurrency in BASH.
children=()
# Concurrently fetch remote files.
while read host; do
    # Sync each host using a thread.
    sync-host $host &
    # Store the PID of the above thread in an array.
    children+=($!)
done <<<$(cat /var/newsreduce/network)
# Wait for all network jobs to finish.
for child in "${children[@]}"; do
    wait $child
done
# If a compressor job is running, wait for it to finish.
lock="1"
while [[ "$lock" =~ "1" ]]; do
    lock=$(redis-cli get sync-lock)
done
# Don't forget to copy locally fetched files.
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
