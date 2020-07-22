select u.*, time
from (
    select
        count(*) as formats,
        resource,
        time
    from ResourceVersion v
    inner join ResourceVersionType t on t.id = v.type
    group by resource, time
) ResourcesVersionCounts
inner join URLView u on u.resource = ResourcesVersionCounts.resource
where formats <= 2;
