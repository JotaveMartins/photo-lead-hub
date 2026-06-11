-- Permite que admins visualizem as conversas/mensagens de qualquer cliente
-- (necessário para o modo "Entrar como visualizador" / impersonação).
-- Espelha o padrão já usado em leads ("Admins can view all leads").

-- Conversas
CREATE POLICY "Admins can view all conversations"
ON public.inbox_conversations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Mensagens
CREATE POLICY "Admins can view all inbox messages"
ON public.inbox_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Gatilhos (para o painel de IA do inbox refletir o cliente impersonado)
CREATE POLICY "Admins can view all inbox triggers"
ON public.inbox_triggers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
