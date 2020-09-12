#include "../common.c"

#include <stdio.h>
#include <stdbool.h>
#include <getopt.h>
#include <sys/time.h>

typedef struct BinarySearchResult {
    bool found;
    unsigned int index;
} BinarySearchResult;
typedef enum NodeType {
    BOTH_LEAF,
    LEFT_LEAF,
    RIGHT_LEAF,
    NON_LEAF,
} NodeType;

typedef struct Feature {
    unsigned int id;
    float value;
} Feature;

typedef struct Branch {
    NodeType type; 
    Feature feature;
} Branch;

typedef struct Datum {
    unsigned int featureCount;
    Feature* features;
    char class;
    long double weight;
} Datum;

typedef struct FeatureDatum {
    unsigned int presentCount; // How many items have this feature?
    unsigned int i; // A temporary variable.  Ignore.
    Feature* presentIDs; // The IDs of the items with this feature, along with float values.
    unsigned int absentNegative;  // Those items lacking this feature classified as negative.
    unsigned int presentNegative; // Those items with this feature classified as negative.
    bool booleanFeature; // Stores whether this is a boolean feature (e.g. 0 or 1).
    float booleanHi; // Stores the hi value in the case of a boolean feature (usually 1).
    unsigned int booleanRightOffset; // Stores the offset at which hi begins in presentIDs, when boolean feature.
} FeatureDatum;

typedef struct Data {
    const unsigned int featureCount;
    unsigned int pointCount;
    Datum* points;
    unsigned int* partitionedIndices;
    FeatureDatum* featureData;
    bool* seenFeature; // Temporary data for checking if a feature has been considered.
} Data;

typedef struct DecisionTreeNode {
    Feature feature;
    NodeType type;
    int left;
    int right;
    int parent;
} DecisionTreeNode;

typedef struct DecisionTree {
    unsigned int nodeCount;
    DecisionTreeNode* nodes;
} DecisionTree;

typedef struct DecisionForest {
    long double* weights;
    unsigned int treeCount;
    DecisionTree* trees;
    long double decisionThreshold;
} DecisionForest;

unsigned int readUInt(FILE* file) {
    unsigned int v;
    size_t useless = fread((void*)(&v), sizeof(v), 1, file);

    return v;
}

float readFloat(FILE* file) {
    float v;
    size_t useless = fread((void*)(&v), sizeof(v), 1, file);

    return v;
}

char readChar(FILE* file) {
    char v;
    size_t useless = fread((void*)(&v), sizeof(v), 1, file);

    return v;
}

long double uniGiniPurity(const long double negative, const long double total) {
    const long double positive = total - negative;

    return ((long double) (negative * negative + positive * positive)) / ((long double) (total * total));
}

