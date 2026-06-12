-- Permite que admins vejam as instâncias de WhatsApp de qualquer cliente.
-- Necessário para o modo "Entrar como visualizador" / impersonação conseguir
-- selecionar a instância conectada do cliente e enviar mensagens de teste.
-- (O RLS padrão é auth.uid() = user_id, que na impersonação não bate porque
-- o auth.uid() continua sendo o do admin.)

CREATE POLICY "Admins can view all whatsapp instances"
ON public.whatsapp_instances
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
