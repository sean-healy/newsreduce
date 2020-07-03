export default {
	// /home/sean/newsreduce/sql/DELETE_RESOURCE_HEADERS.sql
	DELETE_RESOURCE_HEADERS: "delete from ResourceHeader where resource = ? and header not in ?",
	// /home/sean/newsreduce/sql/DELETE_SCHEDULE.sql
	DELETE_SCHEDULE: "delete from Schedule where resource = ?",
	// /home/sean/newsreduce/sql/DELETE_WIKI_CATEGORIES_FOR_PARENTS.sql
	DELETE_WIKI_CATEGORIES_FOR_PARENTS: "delete from WikiCategory where parent = ? and child not in ?",
	// /home/sean/newsreduce/sql/INSERT_CLIENT_HEADER_IF_ABSENT.sql
	INSERT_CLIENT_HEADER_IF_ABSENT: "insert ignore into ClientHeader(client, header) values ?",
	// /home/sean/newsreduce/sql/INSERT_CLIENT_IF_ABSENT.sql
	INSERT_CLIENT_IF_ABSENT: "insert ignore into Client(id, name, httpVersion) values ?",
	// /home/sean/newsreduce/sql/INSERT_CLIENT.sql
	INSERT_CLIENT: "insert into Client(id, httpVersion, userAgent, accept, acceptLanguage, acceptEncoding, connection, marketShare, upgradeInsecureRequests, utcHourOffset) values ($id, $httpVersion, $userAgent, $accept, $acceptLanguage, $acceptEncoding, $connection, $marketShare, $upgradeInsecureRequests, $utcHourOffset)",
	// /home/sean/newsreduce/sql/INSERT_FILE_ROW.sql
	INSERT_FILE_ROW: "insert ignore into File(id, path) values ($id, $path)",
	// /home/sean/newsreduce/sql/INSERT_FILE.sql
	INSERT_FILE: "insert ignore into File(id, created) values ($id, $now);",
	// /home/sean/newsreduce/sql/INSERT_HOSTS_IF_ABSENT.sql
	INSERT_HOSTS_IF_ABSENT: "insert ignore into Host(id, name, throttle) values ?",
	// /home/sean/newsreduce/sql/INSERT_HTTP_HEADER_IF_ABSENT.sql
	INSERT_HTTP_HEADER_IF_ABSENT: "insert ignore into HTTPHeader(id, name, value) values ?",
	// /home/sean/newsreduce/sql/INSERT_HTTP_HEADER_NAMES_IF_ABSENT.sql
	INSERT_HTTP_HEADER_NAMES_IF_ABSENT: "insert ignore into HTTPHeaderName(id, value) values ?",
	// /home/sean/newsreduce/sql/INSERT_HTTP_HEADER_VALUES_IF_ABSENT.sql
	INSERT_HTTP_HEADER_VALUES_IF_ABSENT: "insert ignore into HTTPHeaderValue(id, value) values ?",
	// /home/sean/newsreduce/sql/INSERT_HTTP_HOST.sql
	INSERT_HTTP_HOST: "insert into HTTPHost(id, name, throttle) values ($id, $name, $throttle)",
	// /home/sean/newsreduce/sql/INSERT_IP_HOST.sql
	INSERT_IP_HOST: "insert into IPHost(id, ip, isIPV6) values ($id, $ip, $isIPV6);",
	// /home/sean/newsreduce/sql/INSERT_OR_UPDATE_FETCHED_RESOURCE.sql
	INSERT_OR_UPDATE_FETCHED_RESOURCE: "insert into FetchedResource(id, `count`, mean, status, `length`, `type`) values (?, 1, ?, ?, ?, ?) on duplicate key update mean = (mean * `count` + ?) / (`count` + 1), `count` = `count` + 1, status = ?, `length` = ?, `type` = ?",
	// /home/sean/newsreduce/sql/INSERT_PROCESSED_HTMLS_IF_ABSENT.sql
	INSERT_PROCESSED_HTMLS_IF_ABSENT: "insert ignore into ProcessedHTML(resource) values ?",
	// /home/sean/newsreduce/sql/INSERT_PROCESSED_WIKIS_IF_ABSENT.sql
	INSERT_PROCESSED_WIKIS_IF_ABSENT: "insert ignore into ProcessedWiki(resource) values ?",
	// /home/sean/newsreduce/sql/INSERT_PROCESSED_WIKI.sql
	INSERT_PROCESSED_WIKI: "insert into ProcessedWiki(resource) values ($resource)",
	// /home/sean/newsreduce/sql/INSERT_RESOURCE_HEADER_IF_ABSENT.sql
	INSERT_RESOURCE_HEADER_IF_ABSENT: "insert ignore into ResourceHeader(resource, header) values ?",
	// /home/sean/newsreduce/sql/INSERT_RESOURCE_INSTANCES_IF_ABSENT.sql
	INSERT_RESOURCE_INSTANCES_IF_ABSENT: "insert into ResourceInstance(id, file, fetchedByClient, time) values ?",
	// /home/sean/newsreduce/sql/INSERT_RESOURCE_INSTANCE.sql
	INSERT_RESOURCE_INSTANCE: "insert ignore into ResourceInstance(resource, file, fetchedByClient) values ($resource, $file, $fetchedByClient)",
	// /home/sean/newsreduce/sql/INSERT_RESOURCE_LINK_IF_ABSENT.sql
	INSERT_RESOURCE_LINK_IF_ABSENT: "insert ignore into ResourceLink(parent, position, child) values ?",
	// /home/sean/newsreduce/sql/INSERT_RESOURCE_LINK.sql
	INSERT_RESOURCE_LINK: "insert ignore into ResourceLink(parent, child, hash) values ($parent, $child, $hash)",
	// /home/sean/newsreduce/sql/INSERT_RESOURCE.sql
	INSERT_RESOURCE: "insert into Resource(id, created, `ssl`, host, port, path, query, referer, seenByClient) values ?",
	// /home/sean/newsreduce/sql/INSERT_RESOURCE_URLS_IF_ABSENT.sql
	INSERT_RESOURCE_URLS_IF_ABSENT: "insert ignore into ResourceURL(id, `ssl`, host, port, path, query) values ?",
	// /home/sean/newsreduce/sql/INSERT_WIKI_CATEGORIES_IF_ABSENT.sql
	INSERT_WIKI_CATEGORIES_IF_ABSENT: "insert ignore into WikiCategory(parent, child) values ?",
	// /home/sean/newsreduce/sql/INSERT_WIKI_PAGES_IF_ABSENT.sql
	INSERT_WIKI_PAGES_IF_ABSENT: "insert ignore into WikiPage(resource) values ?",
	// /home/sean/newsreduce/sql/SELECT_FILES_NOT_PROCESSED_AND_PATH_LIKE_FOR_HOST.sql
	SELECT_FILES_NOT_PROCESSED_AND_PATH_LIKE_FOR_HOST: "select f.path as filePath, res.ssl, res.host, h.name as hostname, res.port, res.path as resPath, res.query from Resource res inner join Host h on h.id = res.host inner join ResourceInstance inst on inst.resource = res.id inner join File f on f.id = inst.file where not f.processed and res.path like $path and res.host = $host",
	// /home/sean/newsreduce/sql/SELECT_HEADERS_FOR_RESOURCE.sql
	SELECT_HEADERS_FOR_RESOURCE: "select header from ResourceHeader r where r.resource = ?",
	// /home/sean/newsreduce/sql/SELECT_HTML_RESOURCE_AND_FILE_TO_PROCESS.sql
	SELECT_HTML_RESOURCE_AND_FILE_TO_PROCESS: "select r.*, h.name as hostname, f.file, i.fetchedByClient from ResourceURL r inner join Host h on h.id = r.host inner join FetchedResource f on f.id = r.id inner join ResourceInstance i on i.file = f.file inner join HTTPHeaderValue v on v.id = f.type left outer join ProcessedHTML p on p.resource = r.id where p.resource is null and lower(v.value) like 'text/html%'",
	// /home/sean/newsreduce/sql/SELECT_PRIORITY_RESOURCE_PER_HOST.sql
	SELECT_PRIORITY_RESOURCE_PER_HOST: "select min(priority) as priority, r.*, h.throttle, h.name as hostname from Schedule s inner join ResourceURL r on r.id = s.resource inner join Host h on h.id = r.host group by r.host;",
	// /home/sean/newsreduce/sql/SELECT_RESOURCES_NOT_SCHEDULED_RECENTLY.sql
	SELECT_RESOURCES_NOT_SCHEDULED_RECENTLY: "select t.ssl, t.host, t.port, p.value as path, q.value as query from ( select r.id, r.ssl, h.name as host, r.port, r.path, r.query from ResourceURL r inner join Host h on h.id = r.host inner join WikiCategory w on w.child = r.id left outer join FetchedResource f on f.id = r.id left outer join ResourceInstance i on i.id = r.id where (f.id is null or i.time < ? - 86400000) and lower(h.name) = 'en.wikipedia.org' and r.ssl and r.port = 443 and r.query = '' and lower(r.path) like '/wiki/Category:%' union select r.id, r.ssl, h.name as host, r.port, r.path, r.query from ResourceURL r inner join Host h on h.id = r.host inner join WikiCategory c on c.child = r.id inner join WikiPage p on p.resource = r.id left outer join FetchedResource f on f.id = r.id left outer join ResourceInstance i on i.id = r.id where (f.id is null or i.time < ? - 86400000) limit 500) t inner join ResourceURLPath p on p.id = t.path inner join ResourceURLQuery q on q.id = t.query",
	// /home/sean/newsreduce/sql/SELECT_RESOURCE.sql
	SELECT_RESOURCE: "select r.*, h.throttle, h.name as hostname from ResourceURL r inner join Host h on h.id = r.host where r.id = ?",
	// /home/sean/newsreduce/sql/SELECT_TABLES.sql
	SELECT_TABLES: "select TABLE_NAME as name from information_schema.TABLES where TABLE_SCHEMA = 'newsreduce'",
	// /home/sean/newsreduce/sql/SELECT_THROTTLE_FOR_HOST.sql
	SELECT_THROTTLE_FOR_HOST: "select id, throttle from Host where id in ?",
	// /home/sean/newsreduce/sql/SELECT_WIKI_CAT_RES_IN_OTHER_CAT_RES_WITHOUT_SCHEDULE_OR_FILE.sql
	SELECT_WIKI_CAT_RES_IN_OTHER_CAT_RES_WITHOUT_SCHEDULE_OR_FILE: "select r.* from Resource r inner join Host h on h.id = r.host left join ResourceInstance inst on inst.resource = r.id left join Schedule s on s.resource = r.id and s.time > $now inner join ResourceLinksTable l on l.child = r.id inner join Resource lr on lr.id = l.parent where h.name = 'en.wikipedia.org' and r.path like '/wiki/Category:%' and lr.path like '/wiki/Category:%' and s.resource is null and inst.resource is null",
	// /home/sean/newsreduce/sql/SELECT_WIKI_HTML_FILES_TO_PROCESS.sql
	SELECT_WIKI_HTML_FILES_TO_PROCESS: "select h.name as hostname, f.file, i.fetchedByClient, r.* from ResourceURL r inner join FetchedResource f on f.id = r.id inner join ResourceInstance i on i.file = f.file inner join Host h on h.id = r.host inner join ResourceURL refer on refer.id = r.referer inner join ResourceLink l on l.parent = r.id inner join ResourceURL child on child.id = l.child left outer join ProcessedWiki w on w.resource = r.id left outer join WikiPage p on p.resource = r.id where w.resource is null and p.resource is null and r.ssl and h.name = 'en.wikipedia.org' and r.port = 443 and r.path like '/wiki/Category:%' and r.query = '' and refer.ssl = r.ssl and refer.host = r.host and refer.port = r.port and refer.path like '/wiki/Category:%' and refer.query = r.query and child.ssl = r.ssl and child.host = r.host and child.port = r.port and child.path like '/wiki/Category:%' and child.query = r.query group by r.id",
};
