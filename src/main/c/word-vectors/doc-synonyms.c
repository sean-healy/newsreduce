#include "../common.c"

#define RESULTS 10

int main (unsigned int argc, char* argv[]) {
    unsigned char idBuffer[BYTES_PER_ID];
    unsigned char vBuffer[BYTES_PER_VECTOR];
    unsigned char vectorBuffer[BYTES_PER_VECTOR];
    unsigned int n = argc - 1;
    float* docV = (float*) malloc(DIMENSIONS * sizeof(float));
    float* wordV = (float*) malloc(DIMENSIONS * sizeof(float));
    for (int i = 0; i < DIMENSIONS; ++i) docV[i] = 0;
    EntityID sortedWordIDs[n];
    for (int i = 1; i < argc; ++i) {
        char *w = argv[i];
        hash(w, idBuffer);
        EntityID id = idBufferToStruct(idBuffer);
        sortedWordIDs[i - 1] = id;
    }
    qsort(sortedWordIDs, n, sizeof(EntityID), cmp);
    struct stat st;
    stat(LOCATION, &st);
    long int size = st.st_size;
    FILE* fd = fopen(LOCATION, "r");
    long int lo = 0;
    for (int i = 1; i < argc; ++i) {
        char *w = argv[i];
        hash(w, idBuffer);
        EntityID id = idBufferToStruct(idBuffer);
        if (binaryDiskSearch(fd, id, lo, size, idBuffer, vBuffer, wordV))
            addVector(docV, wordV);
    }
    normalizeToUnitCircle(docV);
    Result results[RESULTS];
    clearResults(results, RESULTS);
    fseek(fd, 0, SEEK_SET);
    float cutoff = results[0].value;
    while (fread(idBuffer, BYTES_PER_ID, 1, fd)) {
        EntityID current = idBufferToStruct(idBuffer);
        float score;
        size_t result = fread(vectorBuffer, BYTES_PER_VECTOR, 1, fd);
        parseVector(vectorBuffer, wordV);
        score = squaredDistance(wordV, docV, cutoff);
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
    free(docV);
    free(wordV);

    return 0;
}