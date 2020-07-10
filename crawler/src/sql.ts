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
	// /home/sean/newsreduce/sql/SELECT_HEADERS_FOR_RESOURCE.sql
	SELECT_HEADERS_FOR_RESOURCE: "select header from ResourceHeader r where r.resource = ?",
	// /home/sean/newsreduce/sql/SELECT_PRIORITY_RESOURCE_PER_HOST.sql
	SELECT_PRIORITY_RESOURCE_PER_HOST: "select min(priority) as priority, r.*, h.throttle, h.name as hostname from Schedule s inner join ResourceURL r on r.id = s.resource inner join Host h on h.id = r.host group by r.host;",
	// /home/sean/newsreduce/sql/SELECT_RESOURCES_NOT_SCHEDULED_RECENTLY.sql
	SELECT_RESOURCES_NOT_SCHEDULED_RECENTLY: "select t.ssl, t.host, t.port, p.value as path, q.value as query from ( select r.id, r.ssl, h.name as host, r.port, r.path, r.query from ResourceURL r inner join Host h on h.id = r.host inner join WikiCategory w on w.child = r.id left outer join FetchedResource f on f.resource = r.id where (f.resource is null) union select r.id, r.ssl, h.name as host, r.port, r.path, r.query from ResourceURL r inner join Host h on h.id = r.host inner join WikiCategory c on c.child = r.id inner join WikiPage p on p.resource = r.id left outer join FetchedResource f on f.resource = r.id where (f.resource is null) limit 500) t inner join ResourceURLPath p on p.id = t.path inner join ResourceURLQuery q on q.id = t.query",
	// /home/sean/newsreduce/sql/SELECT_RESOURCE.sql
	SELECT_RESOURCE: "select r.*, h.throttle, h.name as hostname from ResourceURL r inner join Host h on h.id = r.host where r.id = ?",
	// /home/sean/newsreduce/sql/SELECT_TABLES.sql
	SELECT_TABLES: "select TABLE_NAME as name from information_schema.TABLES where TABLE_SCHEMA = 'newsreduce'",
	// /home/sean/newsreduce/sql/SELECT_THROTTLE_FOR_HOST.sql
	SELECT_THROTTLE_FOR_HOST: "select id, throttle from Host where id in ?",
};
