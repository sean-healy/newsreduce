compile-pr:
	gcc -O2 src/main/c/page-rank/page-rank.c -o dist/page-rank
install-pr:
	gcc -O2 src/main/c/page-rank/page-rank.c -o dist/page-rank &&\
		sudo cp dist/page-rank /usr/bin/
compile-w2v:
	gcc -O3 src/main/c/word-vectors/build-similarity-matrix.c -lm -lgcrypt -lpthread -o dist/build-similarity-matrix &&\
	gcc -O3 src/main/c/word-vectors/normalize-to-unit-circle.c -lm -lgcrypt -lpthread -o dist/normalize-to-unit-circle
install-w2v:
	gcc -O3 src/main/c/word-vectors/build-similarity-matrix.c -lm -lpthread -o dist/build-similarity-matrix &&\
	gcc -O3 src/main/c/word-vectors/normalize-to-unit-circle.c -lm -lpthread -o dist/normalize-to-unit-circle &&\
		sudo cp dist/build-similarity-matrix dist/normalize-to-unit-circle /usr/bin/
