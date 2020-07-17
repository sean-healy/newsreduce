select r.ssl, h.name as host, r.port, p.value as path, q.value as query
from ResourceURL r
inner join Host h on h.id = r.host
inner join WikiCategory w on w.child = r.id            /* Only select resources that are wiki categories */
left outer join FetchedResource f on f.resource = r.id
inner join ResourceURLPath p on p.id = r.path          /* Add path data. */
inner join ResourceURLQuery q on q.id = r.query        /* Add query data. */
where f.resource is null                               /* Only select resources that have not been fetched before. */
limit 100