long double giniPurity(
    const long double leftNegative,
    const long double rightNegative,
    const long double right,
    const long double total
) {
    const long double left = total - right;
    const long double leftPositive = left - leftNegative;
    const long double rightPositive = right - rightNegative;

    const long double leftP = ((long double) left) / ((long double) total);
    const long double rightP = ((long double) right) / ((long double) total);

    long double purity = 0;
    if (leftP) {
        const long double leftPurity =
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

const BinarySearchResult binarySearch(
    void* array,
    const unsigned int lo,
    const unsigned int hi,
    const unsigned int itemSize,
    const void* term,
    const int (*cmp)(const void *, const void*),
    bool debug
) {
    unsigned int left = lo;
    unsigned int right = hi - 1;
    unsigned int candidate;
    bool found = false;
    while (!found && left <= right) {
        candidate = left + (right - left >> 1);
        void* value = array + candidate * itemSize;
        int cmpResult = cmp(value, term);
        if (cmpResult < 0)
            left = candidate + 1;
        else if (cmpResult > 0) {
            right = candidate - 1;
            if (right == -1) break;
        } else {
            found = true;
            left = candidate;
        }
    }
    const BinarySearchResult result = { found, left };

    return result;
}

int cmpUnsignedInts(const void* a, const void* b) {
    const unsigned int uIntA = *(const unsigned int*) a;
    const unsigned int uIntB = *(const unsigned int*) b;

    if (uIntA < uIntB) return -1;
    if (uIntA > uIntB) return +1;
    return 0;
}

int cmpFeaturesByID(const void * a, const void * b) {
    const Feature fA = *(const Feature*) a;
    const Feature fB = *(const Feature*) b;

    if (fA.id < fB.id) return -1;
    if (fA.id > fB.id) return +1;
    return 0;
}

int cmpFeaturesByValue(const void * a, const void * b) {
    const Feature fA = *(const Feature*) a;
    const Feature fB = *(const Feature*) b;

    if (fA.value < fB.value) return -1;
    if (fA.value> fB.value) return +1;
    return 0;
}

const int cmpFeaturesWithID(const void * a, const void * b) {
    const Feature fA = *(const Feature*) a;
    const unsigned int uIntB = *(const unsigned int*) b;

    if (fA.id < uIntB) return -1;
    if (fA.id > uIntB) return +1;
    return 0;
}

void printFeatures(const Feature* features, const unsigned int count) {
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
    long double leftNegative;
    long double rightWeight;
    long double rightNegative;
    long double debugPurity;
} Split;

void printSplit(Split split) {
    printf("Split at %u with feature %u and pivot %f (LEFT C: %d) (RIGHT C: %d) Purity = %3.10Lf\n",
        split.right, split.feature.id, split.feature.value, split.leftClass, split.rightClass, split.debugPurity);
}

const unsigned int partitionByFeature(
    const Data* trainingDataPtr,
    const Feature feature,
    const unsigned int lo,
    const unsigned int hi
) {
    const Data trainingData = *trainingDataPtr;
    unsigned int left = lo;
    unsigned int right = hi - 1;
    unsigned int* indices = trainingData.partitionedIndices;
    for (unsigned int i = lo; right != -1 && i <= right;) {
        unsigned int index = indices[i];
        Datum point = trainingData.points[index];
        BinarySearchResult result = binarySearch(point.features, 0, point.featureCount, sizeof(Feature), &feature.id, cmpFeaturesWithID, false);
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
            --right;
        }
    }
    ++right;
    qsort(indices + lo, right - lo, sizeof(unsigned int), cmpUnsignedInts);
    qsort(indices + right, hi - right, sizeof(unsigned int), cmpUnsignedInts);

    return right;
}

typedef struct Pivot {
    float value;
    long double purity;
    long double leftNegative;
    long double rightWeight;
    long double rightNegative;
} Pivot;

Pivot bestPivot(
    const Data* trainingDataPtr,
    const unsigned int lo,
    const unsigned int hi,
    const unsigned int feature,
    const long double weight,
    const long double negative,
    const long double maxPurity
) {
    Data trainingData = *trainingDataPtr;
    Pivot pivot;
    pivot.purity = maxPurity;
    FeatureDatum featureData = trainingData.featureData[feature];
    long double right = 0;
    long double rightNegative = 0;
    long double leftNegative = negative;
    float currentValueBlock = -1;
    if (featureData.booleanFeature) {
        for (unsigned int j = featureData.presentCount - 1; j != -1; --j) {
            Feature present = featureData.presentIDs[j];
            unsigned int presentID = present.id;
            BinarySearchResult result = binarySearch(trainingData.partitionedIndices, lo, hi, sizeof(unsigned int), &presentID, cmpUnsignedInts, false);
            if (result.found) {
                float value = featureData.presentIDs[j].value;
                Datum point = trainingData.points[trainingData.partitionedIndices[result.index]];
                // Right
                if (value >= featureData.booleanHi) {
                    right += point.weight;
                    if (point.class == -1) {
                        rightNegative += point.weight;
                    }
                }
            }
        }
        leftNegative -= rightNegative;
        currentValueBlock = featureData.booleanHi;
    } else {
        bool shallIContinue = true;
        // For each occurrence of the feature...
        for (unsigned int j = featureData.presentCount - 1; pivot.purity < 1 && j != -1; --j) {
            const Feature present = featureData.presentIDs[j];
            const unsigned int presentID = present.id;
            const BinarySearchResult result = binarySearch(trainingData.partitionedIndices, lo, hi, sizeof(unsigned int), &presentID, cmpUnsignedInts, false);
            // For each occurrence of the feature in this actual slice...
            if (result.found) {
                float value = featureData.presentIDs[j].value;
                Datum point = trainingData.points[trainingData.partitionedIndices[result.index]];
                // Boundary between feature values.
                if (value != currentValueBlock) {
                    long double purity = giniPurity(leftNegative, rightNegative, right, weight);
                    if (purity > pivot.purity) {
                        pivot.purity = purity;
                        pivot.value = currentValueBlock;
                        pivot.rightWeight = right;
                        pivot.leftNegative = leftNegative;
                        pivot.rightNegative = rightNegative;
                    }
                    currentValueBlock = value;
                }
                right += point.weight;
                if (point.class == -1) {
                    rightNegative += point.weight;
                    leftNegative -= point.weight;
                }
            }
        }
    }
    const long double purity = giniPurity(leftNegative, rightNegative, right, weight);
    if (purity > pivot.purity) {
        pivot.purity = purity;
        pivot.value = currentValueBlock;
        pivot.rightWeight = right;
        pivot.leftNegative = leftNegative;
        pivot.rightNegative = rightNegative;
    }

    return pivot;
}

bool safeDoubleEQ(long double a, long double b, long double precision) {
    if (a > b) return a - b < precision;
    return b - a < precision;
}

float normalisedGapFrequency(float gap, float sample, float population) {
    float p = sample / population;
    float q = 1 - p;
    float f = pow(q, gap);

    return f;
}

float pGapBasis(float probability, float sample, float population) {
    if (sample == population) return 0;
    float p = sample / population;
    float q = 1 - p;

    float base = q;
    return log(probability) / log(base);
}

unsigned int pGap(float probability, float sample, float population) {
    if (sample == population) return 0;
    float aboveMaxGap = population - sample + 1;
    float pAboveMaxGap = normalisedGapFrequency(aboveMaxGap, sample, population);
    float correction = -pGapBasis(1 + pAboveMaxGap, sample, population);
    float yScale = aboveMaxGap / (aboveMaxGap + correction);
    float xShiftedP = pGapBasis(probability + pAboveMaxGap, sample, population);
    float originIntercept = xShiftedP - aboveMaxGap;
    float yScaledP = originIntercept * yScale;
    float originalIntercept = yScaledP + aboveMaxGap;

    return (unsigned int) floor(originalIntercept);
}

const float RAND_MAX_FLOAT = (float) RAND_MAX;
unsigned int randomGap(float sample, float population) {
    float p = rand() / RAND_MAX_FLOAT;

    return pGap(p, sample, population);
}

const Split bestSplit(
    const Data* trainingDataPtr,
    const unsigned int lo,
    const unsigned int hi,
    const long double weight,
    const long double negative,
    const long double randomFeatureSampleRatio
) {
    Data trainingData = *trainingDataPtr;
    long double precision = ((long double) 1) / ((long double) trainingData.pointCount) / 10000;
    unsigned int maxFeature;
    Pivot maxPivot;
    maxPivot.purity = uniGiniPurity(negative, weight);
    unsigned int sliceFeatureCount = 0;
    for (int i = lo; i < hi; ++i) {
        const unsigned int index = trainingData.partitionedIndices[i];
        const Datum point = trainingData.points[index];
        // For each feature.
        for (int j = 0; j < point.featureCount; ++j) {
            unsigned int feature = point.features[j].id;
            // For each feature not seen yet.
            if (!trainingData.seenFeature[feature]) {
                trainingData.seenFeature[feature] = true;
                ++sliceFeatureCount;
            }
        }
    }
    unsigned int sample;
    if (randomFeatureSampleRatio == -1) {
        sample = (unsigned int) sqrtf(sliceFeatureCount);
    } else if (randomFeatureSampleRatio == -2) {
        sample = (unsigned int) logf(sliceFeatureCount);
    } else {
        sample =
            (unsigned int) (sliceFeatureCount * randomFeatureSampleRatio);
    }
    unsigned int gapRemaining = randomGap(sample, sliceFeatureCount);
    sliceFeatureCount -= gapRemaining + 1;
    bool shallIContinue = true;
    // For each data point in this slice of the data.
    for (int i = lo; maxPivot.purity < 1 && i < hi; ++i) {
        const unsigned int index = trainingData.partitionedIndices[i];
        const Datum point = trainingData.points[index];
        // For each feature.
        for (int j = 0; j < point.featureCount; ++j) {
            const unsigned int feature = point.features[j].id;
            // For each feature not seen yet.
            if (trainingData.seenFeature[feature]) {
                trainingData.seenFeature[feature] = false;
                if (gapRemaining-- == 0) {
                    Pivot pivot = bestPivot(&trainingData, lo, hi, feature, weight, negative, maxPivot.purity);
                    if (pivot.purity > maxPivot.purity) {
                        maxPivot = pivot;
                        maxFeature = feature;
                    }
                    --sample;
                    gapRemaining = randomGap(sample, sliceFeatureCount);
                    sliceFeatureCount -= gapRemaining + 1;
                }
            }
        }
    }
    Feature pivotFeature;
    pivotFeature.id = maxFeature;
    pivotFeature.value = maxPivot.value;
    const unsigned int boundary = partitionByFeature(&trainingData, pivotFeature, lo, hi);
    long double leftWeight = weight - maxPivot.rightWeight;
    int leftClass = safeDoubleEQ(maxPivot.leftNegative, 0, precision) ? +1 : (safeDoubleEQ(maxPivot.leftNegative, leftWeight, precision) ? -1 : 0);
    int rightClass = safeDoubleEQ(maxPivot.rightNegative, 0, precision) ? +1 : (safeDoubleEQ(maxPivot.rightNegative, maxPivot.rightWeight, precision) ? -1 : 0);
    const Split split = {
        pivotFeature,
        boundary,
        leftClass,
        rightClass,
        maxPivot.leftNegative,
        maxPivot.rightWeight,
        maxPivot.rightNegative,
        maxPivot.purity
    };

    return split;
}

FeatureDatum* trainingDataToFeatureData(Data trainingData) {
    FeatureDatum* featureData = malloc(trainingData.featureCount * sizeof(FeatureDatum));
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        featureData[i].presentCount = 0;
        featureData[i].presentNegative = 0;
        featureData[i].absentNegative = 0;
        featureData[i].i = 0;
    }
    // For each training point...
    for (unsigned int i = 0; i < trainingData.pointCount; ++i) {
        Datum point = trainingData.points[i];
        unsigned int previousFeature = 0;
        // For each present feature...
        for (unsigned int j = 0; j < point.featureCount; ++j) {
            Feature feature = point.features[j];
            unsigned int featureID = feature.id;
            if (point.class == -1) {
                ++featureData[featureID].presentNegative;
                for (unsigned int missingFeature = previousFeature; missingFeature < featureID; ++missingFeature)
                    ++featureData[missingFeature].absentNegative;
                previousFeature = featureID + 1;
            }
            ++featureData[featureID].presentCount;
        }
        if (point.class == -1)
            for (unsigned int missingFeature = previousFeature; missingFeature < trainingData.featureCount; ++missingFeature)
                ++featureData[missingFeature].absentNegative;
    }
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        featureData[i].presentIDs = malloc(featureData[i].presentCount * sizeof(Feature));
    }
    for (unsigned int i = 0; i < trainingData.pointCount; ++i) {
        Datum point = trainingData.points[i];
        for (unsigned int j = 0; j < point.featureCount; ++j) {
            Feature feature = point.features[j];
            unsigned int featureID = feature.id;
            unsigned int k = featureData[featureID].i;
            featureData[featureID].presentIDs[k].id = i;
            featureData[featureID].presentIDs[k].value = feature.value;
            featureData[featureID].i = k + 1;
        }
    }
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        FeatureDatum featureDatum = featureData[i];
        float loHi[2];
        Feature* feature = featureDatum.presentIDs;
        unsigned int size;
        // If every data point has this feature, then the binary values may be other than '0 and something else'.
        // Usually, not every data point has a record of a feature, so 0 needs to be one of the boolean values,
        // as it is used as the default value for those items with no record of the feature.
        if (featureDatum.presentCount == trainingData.pointCount)
            size = 0;
        else {
            loHi[0] = 0;
            size = 1;
        }

        featureData[i].booleanFeature = true;
        for (unsigned int j = 0; j < featureDatum.presentCount && featureData[i].booleanFeature; ++j) {
            float value = feature[j].value;
            switch (size) {
                case 0:
                    loHi[0] = value;
                    size = 1;
                    break;
                case 1:
                    if (loHi[0] != value) {
                        size = 2;
                        if (loHi[0] < value)
                            loHi[1] = value;
                        else if (loHi[0] > value) {
                            loHi[1] = loHi[0];
                            loHi[0] = value;
                        }
                    }
                    break;
                case 2:
                    if (loHi[0] != value && loHi[1] != value)
                        featureData[i].booleanFeature = false;
            }
        }
        if (featureData[i].booleanFeature)
            featureData[i].booleanHi = loHi[1];
    }
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        qsort(featureData[i].presentIDs, featureData[i].presentCount, sizeof(Feature), cmpFeaturesByValue);
        if (featureData[i].booleanFeature) {
            for (unsigned int j = 0; j < featureData[i].presentCount; ++j) {
                if (featureData[i].presentIDs[j].value >= featureData[i].booleanHi) {
                    featureData[i].booleanRightOffset = j;
                    break;
                }
            }
        }
    }

    return featureData;
}

