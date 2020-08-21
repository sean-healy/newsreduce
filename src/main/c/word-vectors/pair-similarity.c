#include "../common.c"

int main (unsigned int argc, char* argv[]) {
    char *w1 = argv[1];
    char *w2 = argv[2];
    unsigned char idBuffer[BYTES_PER_ID];
    hash(w1, idBuffer);
    EntityID i1 = idBufferToStruct(idBuffer);
    hash(w2, idBuffer);
    EntityID i2 = idBufferToStruct(idBuffer);
    unsigned char vBuffer[BYTES_PER_VECTOR];
    float v1[DIMENSIONS];
    float v2[DIMENSIONS];
    struct stat st;
    stat(LOCATION, &st);
    long int size = st.st_size;
    FILE* fd = fopen(LOCATION, "r");
    if (binaryDiskSearch(fd, i1, 0, size, idBuffer, vBuffer, v1)) {
        if (binaryDiskSearch(fd, i2, 0, size, idBuffer, vBuffer, v2)) {
            float distance = squaredDistance(v1, v2, FLT_MAX);
            printf("%f\n", distance);
        } else printf("\n");
    } else printf("\n");

    return 0;
}
