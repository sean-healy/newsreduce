compile:
	gcc -O2 src/main/c/page-rank/page-rank.c -o dist/page-rank
install:
	gcc -O2 src/main/c/page-rank/page-rank.c -o dist/page-rank &&\
		sudo cp dist/page-rank /usr/bin/page-rank
