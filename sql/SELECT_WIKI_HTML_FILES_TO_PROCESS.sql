select h.name as hostname, f.file, i.fetchedByClient, r.*
from ResourceURL r
inner join FetchedResource f on f.id = r.id
inner join ResourceInstance i on i.file = f.file
inner join Host h on h.id = r.host
inner join ResourceURL refer on refer.id = r.referer
inner join ResourceLink l on l.parent = r.id
inner join ResourceURL child on child.id = l.child
left outer join ProcessedWiki w on w.resource = r.id
left outer join WikiPage p on p.resource = r.id

where w.resource is null
and p.resource is null
and r.ssl
and h.name = "en.wikipedia.org"
and r.port = 443
and r.path like "/wiki/Category:%"
and r.query = ""

and refer.ssl = r.ssl
and refer.host = r.host
and refer.port = r.port
and refer.path like "/wiki/Category:%"
and refer.query = r.query

and child.ssl = r.ssl
and child.host = r.host
and child.port = r.port
and child.path like "/wiki/Category:%"
and child.query = r.query

group by r.id
