from math import sqrt, floor, log, ceil
import matplotlib.pyplot as plt
from random import random, sample
from numpy import linspace
# Population
N = 1984
# Sample
n = floor(sqrt(N))
def normalisedGapFrequency(gap, sample, population):
    return (1 - sample / population) ** gap
def pGapBasis(probability, sample, population):
    if sample == population: return 0
    else: return log(probability, 1 - sample / population)
def pGap(probability, sample, population):
    if sample == population: return 0
    aboveMaxGap = population - sample + 1
    pAboveMaxGap = normalisedGapFrequency(aboveMaxGap, sample, population)
    correction = -pGapBasis(1 + pAboveMaxGap, sample, population)
    yScale = aboveMaxGap / (aboveMaxGap + correction)
    xShiftedP = pGapBasis(probability + pAboveMaxGap, sample, population)
    originIntercept = xShiftedP - aboveMaxGap
    yScaledP = originIntercept * yScale
    originalIntercept = yScaledP + aboveMaxGap
    return floor(originalIntercept)
x, y = zip(*[(p, pGapBasis(p, n, N)) for p in linspace(0, 1, 10000) if p != 0])
plt.plot(x, y)
x, y = zip(*[(p, pGap(p, n, N)) for p in linspace(0, 1, 10000) if p != 0])
plt.plot(x, y)
plt.show()
#exit()
i = -1
selection = []
y = 0
while i < N and len(selection) < n:
    p = random()
    gap = pGap(p, n - len(selection), N - (i + 1))
    i += gap + 1
    selection.append((i, y))
    y += 1
x, y = zip(*selection)
plt.plot(x, y, "ro")
rand = sorted(sample([i for i in range(N)], n))
y, x = zip(*enumerate([s for s in rand]))
plt.plot(x, y, "bo")
plt.show()
