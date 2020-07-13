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
    inner join WikiCategory w on w.child = r.id            /* Only select resources that are wiki categories */
    left outer join FetchedResource f on f.resource = r.id
    where (f.resource is null)                             /* Only select resources that have not been fetched before. */
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
    inner join WikiCategory c on c.child = r.id            /* Only select resources that are in the wiki index. */
    inner join WikiPage p on p.resource = r.id             /* Only select those that happen to be wiki pages. */
    left outer join FetchedResource f on f.resource = r.id
    where (f.resource is null)                             /* Only select those that have not been fetched before. */
) t
inner join ResourceURLPath p on p.id = t.path              /* Add path data. */
inner join ResourceURLQuery q on q.id = t.query            /* Add query data. */