typedef struct TrainingAndTestData {
    Data trainingData;
    Data testData;
    Datum dailyDemocrat;
} TrainingAndTestData;

Data splitOffTestData(Data* data, const unsigned int testPointCount) {
    unsigned int pointCount = data->pointCount;
    unsigned int testPointRunningCount = 0;
    Datum* testPoints = malloc(testPointCount * sizeof(Datum));
    unsigned int* testPartitionedIndices = malloc(testPointCount * sizeof(unsigned int));
    bool* testSeenFeatures = malloc(testPointCount * sizeof(bool));
    unsigned int i = -1;
    unsigned int trainingPointsLo = 0;
    while (testPointRunningCount < testPointCount) {
        unsigned int sample = testPointCount - testPointRunningCount;
        unsigned int population = data->pointCount - (i + 1);
        unsigned int gap = randomGap(sample, population);
        i += gap + 1;
        testPoints[testPointRunningCount++] = data->points[i];
        data->points[i] = data->points[trainingPointsLo++];
    }
    data->pointCount -= trainingPointsLo;
    data->points += trainingPointsLo;
    Data testData = {
        data->featureCount,
        testPointCount,
        testPoints,
        testPartitionedIndices,
        0,
        testSeenFeatures
    };
    data->featureData = trainingDataToFeatureData(*data);

    return testData;
}

