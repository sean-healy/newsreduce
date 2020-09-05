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

float giniImpurity(
    unsigned int leftNegative, unsigned int left,
    unsigned int rightNegative,
    unsigned int total
) {
    unsigned int right = total - left;
    unsigned int leftPositive = left - leftNegative;
    unsigned int rightPositive = right - rightNegative;
    float leftPurity =
        ((float) (leftNegative * leftNegative + leftPositive * leftPositive)) / ((float) (left * left));
    float rightPurity =
        ((float) (rightNegative * rightNegative + rightPositive * rightPositive)) / ((float) (right * right));
    float leftImpurity = 1 - leftPurity;
    float rightImpurity = 1 - rightPurity;

    float leftP = ((float) left) / ((float) total);
    float rightP = ((float) right) / ((float) total);

    return leftImpurity * leftP + rightImpurity * rightP;
}

BinarySearchResult binarySearch(unsigned int* array, unsigned int lo, unsigned int hi, unsigned int term) {
    unsigned int left = lo;
    unsigned int right = hi - 1;
    unsigned int candidate;
    bool found = false;
    while (!found && left <= right) {
        candidate = left + (right - left >> 1);
        printf("L: %u, R: %u, M: %u\n", left, right, candidate);
        unsigned int value = array[candidate];
        printf("V: %u\n", value);
        if (value < term)
            left = candidate + 1;
        else if (value > term)
            right = candidate - 1;
        else {
            found = true;
            left = candidate;
        }
    }
    BinarySearchResult result = { found, left };

    return result;
}

Feature split(TrainingData trainingData, unsigned int lo, unsigned int hi) {
    unsigned int items = hi - lo;
    float minImpurity = 1;
    // For each feature...
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        FeatureData featureData = trainingData.featureData[i];
        unsigned int left = featureData.presentCount;
        unsigned int leftNegative = featureData.absentNegative;
        unsigned int rightNegative = featureData.presentNegative;
        float impurity = giniImpurity(leftNegative, left, rightNegative, trainingData.pointCount);
        unsigned int* itemIDPtr = featureData.presentIDs;
        float last = 0;
        // For each occurrence of the feature...
        for (unsigned int j = 0; j < featureData.presentCount; ++j) {
            unsigned int presentID = featureData.presentIDs[j].id;
            BinarySearchResult result = binarySearch(trainingData.partitionedIndices, lo, hi, presentID);
            if (result.found) {
                float value = featureData.presentIDs[j].value;
                TrainingPoint point = trainingData.points[trainingData.partitionedIndices[result.index]];
            }
        }
    }
}

FeatureData* trainingDataToFeatureData(TrainingData trainingData) {
    FeatureData* featureData = malloc(trainingData.featureCount * sizeof(FeatureData));
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        featureData[i].presentCount = 0;
        featureData[i].presentNegative = 0;
        featureData[i].absentNegative = 0;
        featureData[i].i = 0;
    }
    for (unsigned int i = 0; i < trainingData.pointCount; ++i) {
        TrainingPoint point = trainingData.points[i];
        unsigned int previousFeature = 0;
        for (unsigned int j = 0; j < point.featureCount; ++j) {
            Feature feature = point.features[j];
            if (point.class == -1) {
                ++featureData[feature.id].presentNegative;
                for (unsigned int missingFeature = previousFeature; missingFeature < feature.id; ++missingFeature)
                    ++featureData[missingFeature].absentNegative;
                previousFeature = feature.id + 1;
            }
            ++featureData[feature.id].presentCount;
        }
    }
    for (unsigned int i = 0; i < trainingData.featureCount; ++i) {
        featureData[i].presentIDs = malloc(featureData[i].presentCount * sizeof(unsigned int));
        printf("Item count: %d\n", featureData[i].presentCount);
    }
    printf("End.\n");
    for (unsigned int i = 0; i < trainingData.pointCount; ++i) {
        TrainingPoint point = trainingData.points[i];
        for (unsigned int j = 0; j < point.featureCount; ++j) {
            Feature feature = point.features[j];
            unsigned int featureID = feature.id;
            printf("Feature ID: %u\n", featureID);
            featureData[featureID].presentIDs[featureData[featureID].i] = i;
            ++featureData[featureID].i;
        }
    }

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
        printf("Class: %d\n", class);
        trainingPoints[i].class = class; 
        unsigned int trainingPointFeatureCount = readUInt(file);
        printf("Training point feature count: %u\n", trainingPointFeatureCount);
        trainingPoints[i].featureCount = trainingPointFeatureCount;
        Feature* features = malloc(trainingPointFeatureCount * sizeof(Feature));
        for (unsigned int j = 0; j < trainingPointFeatureCount; ++j) {
            unsigned int feature = readUInt(file);
            printf("Feature: %u\n", feature);
            features[j].id = feature; 
            float value = readFloat(file);
            printf("Value: %f\n", value);
            features[j].value = value; 
        }
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
    split(trainingData, 0, trainingData.pointCount);
    
    return trainingData;
}

int main(int argc, char* argv[]) {
    char* inputFileName = argv[1];
    printf("input: %s\n", inputFileName);
    FILE *inputFile = fopen(inputFileName, "r");
    TrainingData trainingData = readTrainingData(inputFile);

    return 0;
}