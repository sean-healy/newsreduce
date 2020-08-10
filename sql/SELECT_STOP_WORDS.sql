select w.id, w.value, wf.frequency from WordFrequency wf inner join Word w on w.id = wf.word order by frequency desc limit 48;
