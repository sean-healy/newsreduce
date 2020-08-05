export default {
	// /home/sean/newsreduce/sql/BULK_INSERT.sql
	BULK_INSERT: "LOAD DATA INFILE ? IGNORE INTO TABLE ? FIELDS TERMINATED BY ',' ENCLOSED BY ''' ESCAPED BY '\\' LINES TERMINATED BY '\n' ?",
	// /home/sean/newsreduce/sql/DELETE_RESOURCE_HEADERS.sql
	DELETE_RESOURCE_HEADERS: "delete from ResourceHeader where resource = ? and header not in ?",
	// /home/sean/newsreduce/sql/DELETE_SCHEDULE.sql
	DELETE_SCHEDULE: "delete from Schedule where resource = ?",
	// /home/sean/newsreduce/sql/DELETE_WIKI_CATEGORIES_FOR_PARENTS.sql
	DELETE_WIKI_CATEGORIES_FOR_PARENTS: "delete from WikiCategory where parent = ? and child not in ?",
	// /home/sean/newsreduce/sql/SELECT_BACKLINKS.sql
	SELECT_BACKLINKS: "select * from Backlinks;",
	// /home/sean/newsreduce/sql/SELECT_BAG_OF_WORDS_RESOURCE_HOST_PAIRS.sql
	SELECT_BAG_OF_WORDS_RESOURCE_HOST_PAIRS: "select u.id resource, max(v.time) time, u.host from Host h inner join ResourceURL u on u.host = h.id inner join ResourceVersion v on v.resource = u.id inner join VersionType t on t.id = v.type where t.filename = 'bow.bin' group by v.resource, v.type;",
	// /home/sean/newsreduce/sql/SELECT_BOW_FOR_RELATION.sql
	SELECT_BOW_FOR_RELATION: "select r.resource, rv.time from ResourceBinaryRelation r inner join ResourceVersion rv on rv.resource = r.resource inner join VersionType vt on vt.id = rv.type where r.relation = ? and r.polarity = ? and vt.filename = 'bow.bin'",
	// /home/sean/newsreduce/sql/SELECT_HEADERS_FOR_RESOURCE.sql
	SELECT_HEADERS_FOR_RESOURCE: "select header from ResourceHeader r where r.resource = ?",
	// /home/sean/newsreduce/sql/SELECT_PRIORITY_RESOURCE_PER_HOST.sql
	SELECT_PRIORITY_RESOURCE_PER_HOST: "select min(priority) as priority, r.*, h.throttle, h.name as hostname from Schedule s inner join ResourceURL r on r.id = s.resource inner join Host h on h.id = r.host group by r.host;",
	// /home/sean/newsreduce/sql/SELECT_RESOURCES_TO_FETCH.sql
	SELECT_RESOURCES_TO_FETCH: "select id, url from ( select ResourceURL.id, URLView.url, IFNULL(max(ResourceVersion.time), 0) + ResourceThrottle.throttle as fetchAfter from ResourceURL inner join ResourceThrottle on ResourceThrottle.resource = ResourceURL.id inner join URLView on URLView.resource = ResourceURL.id left outer join ResourceVersion on ResourceVersion.resource = ResourceURL.id group by ResourceURL.id ) LastFetched where fetchAfter < round(UNIX_TIMESTAMP(CURTIME(4)) * 1000);",
	// /home/sean/newsreduce/sql/SELECT_RESOURCE_VERSIONS.sql
	SELECT_RESOURCE_VERSIONS: "select u.url, v.time, filename from ResourceVersion v inner join VersionType t on t.id = v.type inner join URLView u on u.resource = v.resource left outer join ResourceRank r on r.resource = v.resource left outer join ResourceBinaryRelation b on b.resource = v.resource group by v.resource, v.time, t.filename order by if(isnull(b.resource), 0, 1) desc, r.`rank` desc, v.resource, v.time;",
	// /home/sean/newsreduce/sql/SELECT_TABLES.sql
	SELECT_TABLES: "select TABLE_NAME as name from information_schema.TABLES where TABLE_SCHEMA = 'newsreduce'",
	// /home/sean/newsreduce/sql/SELECT_THROTTLE_FOR_HOST.sql
	SELECT_THROTTLE_FOR_HOST: "select id, throttle from Host where id in ?",
};
