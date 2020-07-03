select r.*, h.name as hostname, f.file, i.fetchedByClient
from ResourceURL r
inner join Host h on h.id = r.host
inner join FetchedResource f on f.id = r.id
inner join ResourceInstance i on i.file = f.file
inner join HTTPHeaderValue v on v.id = f.type
left outer join ProcessedHTML p on p.resource = r.id
where p.resource is null
and lower(v.value) like "text/html%"
