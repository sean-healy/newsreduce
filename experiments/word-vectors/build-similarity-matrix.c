#include <time.h>
#include <pthread.h>

#include "./common.c"

#define PROCESSORS 8

int CURRENT_THREAD = 0;
pthread_t THREAD_IDS[PROCESSORS - 1];

typedef struct MergeParamsStruct {
    Vector* a;
    Vector* b;
    long groupSize;
} MergeParams;

void* mergeSimilarityGroups(void* params) {
    MergeParams* castParams = (MergeParams*) params;
    Vector* a = castParams->a;
    Vector* b = castParams->b;
    long groupSize = castParams->groupSize;
    Vector* endA = a + groupSize;
    Vector* endB = b + groupSize;
    for (; a < endA; ++a) {
        Result* aSynonyms = a->synonyms;
        float* aDimensions = a->dimensions;
        WordID aID = a->id;
        float aCutoff = aSynonyms[0].value;
        for (; b < endB; ++b) {
            float bCutoff = b->synonyms[0].value;
            float maxCutoff;
            if (aCutoff > bCutoff) maxCutoff = aCutoff;
            else maxCutoff = bCutoff;
            float d = squaredDistance(aDimensions, b->dimensions, maxCutoff);
            if (d >= 0) {
                aCutoff = insertMin(aSynonyms, MAX_SYNONYMS, b->id, d);
                bCutoff = insertMin(b->synonyms, MAX_SYNONYMS, aID, d);
            }
        }
    }
}

typedef struct CreateParamsStruct {
    Vector* vectors;
    Vector* end;
} CreateParams;

void* createSimilarityGroup(void* params) {
    CreateParams* castParams = (CreateParams*) params;
    Vector* vectors = castParams->vectors;
    Vector* end = castParams->end;
    printf("Creating similarity group at address %ld.\n", (long) vectors);
    for (Vector* lo = vectors; lo < end; ++lo) {
        if (((long) lo & 0xFFL) == 0L)
            printf("%ld / %ld\n", (long) (end - lo), (long) (end - vectors));
        float* dimensions = lo->dimensions;
        Result* loSynonyms = lo->synonyms;
        WordID loID = lo->id;
        float loCutoff = loSynonyms[0].value;
        for (Vector* hi = lo + 1; hi < end; ++hi) {
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
    }
}

void parallelMergeSimilarityGroup(
    Vector* a,
    Vector* b,
    long outerGroupSize,
    long innerGroupSize,
    off_t phase
) {
    for (off_t offset = 0; offset < outerGroupSize; offset += innerGroupSize) {
        Vector* hi = b + offset + phase;
        // Apply MODULO rule, to avoid overflows.
        if (hi > b + outerGroupSize) hi -= outerGroupSize;
        // Spin a thread.
        MergeParams params = {a + offset, hi, innerGroupSize};
        if (CURRENT_THREAD == PROCESSORS - 1)
            mergeSimilarityGroups(&params);
        else
            pthread_create(&THREAD_IDS[CURRENT_THREAD++], NULL, &mergeSimilarityGroups, &params);
    }
}

void joinThreads() {
    for (int i = 0; i < PROCESSORS - 1; ++i)
        pthread_join(THREAD_IDS[i], NULL);
}

void naryMergeSimilarityGroup(Vector* vectors, int groups, long outerGroupSize, int processors) {
    if (groups == 1) return;
    // How many processors to assign to each pair.
    int pairProcessors = (processors << 1) / groups;
    long innerGroupSize = outerGroupSize / pairProcessors;
    for (off_t phase = 0; phase < outerGroupSize; phase += innerGroupSize) {
        for (int i = 0; i < groups; i += 2) {
            Vector* left = vectors + i * outerGroupSize;
            Vector* right = vectors + (i + 1) * outerGroupSize;
            parallelMergeSimilarityGroup(left, right, outerGroupSize, innerGroupSize, phase);
        }
        joinThreads();
    }
    // Number of distinct groups is halved in next step, and size of each
    // group is twice as large.  Same processors apply.
    naryMergeSimilarityGroup(vectors, groups >> 1, outerGroupSize << 1, processors);
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
    // Needed for multithreading.
    rows = powerOfTwoNotAbove(rows);
    off_t rowsPerProcessor = rows / PROCESSORS;
    CURRENT_THREAD = 0;
    printf("rows pp: %ld\n", rowsPerProcessor);
    for (off_t offset = 0; offset < rows; offset += rowsPerProcessor) {
        CreateParams params = {vectors + offset, vectors + offset + rowsPerProcessor};
        if (CURRENT_THREAD == PROCESSORS - 1)
            createSimilarityGroup(&params);
        else
            pthread_create(&THREAD_IDS[CURRENT_THREAD++], NULL, &createSimilarityGroup, &params);
        pthread_create(&THREAD_IDS[CURRENT_THREAD++], NULL, &mergeSimilarityGroups, &params);
    }
    joinThreads();
    CURRENT_THREAD = 0;
    naryMergeSimilarityGroup(vectors, PROCESSORS, rowsPerProcessor, PROCESSORS);
}