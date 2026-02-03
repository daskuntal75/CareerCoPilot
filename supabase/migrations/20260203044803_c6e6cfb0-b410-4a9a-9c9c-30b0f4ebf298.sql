-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_admin_users_with_subscriptions(text, integer, integer);

-- Create enhanced admin user details function
CREATE OR REPLACE FUNCTION public.get_admin_users_with_subscriptions(
    search_term TEXT DEFAULT NULL,
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    subscription_status TEXT,
    subscription_tier TEXT,
    subscription_end TIMESTAMPTZ,
    total_applications BIGINT,
    cover_letters_used BIGINT,
    apps_with_cover_letter BIGINT,
    submitted_applications BIGINT,
    user_type TEXT,
    is_admin BOOLEAN,
    is_whitelisted BOOLEAN,
    last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        p.user_id,
        u.email::TEXT,
        p.full_name,
        p.created_at,
        COALESCE(s.status, 'inactive')::TEXT as subscription_status,
        COALESCE(s.tier, 'free')::TEXT as subscription_tier,
        s.current_period_end as subscription_end,
        COALESCE((SELECT COUNT(*) FROM public.applications a WHERE a.user_id = p.user_id), 0)::BIGINT as total_applications,
        COALESCE((
            SELECT SUM(ut.usage_count)::BIGINT 
            FROM public.usage_tracking ut 
            WHERE ut.user_id = p.user_id 
            AND ut.feature_type = 'cover_letter'
        ), 0)::BIGINT as cover_letters_used,
        COALESCE((SELECT COUNT(*) FROM public.applications a WHERE a.user_id = p.user_id AND a.cover_letter IS NOT NULL), 0)::BIGINT as apps_with_cover_letter,
        COALESCE((SELECT COUNT(*) FROM public.applications a WHERE a.user_id = p.user_id AND a.status = 'submitted'), 0)::BIGINT as submitted_applications,
        CASE
            WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin') THEN 'admin'
            WHEN s.status = 'active' AND s.tier IN ('pro', 'premium') THEN 'paid'
            ELSE 'demo'
        END::TEXT as user_type,
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin') as is_admin,
        EXISTS (SELECT 1 FROM public.demo_whitelist dw WHERE dw.user_id = p.user_id) as is_whitelisted,
        GREATEST(
            p.updated_at,
            COALESCE((SELECT MAX(a.updated_at) FROM public.applications a WHERE a.user_id = p.user_id), p.created_at),
            COALESCE((SELECT MAX(ur.uploaded_at) FROM public.user_resumes ur WHERE ur.user_id = p.user_id), p.created_at),
            COALESCE((SELECT MAX(ct.updated_at) FROM public.user_cover_letter_templates ct WHERE ct.user_id = p.user_id), p.created_at)
        ) as last_activity
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN public.subscriptions s ON p.user_id = s.user_id
    WHERE (search_term IS NULL OR search_term = '' OR 
           p.full_name ILIKE '%' || search_term || '%' OR 
           u.email ILIKE '%' || search_term || '%')
    ORDER BY p.created_at DESC
    LIMIT page_size
    OFFSET (page_number - 1) * page_size;
END;
$$;