TrainingAndTestData readTrainingData(
    FILE* file,
    long double trainingDataRatio
) {
    unsigned char* intBytes = malloc(sizeof(unsigned int));
    const unsigned int featureCount = readUInt(file);
    const unsigned int dataPointCount = readUInt(file);
    Datum* trainingPoints = malloc(dataPointCount * sizeof(Datum));
    const unsigned int trainingPointCount = (unsigned int) (dataPointCount * trainingDataRatio);
    const unsigned int testPointCount = dataPointCount - trainingPointCount;
    const long double startWeight = ((long double) 1) / ((long double) trainingPointCount);
    for (unsigned int i = 0; i < dataPointCount; ++i) {
        char class = readChar(file);
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
        }
        trainingPoints[i].features = features;
        trainingPoints[i].weight = startWeight;
    }
    unsigned int* partitionedIndices = malloc(dataPointCount * sizeof(unsigned int));
    for (unsigned int i = 0; i < dataPointCount; ++i)
        partitionedIndices[i] = i;
    bool* seenFeature = malloc(featureCount * sizeof(bool));
    for (unsigned int i = 0; i < featureCount; ++i) seenFeature[i] = false;
    Data trainingData = {
        featureCount,
        dataPointCount,
        trainingPoints,
        partitionedIndices,
        0,
        seenFeature
    };
    trainingData.featureData = trainingDataToFeatureData(trainingData);
    Datum dailyDemocrat = trainingData.points[1786];
    Data testData = splitOffTestData(&trainingData, testPointCount);
    TrainingAndTestData data = { trainingData, testData, dailyDemocrat };

    return data;
}

