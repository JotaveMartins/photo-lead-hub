import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export interface InstanceStat {
  instance_id: string;
  last_activity: string | null;
  msgs_today: number;
}

export const useInstanceStats = () => {
  const effectiveUserId = useEffectiveUserId();
  return useQuery({
    queryKey: ["instance_stats", effectiveUserId],
    queryFn: async (): Promise<InstanceStat[]> => {
      if (!effectiveUserId) return [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: convs } = await supabase
        .from("inbox_conversations")
        .select("id, instance_id, updated_at")
        .eq("user_id", effectiveUserId);

      if (!convs || convs.length === 0) return [];

      const convIds = convs.map((c) => c.id);

      const { data: msgs } = await supabase
        .from("inbox_messages")
        .select("conversation_id, timestamp")
        .in("conversation_id", convIds)
        .gte("timestamp", todayStart.toISOString());

      const statMap: Record<string, InstanceStat> = {};

      for (const conv of convs) {
        const instanceId = conv.instance_id || "unknown";
        if (!statMap[instanceId]) {
          statMap[instanceId] = { instance_id: instanceId, last_activity: null, msgs_today: 0 };
        }
        const prev = statMap[instanceId].last_activity;
        if (!prev || conv.updated_at > prev) {
          statMap[instanceId].last_activity = conv.updated_at;
        }
      }

      for (const msg of msgs || []) {
        const conv = convs.find((c) => c.id === msg.conversation_id);
        if (!conv) continue;
        const instanceId = conv.instance_id || "unknown";
        if (statMap[instanceId]) statMap[instanceId].msgs_today++;
      }

      return Object.values(statMap);
    },
    enabled: !!effectiveUserId,
    refetchInterval: 60_000,
  });
};
