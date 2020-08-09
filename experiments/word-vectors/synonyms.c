#include <stdio.h>
#include <sys/stat.h>
#include <stdlib.h>
#include <math.h>
#include <float.h>
#include <openssl/evp.h>
#include <gcrypt.h>


#define USE_COSINE 0

#define DIMENSIONS          300
#define BYTES_PER_DIMENSION 2
#define BYTES_PER_ID        12
#define BYTES_PER_VECTOR DIMENSIONS * BYTES_PER_DIMENSION
#define CHUNK_SIZE BYTES_PER_ID + BYTES_PER_VECTOR
#define RESULTS             15
#define LOCATION "/var/newsreduce/word-vectors/fasttext_crawl-300d-2M-subw.bin"

typedef struct IDStruct {
    unsigned long long head;
    unsigned long int tail;
} WordID;

typedef struct ResultStruct {
    WordID id;
    double value;
} Result;

void printID(WordID id) {
    printf("%llx", id.head);
    printf("%lx", id.tail);
}

double squaredDistance(double* v1, double* v2) {
    double squaredSum = 0.0;
    for (int i = 0; i < DIMENSIONS; ++i) {
        double difference = v2[i] - v1[i];
        squaredSum += difference * difference;
    }

    return squaredSum;
}

double cosineSimilatity(double* v1, double* v2) {
    double productSum = 0.0;
    double squaredASum = 0.0;
    double squaredBSum = 0.0;
    for (int i = 0; i < DIMENSIONS; ++i) {
        double a = v1[i];
        double b = v2[i];
        productSum += a * b;
        squaredASum += a * a;
        squaredBSum += b * b;
    }
    // When one of the vectors is at the origin, the result is undefined.
    if (squaredASum == 0 || squaredBSum == 0) {
        return 0;
    }

    double denominator = sqrt(squaredASum) * sqrt(squaredBSum);

    return productSum / denominator;
}

double d(double* v1, double* v2) {
    return sqrt(squaredDistance(v1, v2));
}

void parseVector(unsigned char* vector, double* parsedVector) {
    for (int i = 0; i < BYTES_PER_VECTOR; i += 2) {
        unsigned short mostSignificant =
            ((unsigned short) vector[i]) << ((unsigned short) 8);
        unsigned short leastSignificant =
            ((unsigned short) vector[i + 1]);
        unsigned short uInt = mostSignificant | leastSignificant;
        short sInt = (short) (((long) uInt) - ((long) 32768));
        double real = ((double) sInt) / ((double) 10000);
        parsedVector[i >> 1] = real;
    }
}

unsigned long long cmp(WordID a, WordID b) {
    signed long long diff =
        ((signed long long) a.head) - ((signed long long) b.head);
    if (!diff) diff = (signed long long) a.tail - (signed long long) b.tail;

    return diff;
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
void insertMin(Result* results, WordID id, double value) {
    if (results[RESULTS - 1].value < value) return;
    for (int i = 0; i < RESULTS; ++i) {
        Result current = results[i];
        if (current.value > value) {
            for (int j = RESULTS - 1; j > i; --j)
                results[j] = results[j - 1];
            current.id = id;
            current.value = value;
            results[i] = current;
            fprintf(stderr, "\r%f %f         ", current.value, value);
            break;
        }
    }
}
void insertMax(Result* results, WordID id, double value) {
    if (results[RESULTS - 1].value > value) return;
    for (int i = 0; i < RESULTS; ++i) {
        Result current = results[i];
        if (current.value < value) {
            for (int j = RESULTS - 1; j > i; --j)
                results[j] = results[j - 1];
            current.id = id;
            current.value = value;
            results[i] = current;
            fprintf(stderr, "\r%f %f         ", current.value, value);
            break;
        }
    }
}

int binarySearch(
    FILE* fd,
    WordID id,
    off_t length,
    char* idBuffer,
    char* vectorBuffer,
    double* parsedVector
) {
    off_t lo = 0;
    off_t hi = length - ((off_t) length) % ((off_t) CHUNK_SIZE);
    for (int i = 0; i < 30 && lo < hi; ++i) {
        off_t mid = lo + (hi - lo >> 1);
        mid -= ((off_t) mid) % ((off_t) CHUNK_SIZE);
        fseek(fd, mid, SEEK_SET);
        fread(idBuffer, BYTES_PER_ID, 1, fd);
        WordID current = idBufferToStruct(idBuffer);
        long long diff = cmp(current, id);
        if (diff > 0) hi = mid;
        else if (diff < 0) lo = mid + CHUNK_SIZE;
        else {
            fread(vectorBuffer, BYTES_PER_VECTOR, 1, fd);
            parseVector(vectorBuffer, parsedVector);
            return 1;
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

    return 0;
}

int main (unsigned int argc, char* argv[]) {
    char *searchTerm = argv[1];
    fprintf(stderr, "Seeking: %s ", searchTerm);
    //14550156499225014674511935968
    unsigned char idBuffer[BYTES_PER_ID];
    hash(searchTerm, idBuffer);
    WordID id = idBufferToStruct(idBuffer);
    fprintf(stderr, "%llx", id.head);
    fprintf(stderr, "%lx\n", id.tail);
    unsigned char vectorBuffer[BYTES_PER_VECTOR];
    double searchTermVector[DIMENSIONS];
    double searchResultVector[DIMENSIONS];
    Result results[RESULTS];
    for (int i = 0; i < RESULTS; ++i) {
        results[i].id.head = 0;
        results[i].id.tail = 0;
        results[i].value = USE_COSINE ? DBL_MIN : DBL_MAX;
    }
    struct stat st;
    stat(LOCATION, &st);
    off_t size = st.st_size;
    FILE* fd = fopen(LOCATION, "r");
    if (binarySearch(fd, id, size, idBuffer, vectorBuffer, searchTermVector)) {
        while (fread(idBuffer, BYTES_PER_ID, 1, fd)) {
            WordID current = idBufferToStruct(idBuffer);
            fread(vectorBuffer, BYTES_PER_VECTOR, 1, fd);
            parseVector(vectorBuffer, searchResultVector);
            if (USE_COSINE) {
                double similarity = cosineSimilatity(searchTermVector, searchResultVector);
                insertMax(results, current, similarity);
            } else {
                double distance = squaredDistance(searchTermVector, searchResultVector);
                insertMin(results, current, distance);
            }
        }
        fprintf(stderr, "\n");
        for (int i = 0; i < RESULTS; ++i) {
            Result current = results[i];
            printID(current.id);
            printf("\t%f\n", current.value);
        }
    }

    return 0;
}