void printDecisionTreeAtIndex(
    DecisionTree decisionTree,
    unsigned int parent,
    unsigned int depth
) {
    if (parent >= decisionTree.nodeCount) return;
    DecisionTreeNode node = decisionTree.nodes[parent];
    for (unsigned int i = 0; i < depth; ++i) printf("|");
    printf("f: %u || pivot: %f || l: %d || r: %d || t: %d\n", node.feature.id, node.feature.value, node.left, node.right, node.type);
    switch (node.type) {
        case BOTH_LEAF:
            break;
        case NON_LEAF:
            printDecisionTreeAtIndex(decisionTree, node.left, depth + 1);
            printDecisionTreeAtIndex(decisionTree, node.right, depth + 1);
            break;
        case LEFT_LEAF:
            printDecisionTreeAtIndex(decisionTree, node.right, depth + 1);
            break;
        case RIGHT_LEAF:
            printDecisionTreeAtIndex(decisionTree, node.left, depth + 1);
            break;
    }
}

void printDecisionTreeJSONAtIndex(
    DecisionTree decisionTree,
    unsigned int parent,
    unsigned int depth
) {
    if (parent >= decisionTree.nodeCount) return;
    DecisionTreeNode node = decisionTree.nodes[parent];
    switch (node.type) {
        case BOTH_LEAF:
            printf("[%u,%f,%d,%d]", node.feature.id, node.feature.value, node.left, node.right);
            break;
        case NON_LEAF:
            printf("[%u,%f,", node.feature.id, node.feature.value);
            printDecisionTreeJSONAtIndex(decisionTree, node.left, depth + 1);
            printf(",");
            printDecisionTreeJSONAtIndex(decisionTree, node.right, depth + 1);
            printf("]");
            break;
        case LEFT_LEAF:
            printf("[%u,%f,%d,", node.feature.id, node.feature.value, node.left);
            printDecisionTreeJSONAtIndex(decisionTree, node.right, depth + 1);
            printf("]");
            break;
        case RIGHT_LEAF:
            printf("[%u,%f,", node.feature.id, node.feature.value);
            printDecisionTreeJSONAtIndex(decisionTree, node.left, depth + 1);
            printf(",%d]", node.right);
            break;
    }
}

void printDecisionTree(DecisionTree decisionTree) {
    printDecisionTreeAtIndex(decisionTree, 0, 0);
}

void printDecisionTreeJSON(DecisionTree decisionTree) {
    printDecisionTreeJSONAtIndex(decisionTree, 0, 0);
}

void printDecisionForestJSON(DecisionForest decisionForest) {
    printf("{");
    printf("\"decisionThreshold\":");
    printf("%Lf,", decisionForest.decisionThreshold);
    printf("\"weights\":[");
    for (unsigned int i = 0; i < decisionForest.treeCount; ++i) {
        if (i != 0) printf(",");
        printf("%Lf", decisionForest.weights[i]);
    }
    printf("],\"trees\":[");
    for (unsigned int i = 0; i < decisionForest.treeCount; ++i) {
        if (i != 0) printf(",");
        printDecisionTreeJSON(decisionForest.trees[i]);
    }
    printf("]}");
    printf("\n");
}

