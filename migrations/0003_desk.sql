alter table products add column if not exists image_back text not null default '';
alter table products add column if not exists image_left text not null default '';
alter table products add column if not exists image_right text not null default '';
alter table shop_settings add column if not exists desk_hash text not null default '';

update products set image = '/crafts/cut/fox.png' where id = 'fox';
update products set image = '/crafts/cut/bear-sunset.png' where id = 'bear-sunset';
update products set image = '/crafts/cut/octopus-violet.png' where id = 'octopus-violet';
update products set image = '/crafts/cut/cow.png' where id = 'cow';
update products set featured = false, feature_order = 0 where id in ('surgeon', 'flower');
