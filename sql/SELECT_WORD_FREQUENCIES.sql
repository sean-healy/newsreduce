select word, frequency / (select sum(frequency) from WordFrequency) frequency from WordFrequency where word in ?;