#define MAX_NODE 1 << 19
void buildTree(
    Data trainingData,
    unsigned int lo,
    unsigned int hi,
    long double weight,
    long double negative,
    unsigned int maxDepth,
    const long double randomFeatureSampleRatio,
    DecisionTree* decisionTree,
    unsigned int parent,
    bool leftBranch
) {
    if (maxDepth == 0 || decisionTree->nodeCount >= MAX_NODE) {
        //printf("(%s)\n", leftBranch ? "LEFT" : "RIGHT");
        long double sign = 0;
        for (unsigned int i = lo; i < hi; ++i) {
            Datum point = trainingData.points[trainingData.partitionedIndices[i]];
            sign += point.weight * point.class;
        }
        int class = sign < 0 ? -1 : 1;
        bool shallIContinue;
        int child = -1;
        do {
            shallIContinue = false;
            DecisionTreeNode* parentNode = decisionTree->nodes + parent;
            switch (parentNode->type) {
                case NON_LEAF:
                    if (child == -1) {
                        if (leftBranch) {
                            parentNode->left = class;
                            parentNode->type = LEFT_LEAF;
                        } else {
                            parentNode->right = class;
                            parentNode->type = RIGHT_LEAF;
                        }
                    } else if (parentNode->left == child) {
                        parentNode->left = class;
                        parentNode->type = LEFT_LEAF;
                    } else {
                        parentNode->right = class;
                        parentNode->type = RIGHT_LEAF;
                    }
                    break;
                case LEFT_LEAF:
                    if (parentNode->left == class && parentNode->parent != -1) {
                        child = parent;
                        parent = parentNode->parent;
                        shallIContinue = true;
                    } else {
                        parentNode->right = class;
                        parentNode->type = BOTH_LEAF;
                    }
                    break;
                case RIGHT_LEAF:
                    if (parentNode->right == class && parentNode->parent != -1) {
                        child = parent;
                        parent = parentNode->parent;
                        shallIContinue = true;
                    } else {
                        parentNode->left = class;
                        parentNode->type = BOTH_LEAF;
                    }
                    break;
            }
        } while (shallIContinue);
    } else {
        Split split = bestSplit(
            &trainingData, lo, hi, weight, negative, randomFeatureSampleRatio);
        //for (int i = 0; i < maxDepth; ++i) {
            //printf("-");
        //}
        //printf("%u %f (%s)\n", split.feature.id, split.feature.value, leftBranch ? "LEFT" : "RIGHT");
        NodeType type;
        unsigned int index = decisionTree->nodeCount;
        decisionTree->nodes[index].feature = split.feature;
        decisionTree->nodes[index].parent = parent;
        if (split.leftClass == 0 && split.rightClass == 0) {
            type = NON_LEAF;
            decisionTree->nodes[index].left = 0;
            decisionTree->nodes[index].right = 0;
        } else if (split.leftClass != 0 && split.rightClass == 0) {
            type = LEFT_LEAF;
            decisionTree->nodes[index].left = split.leftClass;
        } else if (split.leftClass == 0 && split.rightClass != 0) {
            type = RIGHT_LEAF;
            decisionTree->nodes[index].right = split.rightClass;
        } else {
            type = BOTH_LEAF;
            decisionTree->nodes[index].left = split.leftClass;
            decisionTree->nodes[index].right = split.rightClass;
        }
        decisionTree->nodes[index].type = type;
        ++decisionTree->nodeCount;
        if (parent != -1) {
            if (leftBranch) {
                decisionTree->nodes[parent].left = index;
            } else {
                decisionTree->nodes[parent].right = index;
            }
        }
        unsigned int nextDepth = maxDepth - 1;
        if (split.leftClass == 0) {
            long double leftWeight = weight - split.rightWeight;
            buildTree(
                trainingData,
                lo,
                split.right,
                weight - split.rightWeight,
                split.leftNegative,
                nextDepth,
                randomFeatureSampleRatio,
                decisionTree,
                index,
                true
            );
        }
        if (split.rightClass == 0) {
            buildTree(
                trainingData,
                split.right,
                hi,
                split.rightWeight,
                split.rightNegative,
                nextDepth,
                randomFeatureSampleRatio,
                decisionTree,
                index,
                false
            );
        }
    }
}

int decisionTreeClassify(
    DecisionTree decisionTree,
    unsigned int featureCount,
    Feature* features
) {
    DecisionTreeNode node = decisionTree.nodes[0];
    do {
        unsigned int* term = &node.feature.id;
        BinarySearchResult result = binarySearch(features, 0, featureCount, sizeof(Feature), term, cmpFeaturesWithID, true);
        float value = result.found ? features[result.index].value : 0;
        if (value < node.feature.value) {
            switch (node.type) {
                case BOTH_LEAF:
                case LEFT_LEAF:
                    return node.left;
                case RIGHT_LEAF:
                case NON_LEAF:
                    node = decisionTree.nodes[node.left];
            }
        } else {
            switch (node.type) {
                case BOTH_LEAF:
                case RIGHT_LEAF:
                    return node.right;
                case LEFT_LEAF:
                case NON_LEAF:
                    node = decisionTree.nodes[node.right];
                    break;
            }
        }
    } while (true);
}

long double decisionForestFuzzyClassify(
    DecisionForest decisionForest,
    unsigned int featureCount,
    Feature* features
) {
    long double positive = 0;
    long double total = 0;
    for (unsigned int i = 0; i < decisionForest.treeCount; ++i) {
        long double weight = decisionForest.weights[i];
        int class = decisionTreeClassify(decisionForest.trees[i], featureCount, features);
        positive += ((class + 1) * weight) / 2;
        total += weight;
    }
    long double p = positive / total;

    return p;
}

int decisionForestClassify(
    DecisionForest forest,
    unsigned int featureCount,
    Feature* features
) {
    return decisionForestFuzzyClassify(forest, featureCount, features) < forest.decisionThreshold ? -1 : 1;
}

long double calculateWeightedError(
    Data* trainingDataPtr,
    DecisionTree decisionTree
) {
    long double epsilon = 0;
    Datum* points = trainingDataPtr->points;
    for (unsigned int i = trainingDataPtr->pointCount - 1; i != -1; --i) {
        Datum point = points[i];
        int actual = point.class;
        long double weight = point.weight;
        int expected = decisionTreeClassify(decisionTree, point.featureCount, point.features);
        if (actual != expected) {
            epsilon += weight;
        }
    }

    return epsilon;
}

typedef struct Performance {
    unsigned int FN;
    unsigned int FP;
    unsigned int TN;
    unsigned int TP;
} Performance;

