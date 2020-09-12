compile:
	gcc -O3 src/main/c/word-vectors/build-similarity-matrix.c -lm -lpthread -o dist/build-similarity-matrix &&\
	gcc -O3 src/main/c/word-vectors/normalize-to-unit-circle.c -lm -lpthread -o dist/normalize-to-unit-circle&&\
	gcc -O3 src/main/c/decision-trees/decision-trees.c -unused-result -lm -o dist/decision-trees&&\
	gcc -O2 src/main/c/page-rank/page-rank.c -lm -o dist/page-rank
install:
	gcc -O3 src/main/c/word-vectors/build-similarity-matrix.c -lm -lpthread -o dist/build-similarity-matrix &&\
	gcc -O3 src/main/c/word-vectors/normalize-to-unit-circle.c -lm -lpthread -o dist/normalize-to-unit-circle&&\
	gcc -O3 src/main/c/decision-trees/decision-trees.c -unused-result -lm -o dist/decision-trees&&\
	gcc -O2 src/main/c/page-rank/page-rank.c -lm -o dist/page-rank&&\
		sudo cp dist/build-similarity-matrix dist/normalize-to-unit-circle dist/page-rank dist/decision-trees /usr/bin/
