-- DM Schema for Drishti Universe
-- Run this in Supabase SQL Editor

-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_group BOOLEAN DEFAULT FALSE,
    name TEXT -- for group chats
);

-- 2. Conversation Members
CREATE TABLE IF NOT EXISTS public.conversation_members (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT, -- 'image', 'video', 'post'
    post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL, -- for sharing posts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for Conversations
CREATE POLICY "Users can see conversations they are members of"
ON public.conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
);

-- Policies for Members
CREATE POLICY "Users can see members of their conversations"
ON public.conversation_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = conversation_members.conversation_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can join conversations"
ON public.conversation_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policies for Messages
CREATE POLICY "Users can see messages in their conversations"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

-- Notifications Trigger (Optional but recommended)
-- You can add a trigger to notify recipients of new messages
