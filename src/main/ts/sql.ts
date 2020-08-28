export default {
	// /home/sean/newsreduce/sql/BULK_INSERT.sql
	BULK_INSERT: "LOAD DATA INFILE ? IGNORE INTO TABLE ? FIELDS TERMINATED BY ',' ENCLOSED BY ''' ESCAPED BY '\\' LINES TERMINATED BY '\n' ?",
	// /home/sean/newsreduce/sql/DELETE_RESOURCE_HEADERS.sql
	DELETE_RESOURCE_HEADERS: "delete from ResourceHeader where resource = ? and header not in ?",
	// /home/sean/newsreduce/sql/DELETE_SCHEDULE.sql
	DELETE_SCHEDULE: "delete from Schedule where resource = ?",
	// /home/sean/newsreduce/sql/DELETE_WIKI_CATEGORIES_FOR_PARENTS.sql
	DELETE_WIKI_CATEGORIES_FOR_PARENTS: "delete from WikiCategory where parent = ? and child not in ?",
	// /home/sean/newsreduce/sql/SELECT_BACKLINKS_COUNT.sql
	SELECT_BACKLINKS_COUNT: "select count(distinct parent) + count(distinct child) as c from ResourceLink;",
	// /home/sean/newsreduce/sql/SELECT_BACKLINKS.sql
	SELECT_BACKLINKS: "select parent, child from ResourceLink order by parent, child;",
	// /home/sean/newsreduce/sql/SELECT_BAG_OF_WORDS_RESOURCE_HOST_PAIRS.sql
	SELECT_BAG_OF_WORDS_RESOURCE_HOST_PAIRS: "select u.id resource, max(v.time) time, u.host from Host h inner join ResourceURL u on u.host = h.id inner join ResourceVersion v on v.resource = u.id inner join VersionType t on t.id = v.type where t.filename = 'bow.bin' group by v.resource, v.type;",
	// /home/sean/newsreduce/sql/SELECT_BOW_FOR_RELATION.sql
	SELECT_BOW_FOR_RELATION: "select r.resource, rv.time from ResourceBinaryRelation r inner join ResourceVersion rv on rv.resource = r.resource inner join VersionType vt on vt.id = rv.type where r.relation = ? and r.polarity = ? and vt.filename = 'bow.bin'",
	// /home/sean/newsreduce/sql/SELECT_DEFINITE_NEWS_SOURCE_WIKIS.sql
	SELECT_DEFINITE_NEWS_SOURCE_WIKIS: "select u.url from ResourceBinaryRelation rbr inner join Predicate p on p.id = rbr.relation inner join URLView u on u.resource = rbr.resource where rbr.polarity and p.functor = 'res-is-news-source-wiki';",
	// /home/sean/newsreduce/sql/SELECT_DOC_TRAINING_DATA.sql
	SELECT_DOC_TRAINING_DATA: "select * from DocTrainingDataView;",
	// /home/sean/newsreduce/sql/SELECT_DOCUMENT_WORD_VECTORS.sql
	SELECT_DOCUMENT_WORD_VECTORS: "select wv.word, v.value from WordVector wv inner join Vector v on v.id = wv.vector where wv.source = ? and wv.word in ?",
	// /home/sean/newsreduce/sql/SELECT_HEADERS_FOR_RESOURCE.sql
	SELECT_HEADERS_FOR_RESOURCE: "select header from ResourceHeader r where r.resource = ?",
	// /home/sean/newsreduce/sql/SELECT_LINK_GRAPH_RESOURCES.sql
	SELECT_LINK_GRAPH_RESOURCES: "select distinct resource from (select distinct parent resource from ResourceLink union select distinct child resource from ResourceLink) u order by resource;",
	// /home/sean/newsreduce/sql/SELECT_NEWS_SOURCE_HOMEPAGES.sql
	SELECT_NEWS_SOURCE_HOMEPAGES: "select resource, rkv.value from ResourceKeyValue rkv inner join `Key` k on k.id = rkv.`key` where k.value = 'wiki-news-source-homepage';",
	// /home/sean/newsreduce/sql/SELECT_PRIORITY_RESOURCE_PER_HOST.sql
	SELECT_PRIORITY_RESOURCE_PER_HOST: "select min(priority) as priority, r.*, h.throttle, h.name as hostname from Schedule s inner join ResourceURL r on r.id = s.resource inner join Host h on h.id = r.host group by r.host;",
	// /home/sean/newsreduce/sql/SELECT_RESOURCES_TO_FETCH.sql
	SELECT_RESOURCES_TO_FETCH: "select id, url from ( select ResourceURL.id, URLView.url, IFNULL(max(ResourceVersion.time), 0) + ResourceThrottle.throttle as fetchAfter from ResourceURL inner join ResourceThrottle on ResourceThrottle.resource = ResourceURL.id inner join URLView on URLView.resource = ResourceURL.id left outer join ResourceVersion on ResourceVersion.resource = ResourceURL.id group by ResourceURL.id ) LastFetched left outer join ResourceBlocked on ResourceBlocked.resource = LastFetched.id where fetchAfter < round(UNIX_TIMESTAMP(CURTIME(4)) * 1000) and ResourceBlocked.expires is null or ResourceBlocked.expires < round(UNIX_TIMESTAMP(CURTIME(4)) * 1000);",
	// /home/sean/newsreduce/sql/SELECT_RESOURCE_VERSIONS_FOR_WIKI_NEWS_SOURCE_PREDICTION.sql
	SELECT_RESOURCE_VERSIONS_FOR_WIKI_NEWS_SOURCE_PREDICTION: "select rv.resource, rv.time from ResourceVersion rv join VersionType vt on vt.id = rv.type join ResourceURL ru on ru.id = rv.resource join Host h on h.id = ru.host left join ResourceBinaryRelation rbr on rbr.resource = rv.resource left join Predicate p on p.id = rbr.relation and functor = 'res-is-news-source-wiki' where vt.filename = 'bow.bin' and h.name = 'en.wikipedia.org' and p.id is null",
	// /home/sean/newsreduce/sql/SELECT_RESOURCE_VERSIONS.sql
	SELECT_RESOURCE_VERSIONS: "select u.url, v.time, filename from ResourceVersion v inner join VersionType t on t.id = v.type and t.modified < v.time inner join URLView u on u.resource = v.resource left outer join ResourceRank r on r.resource = v.resource left outer join ResourceBinaryRelation b on b.resource = v.resource group by v.resource, v.time, t.filename order by if(isnull(b.resource), 0, 1) desc, r.`rank` desc, v.resource, v.time;",
	// /home/sean/newsreduce/sql/SELECT_RESOURCE_VERSIONS_TO_PROCESS.sql
	SELECT_RESOURCE_VERSIONS_TO_PROCESS: "select id, url, time, c from ( select u.resource as id, u.url, g.time, count(br.relation) as c from ( select f.resource, f.time, count(*) as c, group_concat(tt.id) toType from ResourceVersion f inner join VersionType ft on ft.id = f.type and ft.modified <= f.created left outer join ResourceVersion t on t.resource = f.resource and t.time = f.time and t.type in ? left outer join VersionType tt on tt.id = t.type and tt.modified <= t.created where f.resource >= ? and f.resource < ? and f.type in ? group by f.resource, f.time, f.type ) g inner join URLView u on u.resource = g.resource left outer join ResourceBinaryRelation br on br.resource = g.resource where g.toType is null or c != ? group by u.resource, g.time ) gg order by c desc limit 1000;",
	// /home/sean/newsreduce/sql/SELECT_STOP_WORDS.sql
	SELECT_STOP_WORDS: "select w.id, w.value, wf.frequency from WordFrequency wf inner join Word w on w.id = wf.word order by frequency desc limit 48;",
	// /home/sean/newsreduce/sql/SELECT_SUB_DOC_TRAINING_DATA.sql
	SELECT_SUB_DOC_TRAINING_DATA: "select * from SubDocTrainingDataView;",
	// /home/sean/newsreduce/sql/SELECT_TABLES.sql
	SELECT_TABLES: "select TABLE_NAME as name from information_schema.TABLES where TABLE_SCHEMA = 'newsreduce'",
	// /home/sean/newsreduce/sql/SELECT_THROTTLE_FOR_HOST.sql
	SELECT_THROTTLE_FOR_HOST: "select id, throttle from Host where id in ?",
	// /home/sean/newsreduce/sql/SELECT_WIKI_URLS.sql
	SELECT_WIKI_URLS: "select url from URLView u inner join WikiPage w on w.resource = u.resource;",
};
