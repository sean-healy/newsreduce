#include <stdio.h>
#include <stdlib.h>

unsigned long long bytesToNumber(unsigned int bytesc, unsigned char* bytesv) {
  unsigned long long number = 0;
  for (unsigned int i = 0; i < bytesc; ++i) {
    unsigned long long byte = (unsigned long long) bytesv[i];
    number = (number << 8) | byte;
  }
  
  return number;
}

int main(unsigned int argc, char *argv[])  {
  unsigned int resourceLocalIDBytes = atoi(argv[1]);
  unsigned int linkCountBytes       = atoi(argv[2]);
  unsigned long long resourceCount  = atoll(argv[3]);
  char *linksFilePath               = argv[4];
  unsigned int mem = sizeof(double) * resourceCount;
  double *prevRanks = malloc(mem);
  double *nextRanks = malloc(mem);
  for (int resource = 0; resource < resourceCount; ++resource) {
    prevRanks[resource] = 1;
    nextRanks[resource] = 0;
  }
  unsigned char linkCountBuffer[linkCountBytes];
  unsigned char resourceLocalIDBuffer[resourceLocalIDBytes];
  double BASE;
  BASE = 0.76732184498;
  BASE = 0;
  //BASE = 1;
  int ROUNDS = 82.5;
  double prevLoss = 0;
  double prevSpee = 0;
  FILE *linksFile = fopen(linksFilePath, "r");
  for (int i = 0; i < ROUNDS; ++i) {
    fseek(linksFile, 0, SEEK_SET);
    unsigned long long previousParent = -1;
    while (fread(resourceLocalIDBuffer, sizeof(char), resourceLocalIDBytes, linksFile)) {
      unsigned long long parent = bytesToNumber(resourceLocalIDBytes, resourceLocalIDBuffer);
      double prevRank = prevRanks[parent];
      int result = fread(linkCountBuffer, sizeof(char), linkCountBytes, linksFile);
      unsigned long long linkCount = bytesToNumber(linkCountBytes, linkCountBuffer);
      double prevRankPiece = prevRank / linkCount;
      for (unsigned long long i = 0; i < linkCount; ++i) {
	int result = fread(resourceLocalIDBuffer, sizeof(char), resourceLocalIDBytes, linksFile);
	unsigned long long child = bytesToNumber(resourceLocalIDBytes, resourceLocalIDBuffer);
	nextRanks[child] += prevRankPiece;
      }
      previousParent = parent;
    }
    double loss = 0;
    for (int resource = 0; resource < resourceCount; ++resource) {
      double signedDifference = prevRanks[resource] - nextRanks[resource];
      if (signedDifference < 0)
	loss -= signedDifference;
      else
	loss += signedDifference;
    }
    double sum = 0; for (int i = 0; i < resourceCount; ++i)
	sum += prevRanks[i];
    double speed = loss - prevLoss;
    prevLoss = loss;
    prevSpee = speed;
    for (int resource = 0; resource < resourceCount; ++resource)
      prevRanks[resource] = BASE;
    double *tmpRanks = prevRanks;
    prevRanks = nextRanks;
    nextRanks = tmpRanks;
  }
  fclose(linksFile);
  char *chars = (char*) prevRanks;
  for (int i = 0; i < mem; ++i)
    putc(chars[i], stdout);
}
