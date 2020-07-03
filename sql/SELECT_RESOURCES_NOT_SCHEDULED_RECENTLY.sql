select t.ssl, t.host, t.port, p.value as path, q.value as query from (
    select
        r.id,
        r.ssl,
        h.name as host,
        r.port,
        r.path,
        r.query
    from ResourceURL r
    inner join Host h on h.id = r.host
    inner join WikiCategory w on w.child = r.id
    left outer join FetchedResource f on f.id = r.id
    left outer join ResourceInstance i on i.id = r.id
    where (f.id is null or i.time < ? - 86400000)
    and lower(h.name) = "en.wikipedia.org"
    and r.ssl
    and r.port = 443
    and r.query = ""
    and lower(r.path) like "/wiki/Category:%"
    union
    select
        r.id,
        r.ssl,
        h.name as host,
        r.port,
        r.path,
        r.query
    from ResourceURL r
    inner join Host h on h.id = r.host
    inner join WikiCategory c on c.child = r.id
    inner join WikiPage p on p.resource = r.id
    left outer join FetchedResource f on f.id = r.id
    left outer join ResourceInstance i on i.id = r.id
    where (f.id is null or i.time < ? - 86400000)
    limit 500) t
inner join ResourceURLPath p on p.id = t.path
inner join ResourceURLQuery q on q.id = t.query
