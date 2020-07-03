insert into FetchedResource(id, `count`, mean, status, `length`, `type`)
values (?, 1, ?, ?, ?, ?)
on duplicate key update
    mean = (mean * `count` + ?) / (`count` + 1),
    `count` = `count` + 1,
    status = ?,
    `length` = ?,
    `type` = ?
