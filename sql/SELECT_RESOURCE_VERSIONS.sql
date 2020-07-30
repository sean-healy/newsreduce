select u.url, time, filename
from (
    select
        t.filename,
        resource,
        time
    from ResourceVersion v
    inner join ResourceVersionType t on t.id = v.type
) ResourcesVersionCounts
inner join URLView u on u.resource = ResourcesVersionCounts.resource;