const Performance forestPerformance(
    Data* trainingDataPtr,
    DecisionForest decisionForest
) {
    Datum* points = trainingDataPtr->points;
    unsigned int FN = 0;
    unsigned int FP = 0;
    unsigned int TN = 0;
    unsigned int TP = 0;
    for (unsigned int i = trainingDataPtr->pointCount - 1; i != -1; --i) {
        Datum point = points[i];
        int actual = point.class;
        int expected = decisionForestClassify(decisionForest, point.featureCount, point.features);
        if (actual == -1 && expected == -1) ++TN;
        if (actual == -1 && expected == 1) ++FP;
        if (actual == 1 && expected == -1) ++FN;
        if (actual == 1 && expected == 1) ++TP;
    }
    const Performance performance = { FN, FP, TN, TP };

    return performance;
}
void printFuzzyForestPerformance(
    Data* trainingDataPtr,
    DecisionForest decisionForest
) {
    Datum* points = trainingDataPtr->points;
    for (unsigned int i = trainingDataPtr->pointCount - 1; i != -1; --i) {
        Datum point = points[i];
        int actual = point.class;
        long double fuzzyClass = decisionForestFuzzyClassify(decisionForest, point.featureCount, point.features);
        printf("%Lf,%d,%u\n", fuzzyClass, actual, decisionForest.treeCount);
    }
}

typedef struct FuzzyResult {
    long double p;
    char class;
} FuzzyResult;

int cmpFuzzyResults(const void* a, const void* b) {
    const FuzzyResult frA = *(const FuzzyResult*) a;
    const FuzzyResult frB = *(const FuzzyResult*) b;

    if (frA.p < frB.p) return -1;
    if (frA.p > frB.p) return +1;
    return 0;
}

/*
 * Returns the optimal threshold used by the classifier.
 * This is the threshold that would produce the highest F1
 * score.
 *          Precision x Recall
 * F1 = 2 x ------------------
 *          Precision + Recall
 * 
 * Where:
 * 
 * Precision = TP / (TP + FP)
 * Recall = TP / (TP + FN)
 * 
 * I.O.W.
 * 
 * F1 = 2(TP) / [2(TP) + FN + FP]
 */
long double optimalDecisionThreshold(
    DecisionForest decisionForest,
    Data testData,
    FuzzyResult* space
) {
    // Total
    unsigned int T = testData.pointCount;
    // Positives
    unsigned int P = 0;
    for (unsigned int i = 0; i < T; ++i) {
        Datum testDataPoint = testData.points[i];
        long double p =
            decisionForestFuzzyClassify(decisionForest, testDataPoint.featureCount, testDataPoint.features);
        FuzzyResult fuzzyResult = { p, testDataPoint.class };
        if (testDataPoint.class == 1) ++P;
        space[i] = fuzzyResult;
    }
    // Negatives
    unsigned int N = T - P;
    qsort(space, T, sizeof(FuzzyResult), cmpFuzzyResults);
    unsigned int TP = P;
    unsigned int FP = N;
    unsigned int TN = 0;
    unsigned int FN = 0;
    long double maxF1 = 0;
    long double bestCutoff = 0;
    for (unsigned int i = 0; i < T; ++i) {
        FuzzyResult fuzzyResult = space[i];
        if (fuzzyResult.class == 1) {
            --TP;
            ++FN;
        } else {
            ++TN;
            --FP;
        }
        long double F1 = (long double) (2 * TP) / (2 * TP + FN + FP);
        if (F1 > maxF1) {
            maxF1 = F1;
            bestCutoff = fuzzyResult.p;
        }
    }

    return bestCutoff;
}

void updateWeights(
    Data* trainingDataPtr,
    DecisionTree decisionTree,
    long double epsilon,
    long double alpha
) {
    Datum* points = trainingDataPtr->points;
    for (unsigned int i = trainingDataPtr->pointCount - 1; i != -1; --i) {
        Datum point = points[i];
        long double weight = point.weight;
        int actual = point.class;
        int expected = decisionTreeClassify(decisionTree, point.featureCount, point.features);
        int pow = actual * expected;
        long double numer = weight * expl(-alpha * pow);
        long double denom = 2 * sqrtl(epsilon * (1 - epsilon));
        points[i].weight = numer / denom;
    }
}

long double calculateAlpha(long double epsilon) {
    return logl((1 - epsilon) / epsilon) / 2;
}

