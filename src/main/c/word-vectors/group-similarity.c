#include "../common.c"

int main (unsigned int argc, char* argv[]) {
    unsigned char idBuffer[BYTES_PER_ID];
    unsigned int args = argc - 1;
    EntityID ids[args];
    float vectors[args][DIMENSIONS];
    float scoreMatrix[args][args];
    unsigned char vectorBuffer[BYTES_PER_VECTOR];
    float searchTermVector[DIMENSIONS];
    struct stat st;
    stat(LOCATION, &st);
    long int size = st.st_size;
    FILE* fd = fopen(LOCATION, "r");
    for (int i = 1; i <= args; ++i) {
        char* arg = argv[i];
        hash(arg, idBuffer);
        EntityID id = idBufferToStruct(idBuffer);
        ids[i - 1] = id;
        if (binaryDiskSearch(fd, id, 0, size, idBuffer, vectorBuffer, searchTermVector)) {
            for (int j = 0; j < DIMENSIONS; ++j)
                vectors[i - 1][j] = searchTermVector[j];
        } else {
            for (int j = 0; j < DIMENSIONS; ++j)
                vectors[i - 1][j] = 0;
        }
    }
    for (int i = 0; i < args; ++i) {
        float* a = vectors[i];
        for (int j = 0; j < args; ++j) {
            float* b = vectors[j];
            float score;
            score = squaredDistance(a, b, FLT_MAX);
            scoreMatrix[i][j] = score;
        }
    }
    for (int i = 0; i < args; ++i) {
        float* a = vectors[i];
        for (int j = 0; j < args; ++j) {
            printf("%f ", fabs(scoreMatrix[i][j]));
        }
        printf("\n");
    }

    return 0;
}
