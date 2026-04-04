delete from public.maxpetrusenko_workspace_members
where lower(email) = 'hello@maxpetrusenko.com';

insert into public.maxpetrusenko_workspace_members (email, role)
values ('max.petrusenko@gmail.com', 'owner')
on conflict (email) do update
set role = excluded.role;
