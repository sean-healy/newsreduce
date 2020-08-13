#include <float.h>
#include <gcrypt.h>
#include <math.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <time.h>

#define LOCATION "/var/newsreduce/word-vectors/test.bin"
#define LOCATION2 "/var/newsreduce/word-vectors/test.bin2"

#define BYTES_PER_ID        12
#define DIMENSIONS          300
#define BYTES_PER_DIMENSION 2
#define MAX_SIMILARITIES    20
#define BYTES_PER_VECTOR DIMENSIONS * BYTES_PER_DIMENSION
#define CHUNK_SIZE BYTES_PER_ID + BYTES_PER_VECTOR

long OFFSET = 32768L;
unsigned short EIGHT = 8U;
unsigned short BYTE_MASK = 0xFFu;

void parseVector(unsigned char* vector, float* parsedVector) {
    for (int i = 0; i < BYTES_PER_VECTOR; i += 2) {
        unsigned short mostSignificant =
            ((unsigned short) vector[i]) << EIGHT;
        unsigned short leastSignificant =
            ((unsigned short) vector[i + 1]);
        unsigned short uInt = mostSignificant | leastSignificant;
        short sInt = (short) (((long) uInt) - OFFSET);
        float real = ((float) sInt) / ((float) 10000);
        parsedVector[i >> 1] = real;
    }
}
float parseDimension(unsigned char* dimension) {
    unsigned short mostSignificant =
        ((unsigned short) dimension[0]) << EIGHT;
    unsigned short leastSignificant =
        ((unsigned short) dimension[1]);
    unsigned short uInt = mostSignificant | leastSignificant;
    short sInt = (short) (((long) uInt) - OFFSET);
    float real = ((float) sInt) / ((float) 10000);

    return real;
}
void serializeFloat(float d, unsigned char* buffer, unsigned int offset) {
    float coordMul = d * ((float) 10000);
    long sInt = (long) coordMul;
    long uIntLong = sInt + OFFSET;
    unsigned short uInt = (unsigned short) uIntLong;
    unsigned short mostSignicant = uInt >> EIGHT;
    unsigned short leastSignicant = uInt & BYTE_MASK;
    unsigned char mostSignicantByte = (unsigned char) mostSignicant;
    unsigned char leastSignicantByte = (unsigned char) leastSignicant;
    buffer[(offset << 1)] = mostSignicantByte;
    buffer[(offset << 1) | 1] = leastSignicantByte;
}
void serializeVector(unsigned char* vector, float* parsedVector) {
    for (unsigned int i = 0; i < DIMENSIONS; ++i)
        serializeFloat(parsedVector[i], vector, i);
}
int maxDimension(float* vector) {
    float max = 0;
    int maxI;
    for (int i = 0; i < DIMENSIONS; ++i) {
        float coord = fabs(vector[i]);
        if (coord > max) {
            max = coord;
            maxI = i;
        }
    }

    return maxI;
}

typedef struct IDStruct {
    unsigned long long head;
    unsigned long int tail;
} WordID;

typedef struct ResultStruct {
    WordID id;
    float value;
} Result;

void printID(WordID id) {
    printf("%llx", id.head);
    printf("%lx", id.tail);
}

int cmp(const void* aPtr, const void* bPtr) {
    WordID a = * ((WordID*) aPtr);
    WordID b = * ((WordID*) bPtr);
    int result;
    if (a.head > b.head) result = 1;
    else if (a.head < b.head) result = -1;
    else if (a.tail < b.tail) result = 1;
    else if (a.tail > b.tail) result = -1;
    else result = 0;

    return result;
}

WordID idBufferToStruct(unsigned char* idBuffer) {
    unsigned long long head = 0;
    for (int i = 0; i < 8; ++i)
        head = (head << 8) | idBuffer[i];
    unsigned long int tail = 0;
    for (int i = 8; i < 12; ++i)
        tail = (tail << 8) | idBuffer[i];

    WordID id = { head, tail };

    return id;
}

void idStructToBuffer(WordID id, unsigned char* idBuffer) {
    int byte = BYTES_PER_ID - 1;
    for (unsigned long int part = id.tail; byte >= 8; part >>= 8)
        idBuffer[byte--] = part & 0xFF;
    for (unsigned long int part = id.head; byte >= 0; part >>= 8)
        idBuffer[byte--] = part & 0xFF;
}

long int binarySearch(
    FILE* fd,
    WordID id,
    long int lo,
    long int hi,
    char* idBuffer,
    char* vectorBuffer,
    float* parsedVector
) {
    hi = hi - ((long int) hi) % ((long int) CHUNK_SIZE);
    for (int i = 0; i < 30 && lo < hi; ++i) {
        long int mid = lo + (hi - lo >> 1);
        mid -= ((long int) mid) % ((long int) CHUNK_SIZE);
        fseek(fd, mid, SEEK_SET);
        size_t size = fread(idBuffer, BYTES_PER_ID, 1, fd);
        WordID current = idBufferToStruct(idBuffer);
        long long diff = cmp(&current, &id);
        if (diff > 0) hi = mid;
        else if (diff < 0) lo = mid + CHUNK_SIZE;
        else {
            size_t size = fread(vectorBuffer, BYTES_PER_VECTOR, 1, fd);
            parseVector(vectorBuffer, parsedVector);
            return mid + CHUNK_SIZE;
        }
    }
    fprintf(stderr, "%s \n", "oops");

    return 0;
}