int main(int argc, char* argv[]) {
    int opt; 
    char* inputFileName = argv[1];
    unsigned int treeDepth = 1;
    unsigned int treeCount = 10000;
    long double trainingDataRatio = 0.8;
    long double randomFeatureSampleRatio = 1;
    bool adaBoost = false;
    // Seed the random number generator.
    srand(time(NULL));
    while((opt = getopt(argc, argv, "i:d:t:s:r:a")) != -1) {
        switch(opt) {
            case 'r':
                randomFeatureSampleRatio = strtold(optarg, NULL);
                break;
            case 'a':
                adaBoost = true;
                break;
            case 'i':
                inputFileName = optarg;
                break;
            case 'd':
                treeDepth = (unsigned int) strtoul(optarg, NULL, 0);
                break;
            case 't':
                treeCount = (unsigned int) strtoul(optarg, NULL, 0);
                break;
            case 's':
                trainingDataRatio = strtold(optarg, NULL);
                break;
            case ':':
                printf("option needs a value\n");
                break;
            case '?':
                printf("unknown option: %c\n", optopt);
                break;
        }
    }
    FILE *inputFile = fopen(inputFileName, "r");
    TrainingAndTestData data = readTrainingData(inputFile, trainingDataRatio);
    Data trainingData = data.trainingData;
    Data testData = data.testData;
    fprintf(stderr, "                \e[31mFile\e[97m: %s\n", inputFileName);
    fprintf(stderr, "            \e[32mFeatures\e[97m: %u\n", data.trainingData.featureCount);
    fprintf(stderr, "\e[33mTraining data points\e[97m: %u\n", trainingData.pointCount);
    fprintf(stderr, "    \e[33mTest data points\e[97m: %u\n", testData.pointCount);
    fprintf(stderr, "          \e[34mTree depth\e[97m: %u\n", treeDepth);
    fprintf(stderr, "          \e[35mTree count\e[97m: %u\n", treeCount);
    DecisionTree* trees = malloc(treeCount * sizeof(DecisionTree));
    DecisionForest forest;
    forest.weights = malloc(treeCount * sizeof(long double));
    forest.trees = trees;
    forest.treeCount = 0;
    // Training data performance metrics.
    Performance tr;
    tr.FP = 1;
    tr.FN = 1;
    unsigned int maxNodes = treeDepth <= 18 ? (1 << treeDepth) : MAX_NODE;
    //fprintf(stderr, "i,trainingFN,trainingFP,trainingTN,trainingTP,testFN,testFP,testTN,testTP\n");
    //printf("p,class,trees\n");
    // Used when finding optimal decision thresholds.
    FuzzyResult* fuzzyResultSpace = malloc(testData.pointCount * sizeof(FuzzyResult));
    clock_t begin = clock();
    for (unsigned int i = 0; i < treeCount; ++i) {
        long double negative = 0;
        for (unsigned int i = trainingData.pointCount - 1; i != -1; --i) {
            Datum point = trainingData.points[trainingData.partitionedIndices[i]];
            if (point.class == -1) negative += point.weight;
        }
        trees[i].nodeCount = 0;
        trees[i].nodes = malloc(maxNodes * sizeof(DecisionTreeNode));
        buildTree(
            trainingData,
            0,
            trainingData.pointCount,
            1,
            negative,
            treeDepth,
            randomFeatureSampleRatio,
            trees + i,
            -1,
            false
        );
        //printDecisionTree(forest.trees[i]);
        if (adaBoost) {
            long double epsilon = calculateWeightedError(&trainingData, trees[i]);
            if (!epsilon) break;
            long double alpha = calculateAlpha(epsilon);
            forest.weights[i] = alpha;
            updateWeights(&trainingData, trees[i], epsilon, alpha);
        } else {
            forest.weights[i] = 1;
        }
        ++forest.treeCount;
        /*{
            forest.decisionThreshold = optimalDecisionThreshold(forest, testData, fuzzyResultSpace);
            fprintf(stderr, "\n");
            //tr = forestPerformance(&trainingData, forest);
            // Test data performance metrics.
            Performance te = forestPerformance(&testData, forest);
            printf("%u,%Lf,%Lf\n",
                i + 1,
                //(long double) tr.TP / (tr.TP + tr.FP),
                //(long double) tr.TP / (tr.TP + tr.FN),
                (long double) te.TP / (te.TP + te.FP),
                (long double) te.TP / (te.TP + te.FN));
        }*/
        for (unsigned int i = trainingData.pointCount - 1; i != -1; --i)
            trainingData.partitionedIndices[i] = i;
        clock_t current = clock();
        double timeSpent = (double) (current - begin) / CLOCKS_PER_SEC;
        float completed = (float) (i + 1) / treeCount;
        double end = timeSpent / completed;
        fprintf(stderr, "\r                 \r%3.1f%% (%.1fs of %.1fs)", completed * 100, timeSpent, end);
        //printFuzzyForestPerformance(&testData, forest);
    }
    forest.decisionThreshold = optimalDecisionThreshold(forest, testData, fuzzyResultSpace);
    fprintf(stderr, "\n");
    tr = forestPerformance(&trainingData, forest);
    // Test data performance metrics.
    Performance te = forestPerformance(&testData, forest);
    //printf("%u,%u,%u,%u,%u,%u,%u,%u,%u\n", i, tr.FN, tr.FP, tr.TN, tr.TP, te.FN, te.FP, te.TN, te.TP);
    fprintf(stderr, "Tr Precision: %Lf | Recall: %Lf\n",
        (long double) tr.TP / (tr.TP + tr.FP), (long double) tr.TP / (tr.TP + tr.FN));
    fprintf(stderr, "Te Precision: %Lf | Recall: %Lf\n",
        (long double) te.TP / (te.TP + te.FP), (long double) te.TP / (te.TP + te.FN));
    printDecisionForestJSON(forest);

    return 0;
}