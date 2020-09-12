library("ggplot2")
data <- read.csv("/tmp/data")
data$depth <- as.factor(data$depth)
means <- aggregate(
    data.frame(Precision=data$pr, Recall=data$re),
    by=list(Trees=data$i, Depth=data$depth, Method=data$method),
    FUN=mean
)
print(means)
means <- means[means$Trees <= 500,]
means$F1 <- 2 * ((means$Precision * means$Recall) / (means$Precision + means$Recall))
g <- ggplot(data=means, aes(x=Trees, group=Depth, color=Depth, linetype=Method)) +
    #geom_line(aes(y=Precision), colour="red") +
    #geom_line(aes(y=Recall), colour="blue") +
    geom_line(aes(y=F1), size=2) +
    scale_y_continuous(breaks=seq(0, 1, by=0.05))
