#include "./common.c"

#define RESULTS             100

int main (unsigned int argc, char* argv[]) {
    char *searchTerm = argv[1];
    fprintf(stderr, "Seeking: %s ", searchTerm);
    unsigned char idBuffer[BYTES_PER_ID];
    hash(searchTerm, idBuffer);
    WordID id = idBufferToStruct(idBuffer);
    fprintf(stderr, "%llx", id.head);
    fprintf(stderr, "%lx\n", id.tail);
    unsigned char vectorBuffer[BYTES_PER_VECTOR];
    unsigned char dimensionBuffer[BYTES_PER_DIMENSION];
    float searchTermVector[DIMENSIONS];
    float searchResultVector[DIMENSIONS];
    Result results[RESULTS];
    clearResults(results, RESULTS);
    struct stat st;
    stat(LOCATION, &st);
    off_t size = st.st_size;
    FILE* fd = fopen(LOCATION, "r");
    if (binarySearch(fd, id, 0, size, idBuffer, vectorBuffer, searchTermVector)) {
        fseek(fd, 0, SEEK_SET);
        float cutoff = results[0].value;
        while (fread(idBuffer, BYTES_PER_ID, 1, fd)) {
            WordID current = idBufferToStruct(idBuffer);
            float score;
            size_t result = fread(vectorBuffer, BYTES_PER_VECTOR, 1, fd);
            parseVector(vectorBuffer, searchResultVector);
            score = squaredDistance(searchTermVector, searchResultVector, cutoff);
            //score = squaredDistanceOL(searchTermVector, fd, cutoff, dimensionBuffer);
            if (score != -1)
                cutoff = insertMin(results, RESULTS, current, score);
        }
        fprintf(stderr, "\n");
        for (int i = 0; i < RESULTS; ++i) {
            Result current = results[i];
            printID(current.id);
            printf("\t%f\n", current.value);
        }
    } else {
        // Term not found.
    }

    return 0;
}
