/*
for ip in $ips; do
    dir=$incoming/$ip
    for arc in $(find $dir -type f -regex '.*\.tzst'); do
        blob=$(echo $arc | sed 's|/incoming/[^/]\+/|/blobs/|g')
        # Check if checksum is correct for file.
        # Check blob is not checked out.
        # If both tests pass, proceed.
        # - Checkout the blob.
        if [ -f $blob ]; then
            # Complicated merge.
        else
            mv $arc $blob
        fi
    done
done
*/
const incoming = "/var/newsreduce/incoming";
