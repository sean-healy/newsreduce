BEGIN {
	bound = 0
}
/^bind / {
	print "bind 0.0.0.0"
	bound = 1
	next
}
{
	print $0
}
END {
	if (bound == 0) {
		print "bind 0.0.0.0"
	}
}
