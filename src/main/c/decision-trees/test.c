#include "../common.c"

#include <stdio.h>
#include <stdbool.h>

typedef struct BinarySearchResult {
    bool found;
    unsigned int index;
} BinarySearchResult;

typedef enum NodeType {
    LEAF,
    BOOLEAN_BRANCH,
    CONTINUOUS_BRANCH
} NodeType;

typedef struct Feature {
    unsigned int id;
    float value;
} Feature;

typedef struct Branch {
    NodeType type; 
    Feature feature;
} Branch;

typedef struct TrainingPoint {
    unsigned int featureCount;
    Feature* features;
    char class;
    float weight;
} TrainingPoint;

typedef struct FeatureData {
    unsigned int presentCount; // How many items have this feature?
    unsigned int i; // A temporary variable.  Ignore.
    Feature* presentIDs; // The IDs of the items with this feature, along with float values.
    unsigned int absentNegative;  // Those items lacking this feature classified as negative.
    unsigned int presentNegative; // Those items with this feature classified as negative.
} FeatureData;

typedef struct TrainingData {
    unsigned int featureCount;
    unsigned int pointCount;
    TrainingPoint* points;
    unsigned int* partitionedIndices;
    FeatureData* featureData;
} TrainingData;

unsigned int bytesToUInt(unsigned char* bytes) {
    unsigned int integer = 0;
    for (unsigned int i = 0; i < 4; ++i) integer = (integer << 8) | bytes[i];

    return integer;
}

unsigned int readUInt(FILE* file) {
    unsigned int v;
    fread((void*)(&v), sizeof(v), 1, file);

    return v;
}

float readFloat(FILE* file) {
    float v;
    fread((void*)(&v), sizeof(v), 1, file);

    return v;
}

char readChar(FILE* file) {
    char v;
    fread((void*)(&v), sizeof(v), 1, file);

    return v;
}

long double giniPurity(
    unsigned int leftNegative,
    unsigned int rightNegative, unsigned int right,
    unsigned int total
) {
    unsigned int left = total - right;
    unsigned int leftPositive = left - leftNegative;
    unsigned int rightPositive = right - rightNegative;
    //printf("L = %u, Pos = %u, Neg = %u, TOTAL %u\n", left, leftNegative, leftPositive, total);
    //printf("R = %u, Pos = %u, Neg = %u\n", right, rightNegative, rightPositive);

    long double leftP = ((long double) left) / ((long double) total);
    long double rightP = ((long double) right) / ((long double) total);

    long double purity = 0;
    if (leftP) {
        long double leftPurity =
            ((long double) (leftNegative * leftNegative + leftPositive * leftPositive)) / ((long double) (left * left));
        purity += leftPurity * leftP;
    }
    if (rightP) {
        long double rightPurity =
            ((long double) (rightNegative * rightNegative + rightPositive * rightPositive)) / ((long double) (right * right));
        purity += rightPurity * rightP;
    }

    return purity;
}

BinarySearchResult binarySearch(
    void* array,
    unsigned int lo,
    unsigned int hi,
    unsigned int itemSize,
    void* term,
    int (*cmp)(const void *, const void*)
) {
    unsigned int left = lo;
    unsigned int right = hi - 1;
    unsigned int candidate;
    bool found = false;
    while (!found && left <= right) {
        candidate = left + (right - left >> 1);
        void* value = array + candidate * itemSize;
        //printf("CAND: %u %u || ", candidate, *(unsigned int*)value);
        int cmpResult = cmp(value, term);
        //printf("R: %d\n", cmpResult);
        if (cmpResult < 0)
            left = candidate + 1;
        else if (cmpResult > 0)
            right = candidate - 1;
        else {
            found = true;
            left = candidate;
        }
    }
    BinarySearchResult result = { found, left };

    return result;
}

int cmpUnsignedInts(const void* a, const void* b) {
    unsigned int uIntA = *(unsigned int*) a;
    unsigned int uIntB = *(unsigned int*) b;
    //printf("CMP: %u %u\n", uIntA, uIntB);

    if (uIntA < uIntB) return -1;
    if (uIntA > uIntB) return +1;
    return 0;
}

