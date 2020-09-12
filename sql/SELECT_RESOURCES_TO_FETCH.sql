select * from (
    select id, u.url, ifnull(rr.`rank`, 0) as `rank`
    from (
        select
            ResourceURL.id,
            IFNULL(max(ResourceVersion.time), 0) + ResourceThrottle.throttle as fetchAfter
        from ResourceURL
        inner join ResourceThrottle on ResourceThrottle.resource = ResourceURL.id
        inner join URLView on URLView.resource = ResourceURL.id
        left outer join ResourceVersion on ResourceVersion.resource = ResourceURL.id
        group by ResourceURL.id
    ) LastFetched
    left outer join ResourceBlocked on ResourceBlocked.resource = LastFetched.id
    left outer join ResourceRank rr on rr.resource = LastFetched.id
    inner join URLView u on u.resource = LastFetched.id
    where fetchAfter < round(UNIX_TIMESTAMP(CURTIME(4)) * 1000)
    and ResourceBlocked.expires is null or ResourceBlocked.expires < round(UNIX_TIMESTAMP(CURTIME(4)) * 1000)
) Unordered order by Unordered.`rank`;
