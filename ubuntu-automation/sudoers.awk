BEGIN {
	printed = 0
}
/^newsreduce / {
    print "newsreduce ALL=(ALL) NOPASSWD: /usr/bin/nr-update"
	printed = 1
	next
}
{
	print $0
}
END {
	if (printed == 0) {
        print "newsreduce ALL=(ALL) NOPASSWD: /usr/bin/nr-update"
	}
}
