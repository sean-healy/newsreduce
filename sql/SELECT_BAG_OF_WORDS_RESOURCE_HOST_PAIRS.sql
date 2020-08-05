select
    u.id resource,
    max(v.time) time,
    u.host
from Host h
inner join ResourceURL u on u.host = h.id
inner join ResourceVersion v on v.resource = u.id
inner join VersionType t on t.id = v.type
where t.filename = "bow.bin"
group by v.resource, v.type;
