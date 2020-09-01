#!/usr/bin/Rscript
library(stringr)
library(ggplot2)
library(ggrepel)
library(ggConvexHull)
library(scales)
library(data.table)
library(ggforce)
options("encoding"="UTF-8")
#theme_set(theme_gray(base_size = 28, base_family="serif"))

figure <- 1
save <- function(graph, width=15) {
	i <- str_pad(paste(figure), 3, "left", "0")
	File <- paste(paste("/var/newsreduce/results/figure", i, sep="-"),
		"pdf", sep=".")
	ggsave(file=File,
		device=cairo_pdf,
		plot=graph,
		width=width,
		height=7)
	print(File)
	assign("figure", figure + 1, envir=.GlobalEnv)
}

read_utf8 <- function(file) {
	return(data.table(read.table(
		file,
		sep=",",
		header=TRUE,
		encoding="UTF-8"
	)))
}

plotMLMethodsTestOnly <- function(data) {
    data <- data[data$DataSet == "test"]
    Metric <- "Precision"
    data$DataSet <- str_to_title(data$DataSet)
    data$Precision <- data$TP / (data$TP + data$FP)
    data$Recall <- data$TP / (data$TP + data$FN)
    labelData <- data[data$N %% 20 == 1 | data$N == max(data$N)]
    graph <- ggplot(data, aes(x=N, group=sources, color=sources)) +
        geom_line(aes(y=Precision, linetype=Metric)) +
        geom_line(aes(y=Recall, linetype="Recall")) +
        ylab("Performance (%)") +
        scale_y_continuous(breaks = seq(0, 1, by = 0.1)) +
        expand_limits(x = 0, y = 0) +
        geom_text_repel(
            data=labelData,
            aes(
                y=Precision,
                label=round(Precision, digits=3),
            ),
            show.legend=FALSE
        ) +
        geom_text_repel(
            data=labelData,
            aes(
                y=Recall,
                label=round(Recall, digits=3)
            ),
            show.legend=FALSE
        )

    save(graph)
}

plotMLMethods <- function(data) {
    Metric <- "Precision"
    data$DataSet <- str_to_title(data$DataSet)
    data$Precision <- data$TP / (data$TP + data$FP)
    data$Recall <- data$TP / (data$TP + data$FN)
    labelData <- data[data$N %% 20 == 1 | data$N == max(data$N)]
    graph <- ggplot(data, aes(x=N, group=DataSet, color=DataSet)) +
        geom_line(aes(y=Precision, linetype=Metric)) +
        geom_line(aes(y=Recall, linetype="Recall")) +
        ylab("Performance (%)") +
        scale_y_continuous(breaks = seq(0, 1, by = 0.1)) +
        expand_limits(x = 0, y = 0) +
        geom_text_repel(
            data=labelData,
            aes(
                y=Precision,
                label=round(Precision, digits=3),
            ),
            show.legend=FALSE
        ) +
        geom_text_repel(
            data=labelData,
            aes(
                y=Recall,
                label=round(Recall, digits=3)
            ),
            show.legend=FALSE
        )

    save(graph)
}

plotVector <- function(data) {
    ggplot(data)
}

newsSourceWikiTaskDataDST <- "/var/newsreduce/graphs/news-source-wiki-task.csv"
all <- read_utf8(newsSourceWikiTaskDataDST)
all$sources = "All"
#plotMLMethods(newsSourceWikiTaskData)

newsSourceWikiTaskDataDST <- "/var/newsreduce/graphs/news-source-wiki-task-vectors-only.csv"
vectorsOnly <- read_utf8(newsSourceWikiTaskDataDST)
vectorsOnly$sources = "Vectors Only"


newsSourceWikiTaskDataDST <- "/var/newsreduce/graphs/news-source-wiki-task-vectors-links-only.csv"
vectorsAndLinks <- read_utf8(newsSourceWikiTaskDataDST)
vectorsAndLinks$sources = "Vectors + Links"

plotMLMethodsTestOnly(rbind(all, vectorsOnly, vectorsAndLinks))

officialHomepageTaskDST <- "/var/newsreduce/graphs/official-homepage-task.csv"
officialHomepageTask <- read_utf8(officialHomepageTaskDST)
plotMLMethods(officialHomepageTask)

d2officialHomepageTaskDST<- "/var/newsreduce/graphs/official-homepage-task-depth-2.csv"
d2officialHomepageTask <- read_utf8(d2officialHomepageTaskDST)
plotMLMethods(d2officialHomepageTask)

d3officialHomepageTaskDST<- "/var/newsreduce/graphs/official-homepage-task-depth-3.csv"
d3officialHomepageTask <- read_utf8(d3officialHomepageTaskDST)
plotMLMethods(d3officialHomepageTask)