int cmpFeaturesByID(const void * a, const void * b) {
    Feature fA = *(Feature*) a;
    Feature fB = *(Feature*) b;

    if (fA.id < fB.id) return -1;
    if (fA.id > fB.id) return +1;
    return 0;
}

int cmpFeaturesByValue(const void * a, const void * b) {
    Feature fA = *(Feature*) a;
    Feature fB = *(Feature*) b;

    if (fA.value < fB.value) return -1;
    if (fA.value> fB.value) return +1;
    return 0;
}

int cmpFeaturesWithID(const void * a, const void * b) {
    Feature fA = *(Feature*) a;
    unsigned int uIntB = *(unsigned int*) b;

    if (fA.id < uIntB) return -1;
    if (fA.id > uIntB) return +1;
    return 0;
}

void printFeatures(Feature* features, unsigned int count) {
    for (unsigned int i = 0; i < count; ++i) {
        unsigned int id = features[i].id;
        float value = features[i].value;
        printf("(%u %f) ", id, value);
    }
    printf("\n");
}

typedef struct Split {
    Feature feature;
    unsigned int right;
    int leftClass;
    int rightClass;
    long double debugPurity;
} Split;

void printSplit(Split split) {
    printf("Split at %u with feature %u and pivot %f (LEFT C: %d) (RIGHT C: %d), Purity = %3.10Lf\n",
        split.right, split.feature.id, split.feature.value, split.leftClass, split.rightClass, split.debugPurity);
}

unsigned int partitionByFeature(TrainingData trainingData, Feature feature, unsigned int lo, unsigned int hi, unsigned int debugDepth) {
    unsigned int left = lo;
    unsigned int right = hi - 1;
    unsigned int* indices = trainingData.partitionedIndices;
    for (int i = lo; i <= right;) {
        unsigned int index = indices[i];
        TrainingPoint point = trainingData.points[index];
        BinarySearchResult result = binarySearch(point.features, 0, point.featureCount, sizeof(Feature), &feature.id, cmpFeaturesWithID);
        //printFeatures(point.features, point.featureCount);
        float value;
        if (result.found) {
            value = point.features[result.index].value;
        } else
            value = 0;
        // Left
        if (value < feature.value) {
            if (i == left) {
                ++i;
            } else {
                unsigned int swap = indices[left];
                indices[i] = swap;
                indices[left] = index;
            }
            ++left;
        // Right
        } else {
            unsigned int swap = indices[right];
            indices[i] = swap;
            indices[right] = index;
            //printf("Swap at i: %u, right: %u (index %u) (lo: %u) (hi: %u)\n", i, right, index, lo, hi);
            --right;
        }
    }
    ++right;
    qsort(indices + lo, right - lo, sizeof(unsigned int), cmpUnsignedInts);
    qsort(indices + right, hi - right, sizeof(unsigned int), cmpUnsignedInts);

    return right;
}

