#!/usr/bin/env Rscript
data <- read.csv(file = '/home/sean/newsreduce/experiments/word-freq.csv');
ref <- data[data$group=="reference",]
ref$freq <- ref$count / sum(ref$count)
cla <- data[data$group=="class",]
cla$freq <- cla$count / sum(cla$count)
Rank <- log(ref$rank)
Frequency <- ref$freq
plot(Rank, Frequency, pch=".");
points(log(cla$rank), cla$freq, col="red", pch=".");
cla$freq <- pmax(ref$freq, cla$freq)
IG <- cla$freq - ref$freq
plot(Rank, IG, pch=".")
cla$ig <- IG
features <- cla[order(cla$ig, decreasing = TRUE),]
print(features[1:20,])
#plot(cla$rank, cla$ig, pch="#")
#text(x=cla$rank, y=cla$ig, labels=cla$id)
