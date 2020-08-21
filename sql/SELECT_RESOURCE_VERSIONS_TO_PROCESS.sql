select id, url, time, c from (
    select u.resource as id, u.url, g.time, count(br.relation) as c from (
        select
            f.resource,
            f.time,
            count(*) as c,
            group_concat(tt.id) toType
        from ResourceVersion f
        inner join VersionType ft on ft.id = f.type and ft.modified <= f.created
        left outer join ResourceVersion t
            on t.resource = f.resource
            and t.time = f.time
            and t.type in ?
        left outer join VersionType tt on tt.id = t.type and tt.modified <= t.created
        where f.resource >= ? and f.resource < ?
        and f.type in ?
        group by f.resource, f.time, f.type
    ) g
    inner join URLView u on u.resource = g.resource
    left outer join ResourceBinaryRelation br on br.resource = g.resource
    where g.toType is null or c != ?
    group by u.resource, g.time
) gg
order by c desc
limit 1000;