Split bestSplit(TrainingData trainingData, unsigned int lo, unsigned int hi, unsigned int debugDepth) {
    const unsigned int items = hi - lo;
    long double maxPurity = -1;
    unsigned int featureWithMaxPurity = -1;
    float pivotWithMaxPurity = 0;
    unsigned int leftNegativeWithMaxPurity = -1;
    unsigned int rightNegativeWithMaxPurity = -1;
    unsigned int negative = 0;
    for (unsigned int i = lo; i < hi; ++i)
        if (trainingData.points[trainingData.partitionedIndices[i]].class == -1)
            ++negative;
    long double purity = giniPurity(negative, 0, 0, items);
    // For each feature...
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        FeatureData featureData = trainingData.featureData[i];
        float currentValueBlock = -1;
        unsigned int right = 0;
        unsigned int rightNegative = 0;
        unsigned int leftNegative = negative;
        // For each occurrence of the feature...
        for (unsigned int j = featureData.presentCount - 1; j != -1; --j) {
            Feature present = featureData.presentIDs[j];
            unsigned int presentID = present.id;
            BinarySearchResult result = binarySearch(trainingData.partitionedIndices, lo, hi, sizeof(unsigned int), &presentID, cmpUnsignedInts);
            // For each occurrence of the feature in this actual slice...
            if (result.found) {
                float value = featureData.presentIDs[j].value;
                TrainingPoint point = trainingData.points[trainingData.partitionedIndices[result.index]];
                // Boundary between feature values.
                if (value != currentValueBlock) {
                    long double purity = giniPurity(leftNegative, rightNegative, right, items);
                    if (purity > maxPurity) {
                        maxPurity = purity;
                        featureWithMaxPurity = i;
                        pivotWithMaxPurity = currentValueBlock;
                        leftNegativeWithMaxPurity = leftNegative;
                        rightNegativeWithMaxPurity = rightNegative;
                    }
                    currentValueBlock = value;
                }
                ++right;
                if (point.class == -1) {
                    ++rightNegative;
                    --leftNegative;
                }
            }
        }
        long double purity = giniPurity(leftNegative, rightNegative, right, items);
        if (purity > maxPurity) {
            maxPurity = purity;
            featureWithMaxPurity = i;
            pivotWithMaxPurity = currentValueBlock;
            leftNegativeWithMaxPurity = leftNegative;
            rightNegativeWithMaxPurity = rightNegative;
        }
    }
    Feature pivotFeature;
    pivotFeature.id = featureWithMaxPurity;
    pivotFeature.value = pivotWithMaxPurity;
    unsigned int right = partitionByFeature(trainingData, pivotFeature, lo, hi, debugDepth);
    Split split;
    split.feature.id = featureWithMaxPurity;
    split.feature.value = pivotWithMaxPurity;
    split.right = right;
    split.debugPurity = maxPurity;
    split.leftClass = leftNegativeWithMaxPurity == 0 ? +1 : (leftNegativeWithMaxPurity == right - lo ? -1 : 0);
    split.rightClass = rightNegativeWithMaxPurity == 0 ? +1 : (rightNegativeWithMaxPurity == hi - right ? -1 : 0);

    return split;
}

FeatureData* trainingDataToFeatureData(TrainingData trainingData) {
    FeatureData* featureData = malloc(trainingData.featureCount * sizeof(FeatureData));
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        featureData[i].presentCount = 0;
        featureData[i].presentNegative = 0;
        featureData[i].absentNegative = 0;
        featureData[i].i = 0;
    }
    // For each training point...
    for (unsigned int i = 0; i < trainingData.pointCount; ++i) {
        TrainingPoint point = trainingData.points[i];
        unsigned int previousFeature = 0;
        // For each present feature...
        for (unsigned int j = 0; j < point.featureCount; ++j) {
            Feature feature = point.features[j];
            unsigned int featureID = feature.id;
            if (point.class == -1) {
                featureData[featureID].presentNegative = featureData[featureID].presentNegative + 1;
                for (unsigned int missingFeature = previousFeature; missingFeature < featureID; ++missingFeature)
                    featureData[missingFeature].absentNegative = featureData[missingFeature].absentNegative + 1;
                previousFeature = featureID + 1;
            }
            featureData[featureID].presentCount = featureData[featureID].presentCount + 1;
        }
        if (point.class == -1)
            for (unsigned int missingFeature = previousFeature; missingFeature < trainingData.featureCount; ++missingFeature)
                featureData[missingFeature].absentNegative = featureData[missingFeature].absentNegative + 1;
    }
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        featureData[i].presentIDs = malloc(featureData[i].presentCount * sizeof(Feature));
    }
    for (unsigned int i = 0; i < trainingData.pointCount; ++i) {
        TrainingPoint point = trainingData.points[i];
        for (unsigned int j = 0; j < point.featureCount; ++j) {
            Feature feature = point.features[j];
            unsigned int featureID = feature.id;
            unsigned int k = featureData[featureID].i;
            featureData[featureID].presentIDs[k].id = i;
            featureData[featureID].presentIDs[k].value = feature.value;
            featureData[featureID].i = k + 1;
        }
    }
    for (unsigned int i = 0; i < trainingData.featureCount; ++i)
        qsort(featureData[i].presentIDs, featureData[i].presentCount, sizeof(Feature), cmpFeaturesByValue);

    return featureData;
}

