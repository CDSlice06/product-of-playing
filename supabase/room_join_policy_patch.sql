drop policy if exists "owners manage rooms" on public.custom_rooms;

create policy "users can create owned rooms"
on public.custom_rooms for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "owners or invited players update rooms"
on public.custom_rooms for update
to authenticated
using (auth.uid() = owner_id or auth.uid() = invited_user_id or invited_user_id is null)
with check (auth.uid() = owner_id or auth.uid() = invited_user_id or auth.uid() = owner_id);

create policy "owners can delete rooms"
on public.custom_rooms for delete
to authenticated
using (auth.uid() = owner_id);
