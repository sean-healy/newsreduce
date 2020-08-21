#include "../common.c"

unsigned long long bytesToNumber(unsigned int bytesc, unsigned char* bytesv) {
  unsigned long long number = 0;
  for (unsigned int i = 0; i < bytesc; ++i) {
    unsigned long long byte = (unsigned long long) bytesv[i];
    number = (number << 8) | byte;
  }
  
  return number;
}


long int binarySearch(EntityID* array, EntityID term, long int lo, long int hi) {
  while (lo < hi) {
    long int mid = lo + (hi - lo >> 1);
    EntityID current = array[mid];
    long long diff = cmpEntity(current, term);
    if (diff > 0) hi = mid;
    else if (diff < 0) lo = mid + 1;
    else return mid;
  }

  return -lo - 1;
}

typedef struct LinkStruct {
  unsigned long int parent;
  unsigned long int child;
} Link;

int cmpLink(void* a, void* b) {
  Link aLink = *((Link*) a);
  Link bLink = *((Link*) b);
  int cmp;
  if (aLink.parent < bLink.parent) cmp = -1;
  else if (aLink.parent > bLink.parent) cmp = +1;
  else if (aLink.child < bLink.child) cmp = -1;
  else if (aLink.child > bLink.child) cmp = +1;
  else cmp = 0;

  return cmp;
}

int main(unsigned int argc, char *argv[])  {
  char *resourcesFilePath = argv[1];
  char *linksFilePath     = argv[2];
  FILE *resourcesFile = fopen(resourcesFilePath, "r");
  struct stat st;
  stat(resourcesFilePath, &st);
  long int resourceCount = st.st_size / 12;
  unsigned char idBuffer[BYTES_PER_ID];
  EntityID* resources =
    (EntityID*) malloc(sizeof(EntityID) * resourceCount);
  unsigned long int* childCounts =
    (unsigned long int*) malloc(sizeof(long int) * resourceCount);
  for (unsigned long int i = 0; i < resourceCount; ++i)
    childCounts[i] = 0;
  long int i = 0;
  while (fread(idBuffer, BYTES_PER_ID, 1, resourcesFile)) {
    EntityID id = idBufferToStruct(idBuffer);
    resources[i++] = id;
  }
  FILE *linksFile = fopen(linksFilePath, "r");
  stat(linksFilePath, &st);
  long int linkCount = st.st_size / 24;
  fprintf(stderr, "Resources: %ld\n", resourceCount);
  unsigned long int* links =
    (unsigned long int*) malloc(linkCount * sizeof(unsigned long int));
  unsigned long int linkI = 0;
  long int parentI = -1;
  unsigned long int lo = 0;
  unsigned long int currentLinkCount = 0;
  while (fread(idBuffer, BYTES_PER_ID, 1, linksFile)) {
    EntityID parent = idBufferToStruct(idBuffer);
    int ret = fread(idBuffer, BYTES_PER_ID, 1, linksFile);
    EntityID child = idBufferToStruct(idBuffer);
    long int prevParentI = parentI;
    while (cmpEntity(resources[parentI], parent) < 0) {
      ++parentI;
    }
    if (prevParentI == parentI) {
      ++currentLinkCount;
    } else {
      lo = 0;
      if (prevParentI >= 0) childCounts[prevParentI] = currentLinkCount;
      currentLinkCount = 1;
    }
    long int childI = binarySearch(resources, child, lo, resourceCount);
    lo = (unsigned long int) childI;
    links[linkI++] = childI;
  }
  unsigned int mem = sizeof(long double) * resourceCount;
  long double *prevRanks = malloc(mem);
  long double *nextRanks = malloc(mem);
  for (int i = 0; i < resourceCount; ++i)
    prevRanks[i] = 1;
  int ROUNDS = 82.5;
  long double loss = 1.0;
  long double cloutFactor = 1.0;
  long double damping = 0.5 / ROUNDS;
  damping = 0;
  for (int i = 0; loss > 0.000001 && i < ROUNDS; ++i) {
    for (int resource = 0; resource < resourceCount; ++resource)
      nextRanks[resource] = 0;
    long double redistribute = 0.0;
    unsigned long int linkI = 0;
    for (int parent = 0; parent < resourceCount; ++parent) {
      long double parentRank = prevRanks[parent];
      unsigned long int childCount = childCounts[parent];
      if (childCount) {
        long double pieceOfClout = parentRank / childCount;
        long double forwardP = pieceOfClout * cloutFactor;
        for (unsigned long long i = 0; i < childCount; ++i) {
          unsigned long int child = links[linkI++];
          if (child == parent)
            redistribute += forwardP;
          else
            nextRanks[child] += forwardP;
        }
        redistribute += parentRank * (1 - cloutFactor);
      } else {
        redistribute += parentRank;
      }
    }
    for (unsigned long long i = 0; i < resourceCount; ++i)
      nextRanks[i] += redistribute / resourceCount;
    loss = 0;
    for (int resource = 0; resource < resourceCount; ++resource) {
      long double signedDifference = prevRanks[resource] - nextRanks[resource];
      if (signedDifference < 0)
        loss -= signedDifference;
      else
        loss += signedDifference;
    }
    long double sum = 0;
    for (int i = 0; i < resourceCount; ++i)
      sum += nextRanks[i];
    fprintf(stderr, "Loss: %.10Lf, sum: %Lf, redistribute: %Lf, clout f: %Lf\n", loss, sum, redistribute, cloutFactor);
    long double *tmpRanks = prevRanks;
    prevRanks = nextRanks;
    nextRanks = tmpRanks;
    cloutFactor -= damping;
  }
  free(childCounts);
  free(links);
  free(nextRanks);
  // Print results.
  for (int i = 0; i < resourceCount; ++i) {
    EntityID resource = resources[i];
    printf("\"");
    printIDDecimal(resource);
    printf("\",\"%.10Lf\"\n", prevRanks[i]);
  }
  free(resources);
  free(prevRanks);
}

