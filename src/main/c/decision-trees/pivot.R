cutoffPerformance <- function(data, cutoff) {
    negative <- data[data$p < cutoff,]
    positive <- data[data$p >= cutoff,]
    FN <- nrow(negative[negative$class == 1,])
    TN <- nrow(negative[negative$class == -1,])
    FP <- nrow(positive[positive$class == -1,])
    TP <- nrow(positive[positive$class == 1,])
    if (FP == 0) {
        precision <- 1
    } else {
        precision <- TP / (TP + FP)
    }
    recall <- TP / (TP + FN)
    f1 <- 2 * (precision * recall) / (precision + recall)

    return(c(precision, recall, f1))
}
print("Reading data.")
data <- read.csv("/tmp/data")
print(nrow(data))
treesF1 <- 0
treesPr <- 0
treesRe <- 0
trees <- sort(unique(data$trees))
k <- 1
for (tree in trees) {
    treeData <- data[data$trees == tree, ]
    pr <- 0
    re <- 0
    f1 <- 0
    j <- 1
    gap <- 1 / 100
    steps <- seq(0, 1, gap)
    maxF1 <- -1
    maxF1Index <- -1
    for (i in steps) {
        perf <- cutoffPerformance(treeData, i)
        if (perf[[3]] > maxF1) {
            maxF1 <- perf[[3]]
            maxF1Index <- j
        }
        pr[j] <- perf[[1]]
        re[j] <- perf[[2]]
        f1[j] <- perf[[3]]
        j <- j + 1
    }
    treesF1[k] = f1[maxF1Index]
    treesPr[k] = pr[maxF1Index]
    treesRe[k] = re[maxF1Index]
    print(k)
    k <- k + 1
}
data <- data[data$trees == max(data$trees) - 500, ]
mid <- 0.5
pr <- 0
re <- 0
f1 <- 0
j <- 1
gap <- 1 / 100
steps <- seq(0, 1, gap)
for (i in steps) {
    perf <- cutoffPerformance(data, i)
    pr[j] <- perf[[1]]
    re[j] <- perf[[2]]
    f1[j] <- perf[[3]]
    j <- j + 1
}
fuzzy_classes <- 0
j <- 1
for (p in steps) {
    window <- dnorm(data$p, p, sd=gap)
    totalWeight <- sum(data$p * window)
    positiveWeight <- sum(((data$class + 1) / 2) * data$p * window)
    c <- nrow(positive) / nrow(slice)
    fuzzy_classes[j] <- positiveWeight / totalWeight
    j <- j + 1
}
cutoffs <- data.frame(
    cutoff=steps,
    precision=pr,
    recall=re,
    f1=f1,
    fuzzy_classes=fuzzy_classes
)
data$Class <- as.factor(data$class)

g <- ggplot() +
    geom_point(data=data, aes(x=p, y=mid, colour=Class), position=position_jitter(width=0, height=mid), size=1.5) +
    geom_line(data=cutoffs, aes(x=cutoff, y=f1), color="red", text="F1") +
    geom_line(data=cutoffs, arrow=arrow(length=unit(3, "mm")), aes(x=cutoff, y=precision), colour="black", text="Precision") +
    geom_line(data=cutoffs, arrow=arrow(length=unit(3, "mm")), aes(x=cutoff, y=recall), colour="black", text="Recall") +
    scale_y_continuous(breaks=seq(0, 1, by=0.1)) + xlab("Decision threshold") + ylab("Performance metric")

ggplot() +
    geom_point(aes(x=trees, y=treesF1), colour="red") +
    geom_point(aes(x=trees, y=treesPr), colour="green") +
    geom_point(aes(x=trees, y=treesRe), colour="blue")
