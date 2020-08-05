select
    r.resource,
    rv.time
from ResourceBinaryRelation r
inner join ResourceVersion rv on rv.resource = r.resource
inner join VersionType vt on vt.id = rv.type
where r.relation = ? and r.polarity = ? and vt.filename = "bow.bin"
