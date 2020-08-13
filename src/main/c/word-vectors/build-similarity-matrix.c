#include "./common.c"

#define ASYNCHRONOUS 0

typedef struct MergeParamsStruct {
    VectorSimilarity* a;
    VectorSimilarity* b;
    long groupSize;
} MergeParams;

int dCount = 0;
VectorSimilarity* v;
void* mergeSimilarityGroups(void* params) {
    MergeParams* castParams = (MergeParams*) params;
    VectorSimilarity* a = castParams->a;
    VectorSimilarity* hi = castParams->b;
    long groupSize = castParams->groupSize;
    VectorSimilarity* endA = a + groupSize;
    VectorSimilarity* endB = hi + groupSize;
    for (; a < endA; ++a) {
        if (((long) a & 0xFFFL) == 0L) {
            long remaining = (long) (endA - a);
            long all = (long) (endA - castParams->a);
            long done = all - remaining;
            double progress = ((double) done) / ((double) all) * 100;
            printf("\r                           ");
            printf("\r%ld / %ld (%f%%)", done, all, progress);
            fflush(stdout);
        }
        Result* aSynonyms = a->synonyms;
        float* aDimensions = a->dimensions;
        WordID aID = a->id;
        float aCutoff = aSynonyms[0].value;
        for (VectorSimilarity* b = hi; b < endB; ++b) {
            float bCutoff = b->synonyms[0].value;
            float maxCutoff;
            if (aCutoff > bCutoff) maxCutoff = aCutoff;
            else maxCutoff = bCutoff;
            float d = squaredDistance(aDimensions, b->dimensions, maxCutoff);
            ++dCount;
            if (d >= 0) {
                aCutoff = insertMin(aSynonyms, MAX_SIMILARITIES, b->id, d);
                bCutoff = insertMin(b->synonyms, MAX_SIMILARITIES, aID, d);
            }
        }
   }
}

typedef struct CreateParamsStruct {
    VectorSimilarity* vectors;
    VectorSimilarity* end;
} CreateParams;

void* createSimilarityGroup(void* params) {
    CreateParams* castParams = (CreateParams*) params;
    VectorSimilarity* vectors = castParams->vectors;
    VectorSimilarity* end = castParams->end;
    for (VectorSimilarity* lo = vectors; lo < end; ++lo) {
        if (((long) lo & 0xFFFL) == 0L) {
            long remaining = (long) (end - lo);
            long all = (long) (end - vectors);
            long done = all - remaining;
            double progress = ((double) done) / ((double) all) * 100;
            printf("\r                           ");
            printf("\r%ld / %ld (%f%%)", done, all, progress);
            fflush(stdout);
        }
        float* dimensions = lo->dimensions;
        Result* loSynonyms = lo->synonyms;
        WordID loID = lo->id;
        float loCutoff = loSynonyms[0].value;
        for (VectorSimilarity* hi = lo + 1; hi < end; ++hi) {
            float hiCutoff = hi->synonyms[0].value;
            float maxCutoff;
            if (loCutoff > hiCutoff) maxCutoff = loCutoff;
            else maxCutoff = hiCutoff;
            float d = squaredDistance(dimensions, hi->dimensions, maxCutoff);
            ++dCount;
            if (d >= 0) {
                loCutoff = insertMin(loSynonyms, MAX_SIMILARITIES, hi->id, d);
                hiCutoff = insertMin(hi->synonyms, MAX_SIMILARITIES, loID, d);
            }
        }
    }
}

int parallelMergeSimilarityGroup(
    VectorSimilarity* a,
    VectorSimilarity* b,
    long outerGroupSize,
    long innerGroupSize,
    off_t phase,
    int threadCount,
    pthread_t* threads,
    int currentThread
) {
    //printf("\tbinary merge: [%ld, [%ld, @%ld\n", (a - v), (b - v), phase);
    for (off_t offset = 0; offset < outerGroupSize; offset += innerGroupSize) {
        VectorSimilarity* lo = a + offset;
        VectorSimilarity* hi = b + offset + phase;
        // Apply MODULO rule, to avoid overflows.
        while (hi >= b + outerGroupSize)
            hi -= outerGroupSize;
        // Spin a thread.
        MergeParams* params = (MergeParams*) malloc(sizeof(MergeParams));
        params[0].a = lo;
        params[0].b = hi;
        params[0].groupSize = innerGroupSize;
        //printf("\t\tpart: [%ld, [%ld mod %ld\n", (lo - v), (hi - v), outerGroupSize);
        if (ASYNCHRONOUS || currentThread == threadCount - 1)
            mergeSimilarityGroups(params);
        else
            pthread_create(&threads[currentThread++], NULL, &mergeSimilarityGroups, params);
    }

    return currentThread;
}

void joinThreads(int count, pthread_t* threads) {
    if (ASYNCHRONOUS) return;
    for (int i = 0; i < count - 1; ++i)
        pthread_join(threads[i], NULL);
}

