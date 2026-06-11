-- Permite que admins GERENCIEM (insert/update/delete) as configurações de IA
-- e do inbox de qualquer cliente, necessário para o modo "Entrar como
-- visualizador" / impersonação poder editar as configs do cliente.
--
-- O RLS padrão dessas tabelas exige auth.uid() = user_id; como na impersonação
-- o auth.uid() continua sendo o do admin, as escritas eram silenciosamente
-- bloqueadas. Estas policies espelham "Admins can view all leads".

-- Palavras-chave que criam leads automaticamente (inbox_triggers)
CREATE POLICY "Admins can manage all inbox triggers"
ON public.inbox_triggers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Configuração da IA (ai_config)
CREATE POLICY "Admins can manage all ai_config"
ON public.ai_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Arquivos da base de conhecimento da IA (ai_files)
CREATE POLICY "Admins can manage all ai_files"
ON public.ai_files
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Conversas: permitir update (toggle de IA, status, atribuição) pelo admin
CREATE POLICY "Admins can update all conversations"
ON public.inbox_conversations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Mensagens: permitir que o admin envie mensagens enquanto impersona
CREATE POLICY "Admins can insert all inbox messages"
ON public.inbox_messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
