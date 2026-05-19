-- Create enum for inbox conversation status
CREATE TYPE public.inbox_status AS ENUM ('pending_ai', 'open', 'closed');

-- Create inbox_conversations table
CREATE TABLE public.inbox_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_name TEXT,
    contact_number TEXT NOT NULL,
    status public.inbox_status NOT NULL DEFAULT 'pending_ai',
    assigned_to UUID REFERENCES auth.users(id),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    last_message TEXT,
    unread_count INTEGER DEFAULT 0,
    is_group BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, contact_number)
);

-- Create inbox_messages table
CREATE TABLE public.inbox_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    read BOOLEAN DEFAULT false,
    whatsapp_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inbox_triggers table
CREATE TABLE public.inbox_triggers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_triggers ENABLE ROW LEVEL SECURITY;

-- Policies for inbox_conversations
CREATE POLICY "Users can view their own conversations" 
ON public.inbox_conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.inbox_conversations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
ON public.inbox_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policies for inbox_messages
CREATE POLICY "Users can view their own inbox messages" 
ON public.inbox_messages FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inbox messages" 
ON public.inbox_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policies for inbox_triggers
CREATE POLICY "Users can manage their own triggers" 
ON public.inbox_triggers FOR ALL 
USING (auth.uid() = user_id);

-- Trigger for updated_at on inbox_conversations
CREATE TRIGGER update_inbox_conversations_updated_at
BEFORE UPDATE ON public.inbox_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_inbox_conv_user ON public.inbox_conversations(user_id);
CREATE INDEX idx_inbox_conv_number ON public.inbox_conversations(contact_number);
CREATE INDEX idx_inbox_msg_conv ON public.inbox_messages(conversation_id);
CREATE INDEX idx_inbox_triggers_user ON public.inbox_triggers(user_id);