void naryMergeSimilarityGroup(
    VectorSimilarity* vectors,
    int groups,
    long outerGroupSize,
    int processors,
    pthread_t* threads
) {
    printf("\n");
    int ret = system("date");
    printf("Round %d.", groups);
    if (groups == 1) return;
    // How many processors to assign to each pair.
    int pairProcessors = (processors << 1) / groups;
    long innerGroupSize = outerGroupSize / pairProcessors;
    for (off_t phase = 0; phase < outerGroupSize; phase += innerGroupSize) {
        int currentThread = 0;
        for (int i = 0; i < groups; i += 2) {
            VectorSimilarity* left = vectors + i * outerGroupSize;
            VectorSimilarity* right = vectors + (i + 1) * outerGroupSize;
            //printf("Phase: %ld, L: %ld, R: %ld, Size %ld\n", phase, left - vectors, right - vectors, outerGroupSize);
            currentThread = parallelMergeSimilarityGroup(
                left, right, outerGroupSize, innerGroupSize, phase, processors, threads, currentThread);
        }
        joinThreads(processors, threads);
    }
    // Number of distinct groups is halved in next step, and size of each
    // group is twice as large.  Same processors apply.
    naryMergeSimilarityGroup(vectors, groups >> 1, outerGroupSize << 1, processors, threads);
}

int main(unsigned int argc, unsigned char* argv[]) {
    char* src = argv[1];
    char* dst = argv[2];
    int processors = atoi(argv[3]);
    if (ASYNCHRONOUS)
        printf("ASYNCHRONOUS MODE.\n");
    unsigned char idBuffer[BYTES_PER_ID];
    Result results[MAX_SIMILARITIES];
    clearResults(results, MAX_SIMILARITIES);
    float nextVector[DIMENSIONS];
    unsigned char vectorBuffer[BYTES_PER_VECTOR];
    struct stat st;
    stat(src, &st);
    off_t size = st.st_size;
    off_t unpaddedRows = ((off_t) size) / ((off_t) CHUNK_SIZE);
    // Needed for multithreading.
    off_t P2 = processors * 2;
    off_t mod = unpaddedRows % P2;
    off_t rows = unpaddedRows;
    if (mod)
        rows = rows - mod + P2;
    printf("Rows: %ld\n", rows);
    FILE* in = fopen(src, "r");
    VectorSimilarity* vectors = (VectorSimilarity*) malloc(sizeof(VectorSimilarity) * rows);
    v = vectors;
    VectorSimilarity* currentVectorPtr = vectors;
    while (fread(idBuffer, BYTES_PER_ID, 1, in)) {
        currentVectorPtr->id = idBufferToStruct(idBuffer);
        float* dimensions = currentVectorPtr->dimensions;
        Result* synonyms = currentVectorPtr->synonyms;
        readVector(in, vectorBuffer, dimensions);
        clearResults(synonyms, MAX_SIMILARITIES);
        ++currentVectorPtr;
    }
    for (; currentVectorPtr != vectors + rows; ++currentVectorPtr) {
        currentVectorPtr->id.head = 0;
        currentVectorPtr->id.tail = 0;
        for (int i = 0; i < DIMENSIONS; ++i)
            currentVectorPtr->dimensions[i] = FLT_MAX;
        clearResults(currentVectorPtr->synonyms, MAX_SIMILARITIES);
    }
    off_t rowsPerProcessor = rows / processors;
    int ret = system("date");
    printf("Begin.");
    fflush(stdout);
    int currentThread = 0;
    pthread_t threadIDs[processors - 1];
    for (off_t offset = 0; offset < rows; offset += rowsPerProcessor) {
        CreateParams* params = malloc(sizeof(CreateParams));
        params[0].vectors = vectors + offset;
        params[0].end = vectors + offset + rowsPerProcessor;
        if (ASYNCHRONOUS || currentThread == processors - 1)
            createSimilarityGroup(params);
        else
            pthread_create(&threadIDs[currentThread++], NULL, &createSimilarityGroup, params);
    }
    joinThreads(processors, threadIDs);
    naryMergeSimilarityGroup(vectors, processors, rowsPerProcessor, processors, threadIDs);
    //printSimilarities(vectors, rows);
    unsigned char floatBuffer[BYTES_PER_DIMENSION];
    FILE* out = fopen(dst, "w");
    unsigned char* lengthBuffer = malloc(1);
    lengthBuffer[0] = (unsigned char) MAX_SIMILARITIES;
    fwrite(lengthBuffer, 1, 1, out);
    for (off_t i = 0; i < unpaddedRows; ++i) {
        VectorSimilarity vector = vectors[i];
        WordID parent = vector.id;
        idStructToBuffer(parent, idBuffer);
        fwrite(idBuffer, BYTES_PER_ID, 1, out);
        Result* synonyms = vector.synonyms;
        for (int j = 0; j < MAX_SIMILARITIES; ++j) {
            Result synonym = synonyms[j];
            WordID child = synonym.id;
            idStructToBuffer(child, idBuffer);
            fwrite(idBuffer, BYTES_PER_ID, 1, out);
            float value = synonym.value;
            serializeFloat(value, floatBuffer, 0);
            fwrite(floatBuffer, BYTES_PER_DIMENSION, 1, out);
        }
    }
    free(vectors);
    printf("\n");
}