int hash(char* string, char* idBuffer) {
    unsigned char *x;
    unsigned i;
    gcry_md_hd_t h;
    gcry_md_open(&h, GCRY_MD_SHA3_256, GCRY_MD_FLAG_SECURE);
    gcry_md_write(h, string, strlen(string));
    x = gcry_md_read(h, GCRY_MD_SHA3_256);
    for (i = 0; i < 12; ++i) idBuffer[i] = x[i];
    gcry_md_close(h);

    return 0;
}

float squaredDistance(float* v1, float* v2, float cutoff) {
    float squaredSum = 0.0;
    for (int i = DIMENSIONS - 1; i >= 0; --i) {
        float difference = v2[i] - v1[i];
        squaredSum += difference * difference;
        if (squaredSum >= cutoff) return -1;
    }

    return squaredSum;
}

float squaredDistanceOL(float* v1, FILE* fd, float cutoff, unsigned char* dimensionBuffer) {
    float squaredSum = 0.0;
    for (int i = DIMENSIONS - 1; i >= 0; --i) {
        size_t size = fread(dimensionBuffer, BYTES_PER_DIMENSION, 1, fd);
        float dimension = parseDimension(dimensionBuffer);
        float difference = dimension - v1[i];
        squaredSum += difference * difference;
        if (squaredSum >= cutoff) {
            fseek(fd, (DIMENSIONS - i - 1) * BYTES_PER_DIMENSION, SEEK_CUR);
            return -1;
        }
    }

    return squaredSum;
}

float insertMin(Result* results, int resultCount, WordID id, float value) {
    float maxMin = results[0].value;
    if (maxMin < value) return maxMin;
    results[0].id = id;
    results[0].value = value;
    int i = 0;
    // Max heapify
    do {
        int left = (i << 1) + 1;
        int right = (i << 1) + 2;
        int largest = i;
        if (left < resultCount && results[left].value > results[largest].value)
            largest = left;
        if (right < resultCount && results[right].value > results[largest].value)
            largest = right;
        if (largest == i) break;
        Result tmp = results[largest];
        results[largest] = results[i];
        results[i] = tmp;
        i = largest;
    } while (1);

    return value;
}

float distanceFromOrigin(float* vector) {
    float squaredDistance = 0;
    for (int i = 0; i < DIMENSIONS; ++i) {
        float coord = vector[i];
        squaredDistance += coord * coord;
    }

    return sqrt(squaredDistance);
}

void normalizeToUnitCircle(float* vector) {
    float d = distanceFromOrigin(vector);
    if (d != 0)
        for (int i = 0; i < DIMENSIONS; ++i)
            vector[i] = vector[i] / d;
}

void addVector(float* v1, float* v2) {
    for (int i = 0; i < DIMENSIONS; ++i)
        v1[i] += v2[i];
    normalizeToUnitCircle(v1);
}

void addVectorAndNormalize(float* v1, float* v2) {
    addVector(v1, v2);
    normalizeToUnitCircle(v1);
}

void clearResults(Result* results, int count) {
    for (int i = 0; i < count; ++i) {
        results[i].id.head = 0;
        results[i].id.tail = 0;
        results[i].value = FLT_MAX;
    }
}

WordID readID(FILE* fd, unsigned char* buffer) {
    size_t result = fread(buffer, BYTES_PER_ID, 1, fd);
    WordID id = idBufferToStruct(buffer);
}

void readVector(FILE* fd, unsigned char* buffer, float* vBuffer) {
    size_t result = fread(buffer, BYTES_PER_VECTOR, 1, fd);
    parseVector(buffer, vBuffer);
}

typedef struct VectorSimilarityStruct {
    WordID id;
    float dimensions[DIMENSIONS];
    Result synonyms[MAX_SIMILARITIES];
} VectorSimilarity;

void printVector(VectorSimilarity vector) {
    float* dimensions = vector.dimensions;
    for (int i = 0; i < DIMENSIONS; ++i) {
        float coord = dimensions[i];
        printf("%f ", coord);
    }
    printf("\n");
}

void printResults(Result* results, int count) {
    for (int i = 0; i < count; ++i) {
        Result result = results[i];
        if (result.value < 100) printf("%f(%lu) ", result.value, result.id.tail & 0xFFF);
        else printf("-.------(0000) ");
    }
    printf("\n");
}

void printSimilarities(VectorSimilarity* vectors, int count) {
    for (int i = 0; i < count; ++i)
        printResults(vectors[i].synonyms, MAX_SIMILARITIES);
    printf("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n");
}

long powerOfTwoNotAbove(long n) {
    long power = 1L;
    while (power <= n) power <<= 1L;

    return power >> 1;
}
