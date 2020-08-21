select
    wv.word,
    v.value
from WordVector wv
inner join Vector v on v.id = wv.vector
where wv.source = ?
and wv.word in ?
