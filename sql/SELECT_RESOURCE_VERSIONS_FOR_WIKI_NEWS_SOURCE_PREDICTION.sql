select rv.resource, rv.time
from ResourceVersion rv
join VersionType vt on vt.id = rv.type
join ResourceURL ru on ru.id = rv.resource
join Host h on h.id = ru.host
left join ResourceBinaryRelation rbr on rbr.resource = rv.resource
left join Predicate p on p.id = rbr.relation and functor = "res-is-news-source-wiki"
where
    vt.filename = "bow.bin"
    and h.name = "en.wikipedia.org"
    and p.id is null
