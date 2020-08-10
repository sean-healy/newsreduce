#include <time.h>

#include "./common.c"

void resultsToBytes(Result* results, unsigned char* buffer) {

}

int main() {
    unsigned char idBuffer[BYTES_PER_ID];
    Result results[MAX_SYNONYMS];
    clearResults(results, MAX_SYNONYMS);
    float nextVector[DIMENSIONS];
    unsigned char vectorBuffer[BYTES_PER_VECTOR];
    struct stat st;
    stat(LOCATION, &st);
    off_t size = st.st_size;
    off_t rows = ((off_t) size) / ((off_t) CHUNK_SIZE);
    FILE* fd = fopen(LOCATION, "r");
    Vector* vectors = (Vector*) malloc(sizeof(Vector) * rows);
    Vector* currentVectorPtr = vectors;
    while (fread(idBuffer, BYTES_PER_ID, 1, fd)) {
        currentVectorPtr->id = idBufferToStruct(idBuffer);
        float* dimensions = currentVectorPtr->dimensions;
        Result* synonyms = currentVectorPtr->synonyms;
        readVector(fd, vectorBuffer, dimensions);
        clearResults(synonyms, MAX_SYNONYMS);
        ++currentVectorPtr;
    }
    long i = 0;
    Vector* end = vectors + rows;

    for (Vector* lo = vectors; lo < end; ++lo) {
        float* dimensions = lo->dimensions;
        Vector* hi = lo + 1;
        Result* loSynonyms = lo->synonyms;
        WordID loID = lo->id;
        float loCutoff = loSynonyms[0].value;
        struct timeval tStart, tEnd;
        gettimeofday(&tStart, NULL);
        long int before = tStart.tv_sec * 1000000 + tStart.tv_usec;
        for (; hi < end; ++hi) {
            float hiCutoff = hi->synonyms[0].value;
            float maxCutoff;
            if (loCutoff > hiCutoff) maxCutoff = loCutoff;
            else maxCutoff = hiCutoff;
            float d = squaredDistance(dimensions, hi->dimensions, maxCutoff);
            if (d >= 0) {
                loCutoff = insertMin(loSynonyms, MAX_SYNONYMS, hi->id, d);
                hiCutoff = insertMin(hi->synonyms, MAX_SYNONYMS, loID, d);
            }
        }
        gettimeofday(&tEnd, NULL);
        long int after = tEnd.tv_sec * 1000000 + tEnd.tv_usec;
        printf("%ld %ld.\t", (after - before) / 1000, lo - vectors);
        printResults(lo->synonyms, MAX_SYNONYMS);
    }
}