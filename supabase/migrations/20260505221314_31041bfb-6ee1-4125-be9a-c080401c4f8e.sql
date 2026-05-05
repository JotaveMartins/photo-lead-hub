
ALTER TABLE public.event_team_members
  ADD CONSTRAINT event_team_members_event_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  ADD CONSTRAINT event_team_members_member_fk FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

ALTER TABLE public.despesas
  ADD CONSTRAINT despesas_team_member_fk FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE SET NULL;

ALTER TABLE public.lead_tasks
  ADD CONSTRAINT lead_tasks_cliente_fk FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
