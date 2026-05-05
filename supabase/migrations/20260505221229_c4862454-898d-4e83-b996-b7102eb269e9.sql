
-- 1. team_members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  funcao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own team_members" ON public.team_members
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all team_members" ON public.team_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. event_team_members (N:N)
CREATE TABLE public.event_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  team_member_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, team_member_id)
);
ALTER TABLE public.event_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own event_team_members" ON public.event_team_members
  FOR SELECT USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_team_members.event_id AND events.user_id = auth.uid()));
CREATE POLICY "Users insert own event_team_members" ON public.event_team_members
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_team_members.event_id AND events.user_id = auth.uid()));
CREATE POLICY "Users delete own event_team_members" ON public.event_team_members
  FOR DELETE USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_team_members.event_id AND events.user_id = auth.uid()));
CREATE POLICY "Admins all event_team_members" ON public.event_team_members
  FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE INDEX idx_event_team_members_event ON public.event_team_members(event_id);
CREATE INDEX idx_event_team_members_member ON public.event_team_members(team_member_id);

-- 3. events.responsavel_proprio
ALTER TABLE public.events ADD COLUMN responsavel_proprio BOOLEAN NOT NULL DEFAULT true;

-- 4. despesas.team_member_id
ALTER TABLE public.despesas ADD COLUMN team_member_id UUID;
CREATE INDEX idx_despesas_team_member ON public.despesas(team_member_id);

-- 5. lead_tasks: cliente_id + lead_id nullable + check constraint
ALTER TABLE public.lead_tasks ADD COLUMN cliente_id UUID;
ALTER TABLE public.lead_tasks ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE public.lead_tasks ADD CONSTRAINT lead_tasks_one_owner_chk
  CHECK ((lead_id IS NOT NULL)::int + (cliente_id IS NOT NULL)::int = 1);
CREATE INDEX idx_lead_tasks_cliente ON public.lead_tasks(cliente_id);