TrainingData readTrainingData(FILE* file) {
    unsigned char* intBytes = malloc(sizeof(unsigned int));
    int sizeofFloat = sizeof(float);
    printf("Sizeof float: %d\n", sizeofFloat);
    unsigned int featureCount = readUInt(file);
    printf("Features: %u\n", featureCount);
    unsigned int trainingPointCount = readUInt(file);
    printf("Training points: %u\n", trainingPointCount);
    TrainingPoint* trainingPoints = malloc(trainingPointCount * sizeof(TrainingPoint));
    for (unsigned int i = 0; i < trainingPointCount; ++i) {
        char class = readChar(file);
        //printf("Class: %d ", class);
        trainingPoints[i].class = class; 
        unsigned int trainingPointFeatureCount = readUInt(file);
        trainingPoints[i].featureCount = trainingPointFeatureCount;
        Feature* features = malloc(trainingPointFeatureCount * sizeof(Feature));
        for (unsigned int j = 0; j < trainingPointFeatureCount; ++j) {
            unsigned int feature = readUInt(file);
            features[j].id = feature; 
            float value = readFloat(file);
            features[j].value = value; 
        }
        qsort(features, trainingPointFeatureCount, sizeof(Feature), cmpFeaturesByID);
        for (unsigned int j = 0; j < trainingPointFeatureCount && j < 12; ++j) {
            unsigned int feature = features[j].id; 
            float value = features[j].value;
            //printf("(%u, %f) ", feature, value);
        }
        //printf("\n");
        trainingPoints[i].features = features;
        trainingPoints[i].weight = 1;
    }
    unsigned int* partitionedIndices = malloc(trainingPointCount * sizeof(unsigned int));
    for (unsigned int i = 0; i < trainingPointCount; ++i)
        partitionedIndices[i] = i;
    TrainingData trainingData = {
        featureCount,
        trainingPointCount,
        trainingPoints,
        partitionedIndices,
        0
    };
    trainingData.featureData = trainingDataToFeatureData(trainingData);
    
    return trainingData;
}

void testBinarySearch() {
    unsigned int* data = malloc(10 * sizeof(unsigned int));
    for (unsigned int i = 0; i < 10; ++i) {
        data[i] = i * 2;
        printf("%u ", i * 2);
    }
    printf("\n");
    for (unsigned int i = 0; i < 20; ++i) {
        BinarySearchResult result = binarySearch(data, 0, 10, sizeof(unsigned int), &i, cmpUnsignedInts);
        printf("Found %d (%d) at %d\n", i, result.found, result.index);
    }
}

void buildTree(
    TrainingData trainingData,
    unsigned int lo,
    unsigned int hi,
    unsigned int currentDepth,
    unsigned int maxDepth
) {
    if (currentDepth == maxDepth) return;
    Split split = bestSplit(trainingData, lo, hi, currentDepth);
    for (unsigned int i = 1; i < currentDepth; ++i) printf("│");
    if (currentDepth > 0) printf("├");
    printSplit(split);
    unsigned int nextDepth = currentDepth + 1;
    if (split.leftClass == 0)
        buildTree(trainingData, lo, split.right, nextDepth, maxDepth);
    if (split.rightClass == 0)
        buildTree(trainingData, split.right, hi, nextDepth, maxDepth);
}

int main(int argc, char* argv[]) {
    //testBinarySearch();
    //return 0;
    char* inputFileName = argv[1];
    printf("input: %s\n", inputFileName);
    FILE *inputFile = fopen(inputFileName, "r");
    TrainingData trainingData = readTrainingData(inputFile);
    buildTree(trainingData, 0, trainingData.pointCount, 0, 50);
    printf("23119 class: %d\n", trainingData.points[23119].class);
    return 0;

    return 0;
}