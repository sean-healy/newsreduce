#include "./common.c"

int main (unsigned int argc, char* argv[]) {
    char* src = argv[1];
    unsigned char idBuffer[BYTES_PER_ID];
    unsigned int args = argc - 1;
    float vectors[args][DIMENSIONS];
    float scoreMatrix[args][args];
    unsigned char vectorBuffer[BYTES_PER_VECTOR];
    float vector[DIMENSIONS];
    struct stat st;
    stat(src, &st);
    long int size = st.st_size;
    FILE* fd = fopen(src, "r+");
    long i = 0L;
    for (long i = 0L; i < size; i += CHUNK_SIZE) {
        // Skip over IDs of length 12b.
        fseek(fd, BYTES_PER_ID, SEEK_CUR);
        // Read the vector for the line.
        int ret = fread(vectorBuffer, BYTES_PER_VECTOR, 1, fd);
        // Parse the vector.
        parseVector(vectorBuffer, vector);
        // Normalize the vector to the unit circle.
        normalizeToUnitCircle(vector);
        // Re-serialize the modified vector.
        serializeVector(vectorBuffer, vector);
        // Rewind the needle to the start of the vector.
        fseek(fd, -BYTES_PER_VECTOR, SEEK_CUR);
        // Write over the old data with the normalized data.
        fwrite(vectorBuffer, BYTES_PER_VECTOR, 1, fd);
    }
    fclose(fd);
}