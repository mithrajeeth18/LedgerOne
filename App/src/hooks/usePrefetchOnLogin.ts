import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { groupsApi } from '../api/groups.api';
import { customersApi } from '../api/customers.api';
import { paymentsApi } from '../api/payments.api';

/**
 * usePrefetchOnLogin
 *
 * Silently warms up the React Query cache after the user logs in.
 * Runs in the background — no loading states, no UI changes.
 *
 * Phase 1 (immediate):    prefetch the groups list
 * Phase 2 (after 1.5s):  prefetch all customers + today's raw payments
 *                          → this makes the Groups tab fully instant
 * Phase 3 (staggered):   prefetch each group's /dashboard endpoint
 *                          → 500ms apart to avoid hammering the free-tier server
 *                          → makes every Group Detail screen instant
 */
export function usePrefetchOnLogin() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const warmUpCache = async () => {
      try {
        // ── Phase 1: Groups list ──────────────────────────────────────────────
        // Prefetch immediately — this single fast call powers the Groups tab header
        console.log('[Prefetch] Phase 1: fetching groups list...');
        await queryClient.prefetchQuery({
          queryKey: ['groups'],
          queryFn: async () => {
            const res = await groupsApi.getAll();
            return res.data;
          },
          staleTime: 10 * 60 * 1000,
        });
        if (cancelled) return;

        // ── Phase 2: All customers + payments (1.5s delay) ───────────────────
        // Wait a beat so the dashboard render doesn't compete with these calls
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;

        console.log('[Prefetch] Phase 2: fetching all customers + today payments...');
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ['customers', 'all'],
            queryFn: async () => {
              const res = await customersApi.getAll({ limit: 1000 });
              return res.data.customers ?? res.data;
            },
            staleTime: 10 * 60 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: ['payments', 'today_raw'],
            queryFn: async () => {
              const res = await paymentsApi.getTodayPayments();
              return res.data.payments ?? res.data;
            },
            staleTime: 30000,
          }),
        ]);
        if (cancelled) return;

        // ── Phase 3: Each group's dashboard (staggered, 500ms apart) ─────────
        // This is the expensive part — one API call per group.
        // Stagger prevents hitting Render's free-tier rate limits.
        const groupsData = queryClient.getQueryData<any[]>(['groups']);
        if (!groupsData || groupsData.length === 0) {
          console.log('[Prefetch] No groups found, skipping Phase 3.');
          return;
        }

        console.log(`[Prefetch] Phase 3: prefetching ${groupsData.length} group dashboards...`);
        for (const group of groupsData) {
          if (cancelled) return;

          const groupId: string = group._id;

          // Only prefetch if NOT already fresh in cache
          const existing = queryClient.getQueryState(['customers', groupId]);
          const isStillFresh =
            existing?.status === 'success' &&
            existing.dataUpdatedAt > Date.now() - 5 * 60 * 1000;

          if (!isStillFresh) {
            await queryClient.prefetchQuery({
              queryKey: ['customers', groupId],
              queryFn: async () => {
                const res = await groupsApi.getDashboard(groupId);
                return res.data;
              },
              staleTime: 5 * 60 * 1000,
            });
            console.log(`[Prefetch] ✓ Warmed group dashboard: ${group.name ?? groupId}`);
          } else {
            console.log(`[Prefetch] ✓ Already fresh, skipping: ${group.name ?? groupId}`);
          }

          // 500ms breathing room between each group call
          await new Promise((r) => setTimeout(r, 500));
        }

        console.log('[Prefetch] ✅ All group dashboards are warm. Navigation will be instant.');
      } catch (err) {
        // Prefetch failures are completely silent — the user just gets normal
        // loading behaviour instead of the instant cache hit. No harm done.
        console.log('[Prefetch] Background prefetch error (non-critical):', err);
      }
    };

    warmUpCache();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
